import { expect, test } from "bun:test"
import path from "node:path"
import { tmpdir } from "../../../core/test/fixture/tmpdir"
import { isolatedEnv } from "../fixture/environment"
import { OPENCODE_VERSION } from "../../src/version"

test.each([
  { args: ["before", "--", "after"], stdin: "", text: "before after" },
  {
    args: ["--", "--literal", "multi\nline task"],
    stdin: "piped context",
    text: '--literal "multi\nline task"\npiped context',
  },
])("run admits arguments after -- once: $args", async ({ args, stdin, text }) => {
  await using root = await tmpdir()
  const prompts: unknown[] = []
  const server = Bun.serve({
    port: 0,
    async fetch(request) {
      const url = new URL(request.url)
      if (url.pathname === "/api/info")
        return Response.json({ version: OPENCODE_VERSION, pid: process.pid, urls: [], paths: { tmp: root.path } })
      if (url.pathname === "/api/location")
        return Response.json({ directory: root.path, project: { id: "global", directory: root.path } })
      if (url.pathname === "/api/session")
        return Response.json({ data: { id: "ses_input", location: { directory: root.path } } })
      if (url.pathname === "/api/event")
        return new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue('data: {"id":"evt_connected","type":"server.connected","data":{}}\n\n')
            },
          }),
          { headers: { "content-type": "text/event-stream" } },
        )
      if (url.pathname === "/api/session/ses_input/prompt") {
        prompts.push(await request.json())
        // Stop at admission: this test never starts model execution.
        return new Response("admission captured", { status: 500 })
      }
      return new Response(undefined, { status: 404 })
    },
  })
  const child = Bun.spawn(
    [process.execPath, "run", "src/index.ts", "run", "--format", "json", "--server", server.url.toString(), ...args],
    {
      cwd: path.join(import.meta.dir, "../.."),
      env: isolatedEnv(root.path),
      stdin: new TextEncoder().encode(stdin),
      stdout: "pipe",
      stderr: "pipe",
    },
  )
  try {
    const [stdout, stderr, code] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ])
    expect(stderr).toBe("")
    expect(stdout).toContain("UnexpectedStatus: 500")
    expect(code).toBe(1)
    expect(prompts).toEqual([{ id: expect.any(String), text, files: [], delivery: "steer" }])
  } finally {
    child.kill()
    await child.exited
    server.stop(true)
  }
})
