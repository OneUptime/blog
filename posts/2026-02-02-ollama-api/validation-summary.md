# Validation Summary: How to Use Ollama API

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Ollama (local LLM runtime and REST API)
- Ollama REST API endpoints: `/api/generate`, `/api/chat`, `/api/embeddings`, `/api/tags`, `/api/show`, `/api/pull`, `/api/push`, `/api/delete`, `/api/copy`, `/api/create`, `/api/ps`, `/api/version`
- OpenAI-compatible API at `/v1/`
- Python (`requests`, `numpy`, `openai` SDK)
- Node.js / JavaScript (`fetch` API, `ReadableStream`)
- Bash / curl
- Vision models (llava, bakllava) and base64 image inputs
- Embedding models (nomic-embed-text) and cosine similarity for semantic search
- Modelfile syntax for custom model creation
- NDJSON streaming protocol

## Sources Consulted
- Ollama API documentation: https://github.com/ollama/ollama/blob/main/docs/api.md
- Ollama OpenAI compatibility docs: https://github.com/ollama/ollama/blob/main/docs/openai.md
- Ollama Modelfile reference: https://github.com/ollama/ollama/blob/main/docs/modelfile.md
- Python `requests` library docs (streaming): https://requests.readthedocs.io/en/latest/user/advanced/#streaming-requests
- OpenAI Python SDK docs: https://github.com/openai/openai-python
- MDN `fetch` and `ReadableStream` docs

## Issues Found
No technical issues found.

All API endpoints, HTTP methods, request payload shapes, response field names, and code examples align with the official Ollama API documentation. Specifically verified:

- Default port `11434` is correct
- `/api/generate` and `/api/chat` payload schemas, including `model`, `prompt`/`messages`, `stream`, and `options` (with `temperature`, `top_p`, `top_k`, `num_ctx`, `num_predict`, `stop`, `seed`, `repeat_penalty`, `presence_penalty`, `frequency_penalty`) are correct
- Streaming uses newline-delimited JSON objects, and `stream` defaults to `true` — both stated correctly
- Response fields (`response`, `done`, `context`, `total_duration`, `load_duration`, `prompt_eval_count`, `prompt_eval_duration`, `eval_count`, `eval_duration`) are accurate and durations are in nanoseconds as stated
- `/api/embeddings` POST with `model` + `prompt` returning `{ "embedding": [...] }` is the correct (legacy) embeddings shape
- `/api/delete` correctly uses `DELETE` HTTP method
- OpenAI compatibility at `base_url="http://localhost:11434/v1"` with a placeholder `api_key` works as described; supported endpoints (`/v1/chat/completions`, `/v1/completions`, `/v1/embeddings`, `/v1/models`) match official compatibility docs; image generation and audio are correctly noted as unsupported
- Vision model usage with `images: [<base64>]` on both `/api/generate` and `/api/chat` is correct
- `keep_alive: 0` is the correct mechanism to immediately unload a model from memory
- Python and JavaScript streaming code (using `requests.iter_lines()` and `ReadableStream` + `TextDecoder` respectively) is syntactically and semantically correct
- Cosine similarity implementation is mathematically correct
- Modelfile syntax (`FROM`, `SYSTEM`, `PARAMETER`) used in the `/api/create` example is valid

## Review Notes
- The `/api/embeddings` endpoint is the original (and still functional) embeddings endpoint. Ollama has since added a newer `/api/embed` endpoint that accepts an `input` field (string or array) and supports batched embeddings natively. The post's approach still works but the newer endpoint is preferable for batch workloads — a future revision could mention this.
- The `/api/create` endpoint accepts the legacy `modelfile` string parameter (used in the post) as well as a newer structured form with `from`, `system`, `parameters`, `template`, etc. Both are supported; the post uses the legacy form which remains valid.
- The `num_predict` default has historically been documented as `128`; current Ollama docs list `-1` (infinite generation). Either value can be encountered depending on the Ollama version, so the post's `128` is not incorrect for older releases but may differ from the latest server behavior.
- The OpenAI-compatibility table calls `/v1/chat/completions` "Fully supported" and `/v1/completions` simply "Supported" — both are functional; the distinction in the table is a stylistic choice, not a technical inaccuracy.
- Code examples use `llama3.2` and `nomic-embed-text` model names, which are valid Ollama library models.
