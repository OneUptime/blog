# Validation Summary: How to Create a Bridge Network in Portainer

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Docker
- Docker networking (bridge, macvlan, ipvlan, overlay, host, none drivers)
- Portainer (referenced in title/intro)
- Docker Swarm (overlay context)

## Sources Consulted
- Docker Engine network drivers overview: https://docs.docker.com/engine/network/drivers/
- `docker network create` reference: https://docs.docker.com/reference/cli/docker/network/create/
- `docker network connect` reference: https://docs.docker.com/reference/cli/docker/network/connect/
- `docker network inspect` reference: https://docs.docker.com/reference/cli/docker/network/inspect/
- `docker run` networking flags: https://docs.docker.com/reference/cli/docker/container/run/
- macvlan driver: https://docs.docker.com/engine/network/drivers/macvlan/
- ipvlan driver: https://docs.docker.com/engine/network/drivers/ipvlan/
- overlay driver: https://docs.docker.com/engine/network/drivers/overlay/

## Issues Found
No technical issues found.

- The Docker network type table accurately describes each driver's use case (bridge default/single-host, macvlan real MAC on physical network, ipvlan shared MAC, overlay multi-host Swarm, host shared stack, none isolated).
- `docker network create` flags `--driver`, `--subnet`, `--gateway`, `--ip-range`, and `--attachable` are all valid and current.
- Driver-specific options `-o parent=eth0` (macvlan/ipvlan) and `-o ipvlan_mode=l2` (ipvlan, valid values are `l2`/`l3`) are correct.
- Static IP example uses `172.20.0.100`, which falls inside the declared subnet `172.20.0.0/16` and outside the auto-assignment `--ip-range 172.20.10.0/24` — the correct pattern for static assignment, since Docker rejects static IPs that conflict with the auto-assigned range.
- `docker network connect/disconnect`, `docker network inspect`, `docker network ls`, `docker network prune`, and the `docker inspect --format '{{json .NetworkSettings.Networks}}'` Go-template usage are all syntactically correct.

## Review Notes
- The post title focuses on "Bridge Network in Portainer" but the body is almost entirely Docker CLI examples with only a brief Portainer mention in the intro. This is a content/scope observation, not a technical inaccuracy, and was left unchanged per the review guidelines.
- macvlan/ipvlan with `-o parent=eth0` requires the host's actual NIC name; readers on hosts with different interfaces (e.g., `ens33`, `enp0s3`) will need to substitute. This is conventional in Docker docs and not an error.
- `docker network prune` removes all unused networks without confirmation in non-interactive contexts; users running it in scripts should be aware. Not incorrect, just a usage caveat.
