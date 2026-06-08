# Validation Summary: How to Install and Configure Ollama

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- Ollama (CLI, server, REST API)
- Homebrew (macOS install)
- winget (Windows install)
- Docker / Docker GPU runtime
- systemd (Linux service)
- Ollama Modelfile (FROM, SYSTEM, PARAMETER directives)
- Ollama Python library (`ollama` package)
- OpenAI Python SDK (OpenAI-compatible endpoint at `/v1`)
- `ollama-js` Node.js library
- CUDA / `CUDA_VISIBLE_DEVICES` for GPU selection
- Models referenced: llama3.2, mistral, codellama, phi3, gemma2

## Sources Consulted
- Ollama envconfig source: https://github.com/ollama/ollama/blob/main/envconfig/config.go (authoritative list of supported env vars)
- Ollama FAQ: https://docs.ollama.com/faq
- Ollama Linux install docs: https://docs.ollama.com/linux
- Ollama Modelfile reference: https://docs.ollama.com/modelfile
- Ollama CLI command source (`cmd/cmd.go`): https://github.com/ollama/ollama/blob/main/cmd/cmd.go (flag definitions for `run`, `pull`, etc.)
- Ollama install script: https://github.com/ollama/ollama/blob/main/scripts/install.sh

## Issues Found

1. **Outdated Linux manual download URL.** The post instructed downloading a single binary from `https://ollama.com/download/ollama-linux-amd64`, but Ollama no longer ships a standalone binary — it ships a tarball with shared libraries. Replaced with the current tarball-based install (`ollama-linux-amd64.tgz` extracted to `/usr`), matching the official Linux docs.

2. **Nonexistent environment variable `OLLAMA_GPU_MEMORY`.** Verified against `envconfig/config.go` — this variable is not defined. Replaced with the real `OLLAMA_GPU_OVERHEAD` (which reserves VRAM per GPU in bytes) and updated the comment to match its actual behavior.

3. **Nonexistent environment variable `OLLAMA_NO_GPU`.** Also not defined in Ollama's envconfig. The supported way to force CPU-only inference is to hide GPUs from the runtime, so replaced with `export CUDA_VISIBLE_DEVICES=""`.

4. **Invalid `--verbose` flag on `ollama pull`.** `pullCmd` in `cmd/cmd.go` only defines `--insecure`. `ollama pull` already reports progress by default, so removed the bogus flag.

5. **Unsupported Modelfile `PARAMETER num_keep`.** The current Modelfile reference does not list `num_keep` among supported parameters. Replaced with `num_predict` (a supported parameter that controls maximum tokens to generate) and updated the comment accordingly.

## Review Notes
- `ollama run <model> --verbose` IS supported (it prints response timings) — verified in `cmd/cmd.go` — so that example was left as-is.
- `OLLAMA_DEBUG`, `OLLAMA_HOST`, `OLLAMA_MODELS`, `OLLAMA_MAX_LOADED_MODELS`, and `OLLAMA_KEEP_ALIVE` are all real and used correctly.
- The OpenAI compatibility example (`base_url='http://localhost:11434/v1'`, `api_key='ollama'`) is correct — Ollama documents that an API key is required by the SDK but unused by the server.
- The Modelfile directives `FROM`, `SYSTEM`, and `PARAMETER` (with `temperature`, `top_p`, `num_ctx`, `stop`) are all valid per the Modelfile reference.
- The Python `ollama.generate` / `ollama.chat` API shape (including `response['response']` and `response['message']['content']`) matches the current `ollama-python` library.
- The Docker `--gpus all` GPU example assumes the NVIDIA Container Toolkit is installed; readers using it will need that prerequisite, but it's a reasonable omission for a getting-started post.
- `ollama serve` runs in the foreground; the comment "in the background" is slightly misleading wording but the command is correct, so left untouched per the "fix only technical errors" guideline.
