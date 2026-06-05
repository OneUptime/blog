# Validation Summary: How to Get Docker Container Statistics in JSON Format

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker CLI
- Docker Engine API
- Docker SDK for Python
- jq
- Bash
- curl

## Sources Consulted
- Docker CLI reference for `docker container stats`: https://docs.docker.com/reference/cli/docker/container/stats/
- Docker Engine API reference for `GET /containers/{id}/stats`: https://docs.docker.com/reference/api/engine/version/v1.49/
- Docker SDK for Python container API reference: https://docker-py.readthedocs.io/en/stable/containers.html
- Docker CLI reference for `docker container ls` / `docker ps` filtering: https://docs.docker.com/reference/cli/docker/container/ls/
- Local `docker stats --help` output

## Issues Found
- The post claimed to cover every way to get JSON-formatted stats but omitted Docker's current native `--format json` option. Added the direct `docker stats --no-stream --format json` command and adjusted the wording to avoid overclaiming.
- The template field table described `.Container` as the container ID. Docker documents it as the container name or ID based on input, so the description was corrected.
- The template field table described `.ID` as the short container ID. Docker documents it as the container ID, so the qualifier was removed.
- The template field table did not mention that `.MemPerc` and `.PIDs` are not available on Windows daemons. Added those caveats from the official Docker CLI reference.
- The JSON Lines streaming example used a `timestamp` field for the container name. Renamed it to `container` so the generated JSON field matches the value.

## Review Notes
The remaining examples are Linux-oriented, especially where they use `/var/run/docker.sock`, Unix socket curl access, `.MemPerc`, and `.PIDs`. That is technically valid, but a future revision could explicitly label the API and shell examples as Linux/macOS Docker daemon examples.
