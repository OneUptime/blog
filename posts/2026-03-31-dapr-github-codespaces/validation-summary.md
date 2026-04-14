# Validation Summary: How to Use Dapr GitHub Codespaces for Development

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (CLI, runtime, state management API)
- GitHub Codespaces
- DevContainers (devcontainer.json, docker-compose, Dockerfile)
- Redis (state store backend)
- Zipkin (distributed tracing)
- Docker Compose
- Node.js, Go, .NET (dev environment features)

## Sources Consulted
- Dapr CLI `dapr run` command reference: https://docs.dapr.io/reference/cli/dapr-run/
- Dapr CLI `dapr init` command reference: https://docs.dapr.io/reference/cli/dapr-init/
- Dapr self-hosted mode without Docker: https://docs.dapr.io/operations/hosting/self-hosted/self-hosted-no-docker/
- Dapr CLI GitHub issue #953 (rename --components-path to --resources-path): https://github.com/dapr/cli/issues/953
- Docker Compose V2 specification (version field obsolescence): https://docs.docker.com/compose/compose-file/
- DevContainers specification: https://containers.dev/implementors/json_reference/

## Issues Found

1. **Dockerfile: `dapr init --slim` ran as root, not vscode user.** The Dockerfile ran `dapr init --slim` as root and then switched to `USER vscode`. This meant the Dapr runtime (`daprd`, `placement`) was installed to `/root/.dapr/bin/`, inaccessible to the `vscode` user. The `postCreateCommand` and `dapr run` commands would fail because `~/.dapr/` wouldn't exist for the vscode user. **Fix:** Moved `USER vscode` before `dapr init --slim` so the runtime is installed in `/home/vscode/.dapr/`.

2. **Setup script: missing `mkdir -p ~/.dapr/components`.** `dapr init --slim` does not create a default `components` directory (unlike the full `dapr init`). The setup script wrote to `~/.dapr/components/statestore.yaml` without ensuring the directory existed first, which would cause the script to fail. **Fix:** Added `mkdir -p ~/.dapr/components` before writing component files.

3. **Deprecated CLI flag: `--components-path` → `--resources-path`.** The `--components-path` flag was deprecated in Dapr CLI 1.13 (April 2024) in favor of `--resources-path`. The old flag still works but emits a deprecation warning. For a 2026 post, the current flag should be used. **Fix:** Changed `--components-path` to `--resources-path` in the `dapr run` command.

4. **Obsolete `version` field in docker-compose.yml.** The `version: "3.8"` field is obsolete in Docker Compose V2, which is the default in GitHub Codespaces. Including it produces a warning: "the attribute 'version' is obsolete, it will be ignored." **Fix:** Removed the `version: "3.8"` line.

## Review Notes
- The Dapr state API endpoints (`/v1.0/state/...`) and JSON payload format shown in the testing section are correct.
- The devcontainer.json structure, features, port forwarding, and VS Code extension IDs are all valid per the devcontainers specification.
- The Redis and Zipkin Docker images referenced (`redis:7-alpine`, `openzipkin/zipkin:latest`) are correct.
- The Dapr component YAML for Redis state store and the tracing configuration for Zipkin use correct schema and field names.
- The setup script's shebang (`#!/bin/bash`) appears on the second line after a filename comment, but since the script is invoked via `bash .devcontainer/setup.sh`, this is harmless — bash ignores the shebang as a comment.
