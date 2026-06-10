# Validation Summary: How to Handle Docker Networking

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker (bridge, host, none, overlay, macvlan network drivers)
- Docker Compose (network configuration, internal networks, external networks)
- Docker Swarm (overlay networks, services, VXLAN, encrypted overlays)
- Docker DNS / embedded resolver (127.0.0.11)
- Port mapping / NAT
- PostgreSQL, Redis, nginx, Traefik (used as example container images)
- netshoot (network debugging container)
- tcpdump (packet capture)

## Sources Consulted
- Docker networking overview: https://docs.docker.com/engine/network/
- Docker network drivers: https://docs.docker.com/engine/network/drivers/
- `docker run` CLI reference: https://docs.docker.com/reference/cli/docker/container/run/
- `docker network create` CLI reference: https://docs.docker.com/reference/cli/docker/network/create/
- `docker network connect` CLI reference: https://docs.docker.com/reference/cli/docker/network/connect/
- `docker service create` CLI reference: https://docs.docker.com/reference/cli/docker/service/create/
- Docker embedded DNS: https://docs.docker.com/engine/network/#dns-services (embedded resolver at 127.0.0.11 for user-defined networks)
- Overlay networks / Swarm mode: https://docs.docker.com/engine/network/drivers/overlay/
- Macvlan networks: https://docs.docker.com/engine/network/drivers/macvlan/
- Compose file specification: https://docs.docker.com/reference/compose-file/
- PostgreSQL official Docker image (POSTGRES_PASSWORD env var): https://hub.docker.com/_/postgres

## Issues Found

1. **Incorrect `-e` flag position in `docker run` (Testing DNS Resolution section).**
   The example used `docker run -d --name database --network dns-test postgres:15-alpine -e POSTGRES_PASSWORD=secret`. In `docker run [OPTIONS] IMAGE [COMMAND] [ARG...]`, every option must appear before the image name; anything after the image name is treated as the command/arguments to the container. As written, `-e POSTGRES_PASSWORD=secret` would be passed to the postgres entrypoint instead of setting an environment variable, so the postgres container would fail to start (postgres requires `POSTGRES_PASSWORD` or `POSTGRES_HOST_AUTH_METHOD`). Moved `-e POSTGRES_PASSWORD=secret` before `postgres:15-alpine`.

2. **Incorrect `-e` flag position in `docker run` (Network Aliases section).**
   Same bug pattern: `-e POSTGRES_PASSWORD=secret` appeared after `postgres:15-alpine`. Reordered so the flag is positioned before the image name.

## Review Notes

- The `version: "3.9"` field in the Compose YAML examples is still accepted but is deprecated in the current Compose Specification (the `version` top-level element is now ignored). Not changed because the examples still work as written.
- The diagram label "Container Registry" in the DNS sequence diagram refers to Docker's internal name registry/resolver, not an image registry (e.g. Docker Hub). The term is slightly ambiguous but the diagram is not technically incorrect.
- Embedded DNS at 127.0.0.11 only applies to user-defined networks. The default bridge network (`docker0`) does not use the embedded resolver, which is correctly noted in the "Bridge Network (Default)" section.
- `docker port` and `-p 80` output in newer Docker versions typically shows both IPv4 (`0.0.0.0:<port>`) and IPv6 (`[::]:<port>`) bindings. The single-line sample output shown is still valid but abbreviated.
- The `--ip-range 172.20.240.0/20` range falls correctly within the `172.20.0.0/16` subnet (172.20.240.0–172.20.255.255 is a subset of 172.20.0.0–172.20.255.255). Valid.
- `docker service create --publish published=8080,target=80 -e REDIS_HOST=redis my-web-app:latest` is correct — for `docker service create`, `-e/--env` is a valid flag and is placed before the image.
- All other CLI flags (`--subnet`, `--gateway`, `--internal`, `--attachable`, `--opt encrypted`, `--driver overlay`, `--dns`, `--dns-search`, `--dns-opt`, `--network-alias`, `--ip`) are correct against current Docker CLI reference.
