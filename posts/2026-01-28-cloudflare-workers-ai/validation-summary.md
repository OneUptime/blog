# Validation Summary: How to Use Cloudflare Workers AI

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Cloudflare Workers
- Cloudflare Workers AI
- Cloudflare Vectorize (vector database)
- Cloudflare KV
- TypeScript
- Wrangler (configuration via wrangler.toml)
- AI models: `@cf/meta/llama-3.1-8b-instruct`, `@cf/baai/bge-base-en-v1.5`, `@cf/microsoft/resnet-50`, `@cf/unum/uform-gen2-qwen-500m`, `@cf/stabilityai/stable-diffusion-xl-base-1.0`, `@cf/openai/whisper`, `@cf/myshell-ai/melotts`, `@cf/meta/m2m100-1.2b`

## Sources Consulted
- Cloudflare Workers AI documentation: https://developers.cloudflare.com/workers-ai/
- Workers AI models catalog: https://developers.cloudflare.com/workers-ai/models/
- Specific model schemas: melotts, whisper, llama-3.1-8b-instruct, bge-base-en-v1.5, resnet-50, uform-gen2-qwen-500m, stable-diffusion-xl-base-1.0, m2m100-1.2b
- Cloudflare Wrangler configuration reference: https://developers.cloudflare.com/workers/wrangler/configuration/
- Cloudflare Vectorize documentation: https://developers.cloudflare.com/vectorize/
- Cloudflare Workers KV documentation: https://developers.cloudflare.com/kv/
- `@cloudflare/workers-types` TypeScript definitions (Ai, KVNamespace, Vectorize)

## Issues Found

### 1. Incorrect input parameter and output handling for `@cf/myshell-ai/melotts` (Text-to-Speech)
**What was wrong:** The post used `text: body.text` as the input field and returned the raw `result` object as an `audio/wav` response.

**What I changed:**
- Renamed the input field from `text` to `prompt` to match the model's actual JSON input schema.
- Updated the response handler to base64-decode the `result.audio` field (the model returns base64-encoded MP3) and serve the decoded bytes with `Content-Type: audio/mpeg`.

**Why:** Per the Cloudflare Workers AI model schema for `@cf/myshell-ai/melotts`, the required input field is `prompt` (not `text`), and the output is `{ audio: "<base64-encoded-mp3>" }`. Returning the raw `result` object as binary audio data would not work — it would serialize the object instead of producing playable audio. MP3 is the actual output format, so `audio/mpeg` is the correct MIME type.

## Review Notes

- The `compatibility_date = "2024-01-01"` in the `wrangler.toml` example is somewhat dated for a post written in 2026, but it is technically valid (compat dates must be on or before the current date) and not incorrect. Readers deploying new Workers might want to use a more recent date to access newer runtime features.
- The `returnMetadata: true` boolean form is still supported by Vectorize for backward compatibility; the newer Vectorize V2 API also accepts the strings `"none"`, `"indexed"`, or `"all"`. The boolean form is not wrong but the string form is the more current convention.
- All other model identifiers (`@cf/meta/llama-3.1-8b-instruct`, `@cf/baai/bge-base-en-v1.5`, `@cf/microsoft/resnet-50`, `@cf/unum/uform-gen2-qwen-500m`, `@cf/stabilityai/stable-diffusion-xl-base-1.0`, `@cf/openai/whisper`, `@cf/meta/m2m100-1.2b`) and their input/output schemas were verified against Cloudflare's official model catalog and are correct.
- The streaming Llama example correctly returns a `ReadableStream` of SSE-formatted events (`data: {"response":"..."}` lines terminated by `data: [DONE]`); the client-side parser matches this format.
- The Vectorize upsert/query patterns, KV usage for conversation state and rate limiting, and the RAG pipeline all reflect idiomatic, working Cloudflare patterns.
