# Validation Summary: How to Create an Overlay Network in Portainer for Swarm

## Status
validated

## Post Type
Tutorial / Reference (Docker CLI command examples)

## Technologies Covered
- Docker networking (bridge, macvlan, ipvlan, overlay, host, none drivers)
- Docker Swarm overlay networks
- Docker CLI (`docker network`, `docker run`, `docker inspect`, `docker exec`)
- Portainer (mentioned in title/intro only)

## Sources Consulted
- Docker network drivers overview: https://docs.docker.com/engine/network/drivers/
- Docker bridge networks: https://docs.docker.com/engine/network/drivers/bridge/
- Docker macvlan: https://docs.docker.com/engine/network/drivers/macvlan/
- Docker ipvlan: https://docs.docker.com/engine/network/drivers/ipvlan/
- Docker overlay networks: https://docs.docker.com/engine/network/drivers/overlay/
- `docker network create` reference: https://docs.docker.com/reference/cli/docker/network/create/
- `docker network connect` reference: https://docs.docker.com/reference/cli/docker/network/connect/
- `docker run --network` and `--ip` reference: https://docs.docker.com/reference/cli/docker/container/run/
- `docker inspect --format` Go template documentation: https://docs.docker.com/reference/cli/docker/inspect/

## Issues Found
No technical issues found.

All Docker CLI commands and flags are valid against current Docker documentation:
- `--driver bridge` with `--subnet`, `--gateway`, `--ip-range` is correct.
- Macvlan example with `-o parent=eth0` is correct.
- IPvlan example with `-o ipvlan_mode=l2` is correct.
- Overlay example with `--driver overlay --attachable --subnet` is correct.
- `docker network connect`/`disconnect` syntax is correct.
- `docker run --network <name> --ip <addr>` is valid (works only with user-defined networks, which the example uses).
- `docker inspect --format '{{json .NetworkSettings.Networks}}'` Go template is valid.
- `docker network inspect`, `docker network ls`, and `docker network prune` are all current commands.

## Review Notes
- The post title mentions Portainer and Swarm overlay networks, but the body focuses on raw Docker CLI commands across all network driver types rather than Portainer-specific UI steps. The CLI content itself is correct, but readers expecting Portainer GUI walkthrough may find the scope mismatched.
- Overlay networks require the host to be a Swarm manager (`docker swarm init` or join). The post does not mention this prerequisite; it is technically correct as written but worth noting that running the overlay command on a non-Swarm host will fail with `This node is not a swarm manager`.
- The `--ip` flag in `docker run` only works for user-defined networks (not the default `bridge`); the example uses `my-bridge-network` (user-defined), which is correct.
- `docker exec my-container ping other-container` assumes `ping` (iputils) is installed in the container image — many minimal images (e.g., Alpine, distroless) do not include it.
