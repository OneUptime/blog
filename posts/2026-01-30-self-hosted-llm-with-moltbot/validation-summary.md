# Validation Summary: Running Out of Claude Credits? How to Use Self-Hosted LLMs with Moltbot

## Status
validated

## Post Type
Tutorial / Guide — practical walkthrough for self-hosting open-source LLMs with Ollama and connecting them to Moltbot.

## Technologies Covered
- Ollama (local LLM runtime, OpenAI-compatible API on port 11434)
- Open-source LLMs: Llama 3.1 / 3.3, Qwen 2.5 / Qwen3, DeepSeek-V3 / V3.2, DeepSeek-Coder-V2, Mistral Small 3
- Moltbot (OneUptime's AI assistant integration)
- Docker / Docker Compose
- systemd service configuration
- GGUF quantization (Q4_0, Q4_K_M, Q8_0)
- Ollama Modelfile syntax (`FROM`, `PARAMETER num_ctx`)
- NVIDIA GPU tooling (`nvidia-smi`)
- Linux networking utilities (`ss`, `ufw`, `journalctl`, `curl`, `watch`)

## Sources Consulted
- Ollama official model library — https://ollama.com/library/llama3.1 and https://ollama.com/library/llama3.1/tags
- Ollama documentation FAQ — https://docs.ollama.com/faq (OLLAMA_HOST systemd configuration, num_ctx parameter handling)
- DeepSeek-V3 model card on Hugging Face — https://huggingface.co/deepseek-ai/DeepSeek-V3 (parameter counts: 671B main / 685B with MTP module / 37B activated)
- Knowledge of Llama 3.1 128K context window, Qwen 2.5 series specifications, and DeepSeek-Coder-V2 (236B / 21B activated) architecture
- Docker Compose specification

## Issues Found
1. **Incorrect Ollama model tag in troubleshooting section.** The post referenced `llama3.1:8b-q4_0`, which does not exist in the Ollama registry. Verified against https://ollama.com/library/llama3.1/tags — only `8b-instruct-q4_0` and `8b-text-q4_0` variants exist for the 8B quantized models. Changed the command to `ollama pull llama3.1:8b-instruct-q4_0` to match the convention already used earlier in the Performance Optimization section.

## Review Notes
- The "685B (37B active)" figure for DeepSeek-V3.2 is technically defensible: while the main model is 671B parameters, the total weights distributed on Hugging Face are 685B once the Multi-Token Prediction (MTP) module weights are included. Most popular references cite 671B, so this could be clarified in the future, but it is not incorrect.
- `version: '3.8'` at the top of the Docker Compose file is now considered obsolete in modern Docker Compose (the Compose Specification no longer requires a version field). It is still tolerated by current versions of Docker Compose and produces only a warning, so the file still works as written.
- The Docker Compose snippet uses `host.docker.internal` to reach the host's Ollama instance. This works out-of-the-box on Docker Desktop (macOS/Windows) but on Linux requires `extra_hosts: ["host.docker.internal:host-gateway"]` on Docker 20.10+. Readers running native Linux Docker may need to adjust.
- Moltbot configuration syntax (config.yml schema, `OLLAMA_API_KEY`/`OLLAMA_API_URL`/`OLLAMA_BASE_URL` env vars) is product-specific to Moltbot and cannot be independently verified against public docs beyond the linked product documentation; trusted as authored.
- Llama 3.1 context window of 128000 and DeepSeek-Coder-V2 parameter counts (236B/21B active) verified correct.
- The post recommends `q8_0` and `q4_0` quantizations via `ollama pull llama3.1:8b-instruct-q8_0` / `…-q4_0` — both tags exist and are valid.
- All shell commands (`ollama serve`, `ollama pull`, `ollama run`, `ollama ps`, `ollama create -f Modelfile`, `nvidia-smi`, `journalctl -u ollama -f`, `ss -tlnp`, `ufw allow 11434`) verified correct.
