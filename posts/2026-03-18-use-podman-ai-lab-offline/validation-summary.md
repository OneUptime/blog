# Validation Summary: How to Use Podman AI Lab Offline

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Podman Desktop
- Podman AI Lab
- OCI container images
- GGUF model files
- Hugging Face model downloads
- llama.cpp-compatible local model serving

## Sources Consulted
- Podman AI Lab overview: https://podman-desktop.io/docs/ai-lab
- Podman AI Lab "Downloading a model": https://podman-desktop.io/docs/ai-lab/download-model
- Podman AI Lab "Starting an inference server": https://podman-desktop.io/docs/ai-lab/start-inference-server
- Podman Desktop extension install docs: https://podman-desktop.io/docs/extensions/install
- Podman Desktop tutorial "Running an AI application": https://podman-desktop.io/tutorial/running-an-ai-application
- Podman AI Lab source README: https://github.com/containers/podman-desktop-extension-ai-lab
- Current AI Lab inference image map: https://github.com/containers/podman-desktop-extension-ai-lab/blob/main/packages/backend/src/assets/inference-images.json
- Current AI Lab Llama provider implementation: https://github.com/containers/podman-desktop-extension-ai-lab/blob/main/packages/backend/src/workers/provider/LlamaCppPython.ts
- AI Lab local model import UI and supported formats: https://github.com/containers/podman-desktop-extension-ai-lab/blob/main/packages/frontend/src/pages/ImportModel.svelte
- Podman `run` reference (`--network none` semantics): https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- llama.cpp Docker docs: https://github.com/ggml-org/llama.cpp/blob/master/docs/docker.md
- llama.cpp server docs (`/health` and OpenAI-compatible API): https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md
- llama.cpp README (local server endpoint examples): https://github.com/ggml-org/llama.cpp/blob/master/README.md
- Mistral GGUF URL verified: https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/resolve/main/mistral-7b-instruct-v0.2.Q4_K_M.gguf
- CodeLlama GGUF URL verified: https://huggingface.co/TheBloke/CodeLlama-7B-Instruct-GGUF/resolve/main/codellama-7b-instruct.Q4_K_M.gguf

## Issues Found
- The post said an offline target only needed Podman installed, but Podman AI Lab is a Podman Desktop extension. I updated the prerequisites to require Podman Desktop and the AI Lab extension on the offline machine, and made the workflow explicitly assume the extension is installed before disconnection.
- The image references `ghcr.io/containers/ai-lab-model-service:latest` and `ghcr.io/containers/ai-lab-recipe-chatbot:latest` did not match the current AI Lab implementation. I replaced the hard-coded model-service image with the current GGUF serving image from AI Lab's source (`quay.io/ramalama/ramalama-llama-server@sha256:293f66f2dfea8e21393dc03e898616b2a71f0a72a0f3bc5f936439130ada2648`) and generalized the recipe-image guidance to current `quay.io/ai-lab` recipe images.
- The checksum step generated `checksums.txt` from absolute paths, which can break verification after transferring to a different machine or username. I changed it to create checksums from inside the models directory so `sha256sum -c checksums.txt` works reliably on the offline machine.
- The original runtime example combined `--network none` with published ports and then expected host-side `curl` access. That contradicted Podman's `--network none` semantics and the post's own verification steps. I replaced it with a local-only port binding on `127.0.0.1` and updated the narrative to rely on the offline machine's air-gap rather than an incompatible container network mode.
- The post claimed the server was "only accessible from localhost" while publishing `-p 8080:8080`, which binds on all host interfaces by default. I corrected the port mapping to `127.0.0.1:8080:8000` so the claim matches the command.
- The runtime and startup-script examples were built around older model-service commands and stale image names. I updated them to the current AI Lab model-service pattern from the extension source: `MODEL_PATH`, `HOST`, and `PORT` environment variables with the current runtime image, plus the `/health` readiness check.
- The "Verifying Air-Gap Isolation" section relied on `curl` and `nslookup` inside the container, which are not guaranteed tools in the image and no longer matched the corrected local-only binding model. I rewrote the section to verify loopback-only publication with `podman port`, confirm `/health`, and validate local API access.

## Review Notes
- Podman AI Lab also supports importing local `.gguf` models; the post now makes that relationship explicit before showing the direct `podman run` example.
- Runtime execution was not possible in this environment because `podman` is not installed, so command validation was based on current official docs and the current AI Lab/llama.cpp source trees.
- The post still focuses on offline use after AI Lab is already installed. A separate, documented offline installation procedure for the extension itself was not added because the current official docs cover catalog/custom-image installation flows rather than a tar-based offline install workflow.
