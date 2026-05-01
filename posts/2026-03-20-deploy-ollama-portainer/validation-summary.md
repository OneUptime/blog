# Validation Summary: How to Deploy Ollama for Local LLM Inference via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Ollama
- Docker Compose
- NVIDIA Container Toolkit
- Open WebUI
- OpenAI Python SDK
- Python
- cURL / REST APIs

## Sources Consulted
- Ollama FAQ: https://docs.ollama.com/faq
- Ollama OpenAI compatibility docs: https://docs.ollama.com/api/openai-compatibility
- Ollama chat API docs: https://docs.ollama.com/api/chat
- Ollama tags API docs: https://docs.ollama.com/api/tags
- Ollama model library for `llama3.2`: https://ollama.com/library/llama3.2
- Ollama model library for `llama3.1`: https://ollama.com/library/llama3.1
- Ollama model library for `mistral`: https://ollama.com/library/mistral
- Ollama model library for `codellama`: https://ollama.com/library/codellama
- Ollama model library for `phi3`: https://ollama.com/library/phi3
- Ollama model library for `deepseek-r1`: https://ollama.com/library/deepseek-r1
- Ollama model library for `qwen2.5`: https://ollama.com/library/qwen2.5
- Docker Compose GPU support docs: https://docs.docker.com/compose/how-tos/gpu-support/
- Docker Compose deploy specification: https://docs.docker.com/reference/compose-file/deploy/
- NVIDIA Container Toolkit install guide: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html
- Open WebUI environment variable reference: https://docs.openwebui.com/reference/env-configuration/
- Open WebUI repository README: https://github.com/open-webui/open-webui

## Issues Found
- The post used `llama3.2:7b`, which is not a valid Ollama tag for the Llama 3.2 text models. I replaced it with `llama3.1:8b` and updated the matching `ollama show` example.
- The post described `OLLAMA_NUM_PARALLEL` as a CPU thread setting. I corrected the comments to reflect Ollama's documented behavior: it controls the maximum number of parallel requests per model.
- The post set `OLLAMA_HOST=0.0.0.0`. I updated it to `0.0.0.0:11434` to match Ollama's documented bind-address format.
- The Open WebUI auth comment implied `WEBUI_AUTH=false` always disables authentication. I clarified that this works only for fresh installs without existing users, which matches Open WebUI's documentation.
- The "Configure Model Preloading" section was technically inaccurate because `ollama pull` downloads models but does not preload them into memory. I renamed the section and surrounding text to describe model pulling accurately.
- The post referred to the helper `ollama-init` service as an "init container," but the example is a regular one-time Compose service. I corrected the wording.
- The CPU-only example used `OLLAMA_NUM_GPU=0`, which is not documented by Ollama as a supported server environment variable for this use. I removed it and fixed the surrounding comment.

## Review Notes
- Open WebUI documents `DEFAULT_MODELS` and `OLLAMA_BASE_URL` as `PersistentConfig` values. On an existing data volume, later environment-variable changes may not override values already stored in the application database.
- The `ghcr.io/open-webui/open-webui:main` tag is supported upstream, but it is a moving tag. Pinning a stable version would improve long-term reproducibility.
- Ollama GPU support depends on the supported hardware and driver matrix in the official hardware support docs, so readers should verify their NVIDIA setup if GPU acceleration does not appear.
