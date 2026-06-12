# Validation Summary: How to Use Ollama with Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ollama
- Docker
- Docker Compose
- NVIDIA Container Toolkit
- NVIDIA GPU passthrough
- Ollama REST API
- Nginx reverse proxy and load balancing

## Sources Consulted
- Ollama Docker documentation: https://docs.ollama.com/docker
- Ollama FAQ and server configuration documentation: https://docs.ollama.com/faq
- Ollama API documentation: https://github.com/ollama/ollama/blob/main/docs/api.md
- Ollama Dockerfile for image defaults and installed packages: https://github.com/ollama/ollama/blob/main/Dockerfile
- NVIDIA Container Toolkit installation guide: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html
- Docker Compose GPU support documentation: https://docs.docker.com/compose/how-tos/gpu-support/
- Docker Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Engine resource constraints documentation: https://docs.docker.com/engine/containers/resource_constraints/
- Nginx proxy module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html

## Issues Found
- The basic Docker run command did not mount `/root/.ollama`, so downloaded models would not persist across container recreation. Added the official named volume mount.
- The NVIDIA Container Toolkit apt installation used the old `apt-key` and distribution-specific repository pattern. Updated it to the current signed keyring and stable repository instructions.
- GPU Docker run examples omitted persistent model storage. Added the same `/root/.ollama` named volume mount used by the official Docker command.
- Compose healthchecks used `curl` inside the `ollama/ollama` container, but the current official image does not install `curl`. Replaced those checks with `ollama list`, which is available in the image.
- The preloading section described an initialization script while the snippet actually used a sidecar container, and mounted a nonexistent unused script. Updated the text and removed the unused bind mount.
- Ollama API pull and delete examples used the old `name` request field. Updated them to the current `model` field.
- The embeddings example used the superseded `/api/embeddings` endpoint with `prompt`. Updated it to `/api/embed` with `input`, using the official embedding model example.
- The environment variable examples used `OLLAMA_HOST=0.0.0.0` plus `OLLAMA_PORT`. Updated them to `OLLAMA_HOST=0.0.0.0:11434`, matching current Ollama documentation and Docker image defaults.

## Review Notes
- The Compose snippets still include a top-level `version: "3.8"`. Current Docker Compose no longer requires this field, but it remains accepted by Compose implementations, so it was left unchanged to avoid a stylistic rewrite.
- The multi-instance section shares a model volume between Ollama containers. This can reduce duplicate storage, but deployments should avoid concurrent model pulls into the same local volume unless they have tested the storage behavior for their environment.
