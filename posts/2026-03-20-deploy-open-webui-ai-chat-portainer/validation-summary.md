# Validation Summary: How to Deploy Open WebUI for AI Chat via Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Open WebUI
- Ollama
- Portainer
- Docker Compose / Docker Stack syntax
- ChromaDB
- Nginx
- HTTPS / reverse proxying
- Retrieval-Augmented Generation (RAG)

## Sources Consulted
- Open WebUI Quick Start: https://docs.openwebui.com/getting-started/quick-start/
- Open WebUI Starting with Ollama: https://docs.openwebui.com/getting-started/quick-start/connect-a-provider/starting-with-ollama/
- Open WebUI Understanding Settings: https://docs.openwebui.com/getting-started/quick-start/settings/
- Open WebUI Knowledge: https://docs.openwebui.com/features/workspace/knowledge/
- Open WebUI Environment Variable Configuration: https://docs.openwebui.com/reference/env-configuration/
- Open WebUI HTTPS & Reverse Proxies: https://docs.openwebui.com/reference/https/
- Open WebUI HTTPS using Nginx: https://docs.openwebui.com/reference/https/nginx/
- Open WebUI Connection Errors: https://docs.openwebui.com/troubleshooting/connection-error/
- Ollama Docker docs: https://docs.ollama.com/docker
- Ollama model library pages: https://ollama.com/library/llama3, https://ollama.com/library/mistral, https://ollama.com/library/codellama
- Docker Compose GPU support: https://docs.docker.com/compose/how-tos/gpu-support/
- Docker Compose version and name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- NGINX WebSocket proxying: https://nginx.org/en/docs/http/websocket.html

## Issues Found
- The post pinned `ollama/ollama:0.1.27`, which is a very old image tag relative to current Ollama Docker guidance. I updated it to `ollama/ollama:latest` to match current official install docs.
- The Open WebUI navigation was outdated. The post said model downloads and model access were under `Settings > Models`, and RAG documents were under a `Documents` section. I corrected this to the current admin and workspace paths: `Admin Settings > Connections > Ollama` and `Workspace > Knowledge`.
- The RAG / ChromaDB section was outdated and incomplete. The original text described ChromaDB as embedded while also pointing to a separate `chromadb` service, used an older `chromadb/chroma:0.4.22` tag, and omitted important merge details. I corrected the wording, updated the Chroma image to `0.5.15`, added `VECTOR_DB=chroma`, added the `chromadb` dependency, and documented the named volume declaration and persistence environment variables.
- The Nginx example was not valid as a full `/etc/nginx/nginx.conf` because it only showed a `server` block while mounting the file as the main Nginx config. I replaced it with a valid `events {}` + `http { server { ... } }` layout.
- The Nginx proxy example also omitted headers and settings Open WebUI now documents as important for streaming and WebSocket behavior. I added the standard forwarded headers plus `proxy_buffering off`, `proxy_cache off`, and extended proxy timeouts.
- The production HTTPS section omitted Open WebUI public URL settings that matter for reverse-proxy deployments. I added `WEBUI_URL` and `CORS_ALLOW_ORIGIN` to the example.
- The summary overclaimed privacy with "Data never leaves your infrastructure" even though Open WebUI can be connected to external providers. I changed that to a conditional statement tied to keeping the backend local to Ollama.

## Review Notes
- `ghcr.io/open-webui/open-webui:main` is still used in Open WebUI's official quick-start examples, so it is technically acceptable here, but it is a floating tag. Pinning a release tag would be safer for production reproducibility.
- The top-level Compose `version` key is obsolete in modern Docker Compose, but it remains accepted for backward compatibility. It was left unchanged because the stack remains valid as written.
