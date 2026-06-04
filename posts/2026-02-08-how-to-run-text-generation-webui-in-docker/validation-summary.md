# Validation Summary: How to Run Text Generation WebUI in Docker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Docker Compose
- NVIDIA Container Toolkit
- TextGen / Oobabooga Text Generation WebUI
- llama.cpp
- ExLlamaV3 / EXL3
- Hugging Face model downloads
- OpenAI-compatible Chat Completions API
- OpenAI Python SDK

## Sources Consulted
- TextGen README and installation/flag reference: https://github.com/oobabooga/textgen
- TextGen Docker documentation: https://github.com/oobabooga/textgen/blob/main/docs/09%20-%20Docker.md
- TextGen OpenAI-compatible API documentation: https://github.com/oobabooga/textgen/blob/main/docs/12%20-%20OpenAI%20API.md
- TextGen Docker Compose files: https://github.com/oobabooga/textgen/tree/main/docker
- TextGen download-model.py source: https://github.com/oobabooga/textgen/blob/main/download-model.py
- TextGen bundled extension and user_data directories: https://github.com/oobabooga/textgen/tree/main/extensions and https://github.com/oobabooga/textgen/tree/main/user_data
- Docker Compose GPU support documentation: https://docs.docker.com/compose/how-tos/gpu-support/
- Docker Compose deploy specification: https://docs.docker.com/reference/compose-file/deploy/
- Docker CLI GPU flag documentation: https://docs.docker.com/reference/cli/docker/container/run/
- NVIDIA Container Toolkit installation guide: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html
- OpenAI Chat Completions API / Python SDK OpenAPI reference: https://api.openai.com/v1/chat/completions

## Issues Found
- The post used the older repository name and implied that `docker compose up` worked from the repository root. Updated the clone URL to `https://github.com/oobabooga/textgen.git`, changed the startup path to the hardware-specific Docker directory, and added the required `.env` copy and `user_data` setup.
- The post used stale custom Compose examples based on third-party image paths and `/app/*` mounts. Replaced them with upstream-style Compose snippets that build from the current Docker directories and persist data through `/home/app/textgen/user_data`.
- The post exposed port `5005` as a streaming API endpoint. Current TextGen API docs use port `5000` for the OpenAI-compatible API, including streaming with `stream=true`, so the stale port mapping was removed.
- The model loader section referred to GPTQ, AutoGPTQ, and ExLlamav2 loader names that are not in the current TextGen flag reference. Updated it to the current ExLlamaV3/EXL3 loaders and parameter names.
- Several parameter names were outdated (`context_length`, `n_batch`). Updated them to current TextGen names such as `ctx-size` and `batch-size`, while preserving the `n-gpu-layers` alias alongside `gpu-layers`.
- The model download and character examples used old host paths. Updated them to `user_data/models` and `user_data/characters`.
- The extension section referenced `/app/extensions`, `EXTRA_LAUNCH_ARGS`, and a `multimodal` extension name that no longer match the current upstream Docker workflow. Updated the path, switched persistent launch flags to `user_data/CMD_FLAGS.txt`, and replaced the extension example with a current bundled extension.
- The update instructions used `docker compose pull`, which does not apply to the upstream build-from-source Docker workflow. Updated the process to `git pull` followed by `docker compose up --build -d`.

## Review Notes
The Compose YAML snippets were parsed successfully. I did not run a full Docker image build or model download because that would require substantial time, disk space, and GPU/container runtime availability.
