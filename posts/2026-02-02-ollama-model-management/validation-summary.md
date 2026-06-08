# Validation Summary: Ollama Models: How to Pull, List, Update, and Manage Local LLMs

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Ollama (CLI and REST API)
- Modelfiles (FROM, SYSTEM, PARAMETER directives)
- Python (`requests` library) for programmatic API access
- Bash scripting for automation (pull/cleanup/setup scripts)
- Mermaid diagrams for architecture and workflow illustration
- Llama 3.2, CodeLlama, Mistral, Phi-3, nomic-embed-text model families
- Shell utilities used in examples: `du`, `df`, `awk`, `ls`, `tree`, `free`, `vm_stat`, `nvidia-smi`

## Sources Consulted
- Ollama API documentation: https://github.com/ollama/ollama/blob/main/docs/api.md
- Ollama GPU documentation: https://github.com/ollama/ollama/blob/main/docs/gpu.mdx
- Ollama Modelfile documentation: https://github.com/ollama/ollama/blob/main/docs/modelfile.mdx
- Ollama CLI documentation: https://github.com/ollama/ollama/blob/main/docs/cli.mdx
- Python `requests` library docs (DELETE method with JSON body support)

## Issues Found

1. **Incorrect environment variable for forcing CPU-only mode.** The original post used `OLLAMA_NO_GPU=1 ollama run llama3.2`, but `OLLAMA_NO_GPU` is not a documented Ollama environment variable and has no effect. Ollama's documented method for hiding GPUs is `CUDA_VISIBLE_DEVICES="-1"` (NVIDIA) or `ROCR_VISIBLE_DEVICES="-1"` (AMD). Updated the troubleshooting example to use `CUDA_VISIBLE_DEVICES="-1"` and added a brief note about the AMD equivalent.

2. **Outdated API request field names in the Python `OllamaModelManager` class.** The code passed `{"name": name, ...}` for `/api/show`, `/api/pull`, `/api/delete`, and `/api/create`. The current Ollama API documentation uses `model` as the canonical field name for all these endpoints; `name` is the legacy/deprecated form. Updated all four call sites to use `"model"` instead of `"name"`. Other API calls (`/api/copy` using `source`/`destination`, `/api/generate` using `model`, `/api/tags` GET, `/api/ps` GET) were already correct.

## Review Notes

- **Quantization terminology — `fp16` listed under "Quantization":** The post lists `fp16` alongside `q4_K_M`, `q8_0`, etc. as a "Quantization" tag component. Strictly speaking, fp16 is a 16-bit floating-point precision, not a quantization. However, Ollama's registry uses fp16 as a tag suffix in the same slot as quantization variants, so listing it here matches how users encounter it in practice. Left as-is.
- **Linux default storage location:** The post states `~/.ollama/models/` for Linux. This is correct for user-mode installations but Ollama installed as a systemd service uses `/usr/share/ollama/.ollama/models/` (the home directory of the `ollama` system user). Not changed because the documented user-install location is what most readers will encounter, and the `OLLAMA_MODELS` override is already covered.
- **Legacy `modelfile` field in `/api/create`:** The Python `create_model` method continues to pass a `modelfile` string to `/api/create`. The current API prefers structured fields (`from`, `system`, `parameters`, `template`, etc.), but the `modelfile` field remains backward-compatible. Left as-is to avoid restructuring the example, but a future revision could demonstrate the structured form.
- **`OLLAMA_DEBUG=1 ollama pull`:** `OLLAMA_DEBUG` is a server-side variable. Setting it on the client command line only affects behavior if the same process starts/uses a server; users running a separate `ollama serve` would need to restart the server with the variable set. Minor caveat, left as-is.
- All `ollama` CLI commands and flags (`pull`, `list`, `ps`, `show` with `--license`/`--modelfile`/`--system`/`--template`, `rm`, `cp`, `create -f`, `run`, `serve`) match the current CLI surface.
- The `/api/generate` unload pattern with `keep_alive: 0` and an empty prompt is correct and is the documented way to unload a model from memory.
