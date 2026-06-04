# Validation Summary: How to Run Jan AI in Docker for Local LLM Chat

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- Jan AI
- Jan Server
- Docker
- Docker Compose
- NVIDIA GPU containers
- OpenAI-compatible APIs
- OpenAI Python client
- FastAPI
- llama-cpp-python
- Open WebUI
- Hugging Face GGUF model downloads

## Sources Consulted
- Jan Local API Server documentation: https://www.jan.ai/docs/desktop/api-server
- Jan Server repository README: https://github.com/janhq/server
- Jan Server quickstart documentation: https://raw.githubusercontent.com/janhq/server/main/docs/quickstart.md
- Jan Server Docker Compose infrastructure file: https://raw.githubusercontent.com/janhq/server/main/infra/docker/infrastructure.yml
- Docker CLI help output for `docker run`
- Docker Compose CLI help output for `docker compose`
- Docker Compose Specification documentation for obsolete top-level `version`: https://docs.docker.com/reference/compose-file/version-and-name/
- Open WebUI documentation: https://docs.openwebui.com/
- Open WebUI environment variable documentation: https://docs.openwebui.com/reference/env-configuration
- Hugging Face model file URLs referenced in the post

## Issues Found
- The post used a single-container `ghcr.io/janhq/jan-server:latest` image on port 1337. That image was not publicly pullable in validation, and official Jan Server documentation uses the repository's Docker Compose workflow with `make quickstart`, `make up-full`, and gateway port 8000. Replaced the single-container Jan Server examples with official repository commands.
- The post conflated Jan desktop's local API on port 1337 with Jan Server's Docker Compose stack. Clarified the distinction and updated API examples to use Jan Server's gateway at `http://localhost:8000/v1`.
- Jan Server API calls require authentication through the gateway. Added the documented guest-token flow and bearer authorization header to cURL and Python examples.
- The custom FastAPI/llama.cpp server was described as a custom Jan AI server. Relabeled it as a custom OpenAI-compatible GGUF server so readers do not mistake it for Jan Server.
- The Open WebUI Compose example depended on the nonexistent Jan single-container backend and used multi-endpoint environment variables unnecessarily. Updated it to connect to the custom GGUF backend with current Open WebUI `OPENAI_API_BASE_URL` and `OPENAI_API_KEY` variables.
- Removed obsolete Compose `version: "3.8"` from the Compose example.
- The GPU example used `GPU_LAYERS` with the Jan Server image. Updated Jan Server guidance to use `make up-gpu` and kept `GPU_LAYERS` only for the custom llama.cpp container.
- Monitoring, restart, backup, and update commands referenced the old `jan` service and incorrect persistent volumes. Replaced them with Jan Server make targets and a PostgreSQL `pg_dump`/`psql` database backup flow against the documented `api-db` service.

## Review Notes
Python and YAML code blocks were parsed successfully after edits. The post now separates official Jan Server usage from the optional custom GGUF server, but future improvements could add a dedicated Jan desktop local API section if the article wants to focus on the desktop app's port 1337 workflow.
