# Validation Summary: How to Configure Docker Network Modes on Ubuntu

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered
- Docker Engine networking
- Docker bridge, host, overlay, macvlan, and none network drivers
- Docker CLI commands: `docker run`, `docker network create`, `docker network connect`, `docker network inspect`, `docker service create`
- Ubuntu/Linux networking commands: `ip`, `iptables`
- Docker Swarm overlay networking

## Sources Consulted
- Docker Docs: Network drivers - https://docs.docker.com/engine/network/drivers/
- Docker Docs: Bridge network driver - https://docs.docker.com/engine/network/drivers/bridge/
- Docker Docs: Host network driver - https://docs.docker.com/engine/network/drivers/host/
- Docker Docs: Overlay network driver - https://docs.docker.com/engine/network/drivers/overlay/
- Docker Docs: Macvlan network driver - https://docs.docker.com/engine/network/drivers/macvlan/
- Docker Docs: None network driver - https://docs.docker.com/engine/network/drivers/none/
- Docker CLI reference: `docker network create` - https://docs.docker.com/reference/cli/docker/network/create/
- Docker CLI reference: `docker container run` - https://docs.docker.com/reference/cli/docker/container/run/
- Docker CLI reference: `docker network connect` - https://docs.docker.com/reference/cli/docker/network/connect/
- Docker CLI reference: `docker service create` - https://docs.docker.com/reference/cli/docker/service/create/
- Local Docker CLI help output for `docker network create`, `docker run`, `docker network connect`, and `docker service create`

## Issues Found
- The overview stated that Docker provides five built-in network drivers. Current Docker documentation also lists `ipvlan`, so the wording was changed to clarify that the guide covers five commonly used built-in network drivers.
- The bridge example used `ubuntu:24.04` and then ran `ip` inside the container. The official Ubuntu image does not reliably include the networking tools expected by the example, so the command now uses `alpine`, which includes the needed `ip` command.
- Several examples used `postgres:16` without setting `POSTGRES_PASSWORD`. The official Postgres image requires a password-related environment variable unless a different authentication mode is explicitly configured, so `POSTGRES_PASSWORD=secret` was added to those examples.
- The custom bridge DNS example used `docker exec web ping db` against an `nginx` container, but the `nginx` image does not reliably include `ping`. The example now uses a temporary `alpine` container on the same network to demonstrate DNS resolution.
- The host-network performance note gave a specific "10-20%" improvement claim without a stable official basis. It was changed to a qualitative statement that host networking can improve throughput and latency because it avoids NAT.
- The `none` network example used a placeholder image and then executed `ip addr` inside it. It now uses `alpine sleep 1d`, making the verification command concrete and runnable.
- The overlay section stated that overlay networks require Docker Swarm or an external key-value store. Current Docker documentation says Docker hosts must be part of a swarm to use overlay networks, even for standalone containers, so the statement was updated.
- Network alias examples used `ubuntu ping`, which can fail because `ping` is not included by default. They now use `alpine ping -c 2`.

## Review Notes
The examples remain environment-dependent where they reference host interface names, LAN subnets, Swarm setup, and placeholder application images such as `myapp` and `myapp-api`. Those are acceptable for a networking guide, but readers must adapt them to their local network and application images.
