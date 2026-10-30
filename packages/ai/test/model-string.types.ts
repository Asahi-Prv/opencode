import { Decision, Image, LLM } from "../src/effect.js"
import { ai } from "../src/index.js"
import { OpenAI } from "../src/providers.js"

const ids = ["openai/gpt-5.4-nano", "anthropic/claude-haiku-4-5"] as const
declare const configured: string

LLM.generate({ model: "openai/gpt-5.4", prompt: "Hi", providerOptions: { openai: { store: false } } })
LLM.stream({ model: configured, prompt: "Hi" })
LLM.loop({ model: ids[0], prompt: "Hi", tools: {} })
void Promise.all(ids.map((model) => ai.llm.generate({ model, prompt: "Hi" })))
void ai.llm.generateObject({ model: "openai/gpt-5.4", prompt: "Hi", jsonSchema: { type: "object" } })
Image.generate({ model: "openai/gpt-image-1", prompt: "A cat", providerOptions: { quality: "high" } })
Image.resume("openai/gpt-image-1", {})
Decision.generate({
  model: "openai/gpt-5.4-nano",
  input: { message: "Buy now" },
  questions: [{ name: "spam", type: "predicate", instructions: "Is this spam?" }],
})

// A model object keeps its typed provider options.
LLM.generate({ model: OpenAI.model("gpt-5.4"), prompt: "Hi", providerOptions: { store: false } })
// @ts-expect-error OpenAI options keep their known value types.
LLM.generate({ model: OpenAI.model("gpt-5.4"), prompt: "Hi", providerOptions: { store: "no" } })
// @ts-expect-error `LLM.request` builds a request synchronously, so it needs a model object.
LLM.request({ model: "openai/gpt-5.4", prompt: "Hi" })
// @ts-expect-error A model is a string or a model object.
LLM.generate({ model: 1, prompt: "Hi" })
