# Validation Summary: How to Connect a Running Container to an Additional Docker IPv4 Network

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Docker (CLI: `docker network connect`, `docker network disconnect`, `docker network create`, `docker inspect`)
- Docker Compose (networks configuration with `external: true`)
- IPv4 networking (custom bridge networks, static IP assignment, network aliases)
- Go templating (used in `docker inspect --format`)
- Python `json.tool` for pretty-printing JSON

## Sources Consulted
- Docker CLI reference for `docker network connect`: https://docs.docker.com/reference/cli/docker/network/connect/
- Docker CLI reference for `docker network disconnect`: https://docs.docker.com/reference/cli/docker/network/disconnect/
- Docker CLI reference for `docker network create`: https://docs.docker.com/reference/cli/docker/network/create/
- Docker CLI reference for `docker inspect`: https://docs.docker.com/reference/cli/docker/inspect/
- Docker Compose specification (networks top-level element): https://docs.docker.com/compose/compose-file/06-networks/
- Docker networking overview / bridge driver docs: https://docs.docker.com/network/drivers/bridge/

## Issues Found
No technical issues found. All commands, flags, and configuration snippets are valid:
- `docker network connect <network> <container>` correctly attaches a running container to an additional network without restart.
- `--ip <addr>` is a valid flag for assigning a static IPv4 address (requires the target network to have an explicit `--subnet`).
- `--alias <name>` correctly registers an additional DNS alias resolvable by other containers on the same network.
- `docker network disconnect [-f|--force] <network> <container>` is valid; `-f` is the documented short flag for `--force`.
- The `docker inspect` Go template syntax (`{{range $net, $cfg := .NetworkSettings.Networks}}...{{end}}`) is correct and produces the documented `NetworkSettings.Networks` map output.
- The Docker Compose snippet uses valid top-level `networks` syntax with `external: true`, requiring the networks to be pre-created.
- The example IPs (172.20.0.2, 172.21.0.3) fall within the typical 172.16.0.0/12 range Docker uses for custom bridge networks.

## Review Notes
- The comment "Force disconnect (ignores errors)" next to `docker network disconnect -f` is slightly imprecise. The `--force` flag is documented as "Force the container to disconnect from a network" — it is intended for cases where the container is stopped or the network endpoint is in a stale/inconsistent state, rather than literally suppressing arbitrary errors. The wording is borderline but not strictly incorrect, so it was left unchanged.
- Port 9090 used in `app-metrics:9090` is conventionally Prometheus's own web UI port; in a real setup an application would more typically expose metrics on a different port (e.g., 8080, 9100, or an app-specific port) to avoid confusion. This is just an illustrative example and not a technical error.
- The Compose example assumes the user has previously run `docker network create frontend` and `docker network create monitoring` (because both are marked `external: true`). This is implied but not spelled out; a reader following along would need to know this.
- Static IP assignment with `--ip` only works on networks that have an explicit `--subnet` defined. The post's `management-net` example assumes this; the `monitoring` network in the practical example correctly uses `--subnet 10.99.0.0/24`.
