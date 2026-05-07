# Validation Summary: How to Create Custom AI Applications with Podman AI Lab

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman Desktop
- Podman AI Lab
- RamaLama llama-server model serving
- OpenAI-compatible chat completions API
- Python
- FastAPI
- Pydantic
- HTTPX
- Uvicorn
- Podman Compose / Compose specification

## Sources Consulted
- Podman AI Lab overview and requirements: https://github.com/containers/podman-desktop-extension-ai-lab
- Podman Desktop downloading a model: https://podman-desktop.io/docs/ai-lab/download-model
- Podman Desktop starting an inference server: https://podman-desktop.io/docs/ai-lab/start-inference-server
- Podman AI Lab current inference server source and image metadata: https://github.com/containers/podman-desktop-extension-ai-lab
- RamaLama serve documentation: https://ramalama.ai/docs/commands/ramalama/serve/
- llama.cpp server OpenAI-compatible API and request routing documentation: https://raw.githubusercontent.com/ggml-org/llama.cpp/master/tools/server/README.md
- Podman run documentation, including `host.containers.internal`: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- FastAPI first steps and request body documentation: https://fastapi.tiangolo.com/tutorial/first-steps/ and https://fastapi.tiangolo.com/tutorial/body/
- HTTPX API documentation for `AsyncClient` and JSON POST requests: https://www.python-httpx.org/api/
- Compose specification for services, `depends_on`, ports, volumes, and environment: https://compose-spec.github.io/compose-spec/spec.html

## Issues Found
- The model directory check used `/var/lib/containers/ai-lab/models/`, which does not match the current Podman AI Lab default model upload path used inside the Podman machine. Updated it to `/home/user/ai-lab/models/`.
- The standalone and Compose model server examples used `ghcr.io/containers/ai-lab-model-service:latest` with `--model`, `--ctx-size`, and `--threads` arguments. Current Podman AI Lab source uses RamaLama llama-server images configured with `MODEL_PATH`, `HOST`, and `PORT` environment variables, so the examples were updated accordingly.
- The port mapping assumed the model server listened on container port `8080`. Current AI Lab inference server configuration uses container port `8000`, so the examples now publish host port `8080` to container port `8000` and use `http://model-server:8000` inside Compose.
- The OpenAI-compatible chat completion request omitted a `model` field. Added `MODEL_NAME` configuration, configured the local server alias with `LLAMA_ARG_ALIAS=local-model`, and included `"model": MODEL_NAME` in the request body to match the documented OpenAI-compatible request shape.
- The project structure snippet created and listed template/static directories even though the FastAPI app returns inline HTML and never creates `templates/index.html`. Updated the structure commands and tree so they match the actual files created.

## Review Notes
Podman was not installed in the local review environment, so container execution was verified against official Podman documentation and current Podman AI Lab/RamaLama source documentation rather than by running the containers locally. The FastAPI code blocks were extracted from the post and parsed with Python `ast` to confirm syntax validity.
