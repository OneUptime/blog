# Validation Summary: How to Deploy Open WebUI for AI Chat via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- Docker Compose / Compose Specification
- Open WebUI
- Ollama
- OpenAI-compatible APIs
- OpenTelemetry

## Sources Consulted
- Open WebUI Quick Start: https://docs.openwebui.com/getting-started/quick-start/
- Open WebUI Environment Variable Configuration: https://docs.openwebui.com/reference/env-configuration/
- Open WebUI Monitoring Reference: https://docs.openwebui.com/reference/monitoring/
- Open WebUI Scaling Guide: https://docs.openwebui.com/getting-started/advanced-topics/scaling/
- Open WebUI GitHub repository `docker-compose.yaml`: https://github.com/open-webui/open-webui/blob/main/docker-compose.yaml
- Open WebUI GitHub repository `docker-compose.otel.yaml`: https://github.com/open-webui/open-webui/blob/main/docker-compose.otel.yaml
- Open WebUI GitHub repository `Dockerfile`: https://github.com/open-webui/open-webui/blob/main/Dockerfile
- Open WebUI releases: https://github.com/open-webui/open-webui/releases
- Portainer Add a New Stack: https://docs.portainer.io/user/docker/stacks/add
- Portainer Configs: https://docs.portainer.io/user/docker/configs
- Docker Compose GPU support: https://docs.docker.com/compose/how-tos/gpu-support/
- Docker Compose version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The original stack definition was a placeholder and would not deploy Open WebUI. It used `relevant-image:latest`, generic `ml-app` naming, the wrong data path, and a non-Open-WebUI configuration model. I replaced it with a working Open WebUI stack using the official container image, correct persistence path (`/app/backend/data`), documented host mapping, and the healthcheck pattern used in the official Dockerfile.
- The post told readers to use Portainer's Configs section for application configuration. Portainer documents that Configs are only available in Docker Swarm environments, so this was incorrect for the normal Docker standalone stack flow. I changed the guidance to use stack environment variables in Portainer instead.
- The configuration snippet under Step 3 was not how Open WebUI is configured. Open WebUI uses environment variables for provider connections and bootstrap settings, not a `server/storage/database` YAML block. I replaced that snippet with documented variables for `OLLAMA_BASE_URL`, `OPENAI_API_BASE_URL`, `OPENAI_API_KEY`, optional admin bootstrap variables, and the `ENABLE_PERSISTENT_CONFIG` caveat.
- The verification steps used the wrong container name and host port. I updated them to use `open-webui`, the documented `/health` endpoint, host port `3000`, and added the official `/api/models` connectivity check as an optional verification step after generating an API key.
- The persistence section referenced a generic `app-data` volume and `/data/ml-app` path. I corrected this to Open WebUI's actual data directory and changed the host bind-mount example to `/data/open-webui:/app/backend/data`.
- The monitoring section incorrectly instructed readers to scrape `/metrics` with Prometheus. Open WebUI's current documentation describes health checks, model connectivity checks, and OpenTelemetry export to an OTLP-compatible backend rather than direct Prometheus scraping from a `/metrics` endpoint. I replaced that section with the documented OTEL environment variables and health/model validation commands.
- The backup example targeted the wrong volume/path for Open WebUI. I updated it to back up `/data/open-webui`, which matches the corrected bind-mount example in Step 5.
- The conclusion overstated the deployment pattern as directly suitable for production clusters. Open WebUI's scaling guidance documents that the default deployment is a single-container setup with embedded SQLite/Chroma defaults. I adjusted the conclusion to describe it as appropriate for development and smaller production deployments, with external databases, shared storage, and centralized observability needed for larger rollouts.

## Review Notes
- The stack now pins `ghcr.io/open-webui/open-webui:v0.9.2`, which was the latest release visible in the official releases page on 2026-05-01. This should be reviewed periodically as newer releases ship.
- `ENABLE_PERSISTENT_CONFIG=False` is intentionally left commented out because it changes how Open WebUI handles admin UI edits. When enabled, environment variables stay authoritative, but UI changes do not persist across restarts.
- The `host.docker.internal:host-gateway` mapping is relevant when Open WebUI needs to reach services running on the Docker host, such as a host-installed Ollama instance.
- Runtime validation with `docker compose` was not performed in this review workspace because the `docker` CLI was not available. The replacement Compose YAML was reviewed against the official documentation and parsed successfully as YAML.
