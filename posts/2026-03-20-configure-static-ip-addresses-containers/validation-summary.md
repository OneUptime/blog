# Validation Summary: How to Configure Static IP Addresses for Containers in Portainer

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Docker (container runtime)
- Docker networking (bridge, macvlan, ipvlan, overlay, host, none drivers)
- Docker Swarm (overlay networks)
- Portainer (mentioned as the visual interface, though examples use the Docker CLI)

## Sources Consulted
- Docker network drivers overview: https://docs.docker.com/engine/network/drivers/
- `docker network create` reference: https://docs.docker.com/reference/cli/docker/network/create/
- `docker network connect` / `disconnect` reference: https://docs.docker.com/reference/cli/docker/network/connect/
- `docker run` networking options (`--network`, `--ip`): https://docs.docker.com/reference/cli/docker/container/run/
- Macvlan driver guide: https://docs.docker.com/engine/network/drivers/macvlan/
- IPvlan driver guide: https://docs.docker.com/engine/network/drivers/ipvlan/
- Overlay driver and `--attachable` flag: https://docs.docker.com/engine/network/drivers/overlay/

## Issues Found
No technical issues found.

- Network type descriptions in the table are accurate (bridge, macvlan, ipvlan, overlay, host, none).
- `docker network create` flags (`--driver`, `--subnet`, `--gateway`, `--ip-range`, `-o parent=`, `-o ipvlan_mode=l2`, `--attachable`) are valid and current.
- Static IP assignment via `docker run --ip` requires the network to be created with `--subnet`, which the example does. The chosen IP `172.20.0.100` is within the `172.20.0.0/16` subnet (the `--ip-range 172.20.10.0/24` only constrains automatic allocation, not manually assigned IPs), so the example is valid.
- `docker network connect`, `disconnect`, `inspect`, `ls`, and `prune` commands and their syntax are correct.
- The `docker inspect --format '{{json .NetworkSettings.Networks}}' | python3 -m json.tool` pipeline is valid.

## Review Notes
- The post title references Portainer, but the body almost exclusively shows Docker CLI commands rather than the Portainer UI workflow. This is a content/scope observation, not a technical inaccuracy — the underlying Docker behavior described is correct, and Portainer exposes these same options in its Networks UI.
- For macvlan/ipvlan networks, the example uses `eth0` as the parent interface; readers should substitute their actual host NIC name (e.g., `ens33`, `enp0s3`). Not an error in the post, just a deployment caveat.
- For bridge networks, manually assigning an IP outside the `--ip-range` (as shown) is allowed by Docker but can collide with Docker's auto-allocator if other containers are added later; using IPs outside the auto-allocation range (as the example does — `.100` outside `.10.0/24`) is in fact the safer pattern.
