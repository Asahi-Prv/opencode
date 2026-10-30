export * as ToolPartial from "./partial.js"

import type { Content } from "@opencode/schema/tool"
import { Context, Effect } from "effect"

type Recorder = (content: ReadonlyArray<Content>) => Effect.Effect<void>

// The session runner sets this around each local tool call it starts.
const Current = Context.Reference<Recorder | undefined>("@opencode/ToolPartial", { defaultValue: () => undefined })

/**
 * Records what an interrupted call had produced, replacing an earlier record. The session runner sends this content
 * with the failure instead of an empty result.
 */
export const record = (content: ReadonlyArray<Content>) => Current.use((recorder) => recorder?.(content) ?? Effect.void)

/** Sends the records of the calls run by `effect` to `recorder`. */
export const provide =
  (recorder: Recorder) =>
  <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    Effect.provideService(effect, Current, recorder)
