# Validation Summary: How to Follow Container Logs in Real Time in Portainer - Realtime

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Docker Engine container logging
- Docker Compose CLI
- Python logging
- Node.js console logging

## Sources Consulted
- Portainer Documentation: View container logs — https://docs.portainer.io/user/docker/containers/logs
- Docker Docs: docker container logs — https://docs.docker.com/reference/cli/docker/container/logs/
- Docker Docs: docker compose logs — https://docs.docker.com/reference/cli/docker/compose/logs/
- Docker Docs: Logs and metrics — https://docs.docker.com/engine/logging/
- Docker Docs: Use docker logs with remote logging drivers — https://docs.docker.com/engine/logging/dual-logging/
- Python 3.12 Documentation: `sys` — https://docs.python.org/3.12/library/sys.html
- Python 3.12 Documentation: `logging.handlers` — https://docs.python.org/3.12/library/logging.handlers.html
- Node.js v24.1.0 Documentation: Console — https://nodejs.org/download/release/v24.1.0/docs/api/console.html

## Issues Found
1. **Portainer log viewer controls were misstated.** The post referred to an `Auto-refresh` or `Follow` toggle and an `Auto-scroll` option. Current Portainer documentation for container logs documents `Auto refresh`, but not separate `Follow` or `Auto-scroll` controls. Updated the introduction and steps to match the documented UI behavior.

2. **The logging-driver prerequisite was too narrow.** The post said a container must use `json-file` or `journald`. Current Docker documentation also documents direct log reading for the `local` driver, and Docker can expose logs from some remote drivers when dual logging is enabled. Updated the prerequisite to require logs be readable through Docker and added `local` as an example.

3. **One Docker Compose comment was inaccurate and the exact-time example was ambiguous.** `docker compose logs --timestamps` enables timestamps, but it does not choose a custom timestamp format. The example timestamp also omitted an explicit timezone. Updated the wording to "Follow with timestamps" and changed the exact-time example to use `2026-03-20T10:00:00Z`.

4. **The Node.js stdout/stderr example referenced an undefined variable.** `console.error('Error:', err.message)` would fail as written because `err` was never defined. Added a concrete `Error` instance before logging it.

5. **The Node.js buffering snippet was misleading.** Setting `NODE_ENV=production` does not control stdout flushing or disable buffering. Removed that snippet.

6. **The high-volume log filtering comments were incorrect.** The examples used shell pipelines (`grep`, `jq`), so the filtering was happening in the shell, not "at the Docker level". Updated the comments to describe shell-side filtering accurately.

## Review Notes
- `docker logs` readability depends on the container's logging configuration. `json-file`, `local`, and `journald` support log reading directly, while some remote drivers may still be readable when Docker dual logging is enabled.
- Docker CLI was not installed in this workspace, so command verification was done against current official Docker documentation rather than local `docker --help` output.
