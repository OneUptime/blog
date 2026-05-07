# Validation Summary: How to Use Podman for Microservices Development

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- podman-compose
- Container networking
- Docker Compose specification
- Python
- FastAPI
- PostgreSQL
- Redis
- Node.js
- Express
- http-proxy-middleware

## Sources Consulted
- Podman network create docs: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman compose docs: https://docs.podman.io/en/v5.6.2/markdown/podman-compose.1.html
- podman-compose upstream README: https://raw.githubusercontent.com/containers/podman-compose/main/README.md
- podman-compose upstream command implementation: https://raw.githubusercontent.com/containers/podman-compose/main/podman_compose.py
- FastAPI lifespan/events docs: https://fastapi.tiangolo.com/advanced/events/
- Docker Compose networks reference: https://docs.docker.com/reference/compose-file/networks/
- Docker Compose version/name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose startup order docs: https://docs.docker.com/compose/how-tos/startup-order/
- PostgreSQL official image docs: https://github.com/docker-library/docs/blob/master/postgres/README.md
- http-proxy-middleware docs: https://github.com/chimurai/http-proxy-middleware
- Node.js CLI docs for `--watch`: https://nodejs.org/download/release/v20.19.0/docs/api/cli.html
- Node.js globals docs for `fetch`: https://nodejs.org/download/release/v20.18.1/docs/api/globals.html

## Issues Found
- The manual PostgreSQL setup created databases immediately after `podman run`, which can fail before PostgreSQL is ready. I added a `pg_isready` wait loop first.
- The FastAPI example used the deprecated `@app.on_event("startup")` pattern. I replaced it with a lifespan handler from the current FastAPI docs.
- The service health endpoints returned HTTP 200 even when dependencies were unavailable, which made the API gateway health aggregation incorrect. I changed unhealthy responses to return HTTP 503.
- The product and order services relied on compose startup order alone, even though Compose only guarantees containers are started, not that dependencies are ready. I added retry-based startup logic for PostgreSQL and explicit startup failure handling.
- The product service container used `npx nodemon` without showing that dependency anywhere. I switched the Node containers to `node --watch`, which is supported in current Node 20 releases and matches the development hot-reload claim.
- The compose example referenced `order-service/Containerfile`, `api-gateway/Containerfile`, and `init-db.sh` without defining them. I added the missing Containerfile snippets and the database init script.
- The API gateway proxy example used a routing setup that would not reliably preserve the intended backend paths and used legacy-style error handling. I rewrote it to use a `pathRewrite` function and current `on.error` middleware hooks.
- The debugging section used `podman exec` with compose service names and assumed `curl` existed inside the Node containers. I updated it to use `podman-compose exec` and Node-based fetch checks instead.
- The compose networking example created a compose-managed network name that did not match the earlier `microservices-net` commands. I changed the compose network to use the existing external `microservices-net` network.

## Review Notes
- The post now validates as a technical guide after corrections.
- `podman-compose` remains an external compose provider; Podman also documents the `podman compose` wrapper, but the article intentionally stays on the standalone `podman-compose` workflow.
- PostgreSQL init scripts under `/docker-entrypoint-initdb.d` only run when the data directory is empty, so the added `down -v` reset command is important when re-testing the example from scratch.
- Podman was not installed in the local review workspace, so CLI behavior was checked against official Podman docs and upstream provider sources rather than local `--help` output.
