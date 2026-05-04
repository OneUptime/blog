# Validation Summary: How to Create an IPvlan Network in Portainer

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Docker (network subsystem)
- Docker network drivers: bridge, macvlan, ipvlan, overlay, host, none
- Portainer (mentioned in title/intro)
- Linux networking concepts (L2/L3, MAC addresses, subnets, gateways)

## Sources Consulted
- Docker official documentation: `docker network create` reference (https://docs.docker.com/reference/cli/docker/network/create/)
- Docker IPvlan network driver docs (https://docs.docker.com/engine/network/drivers/ipvlan/)
- Docker Macvlan network driver docs (https://docs.docker.com/engine/network/drivers/macvlan/)
- Docker Overlay network driver docs (https://docs.docker.com/engine/network/drivers/overlay/)
- Docker `docker network connect`/`disconnect` reference
- Docker `docker run --network`/`--ip` reference
- Docker `docker inspect` reference (Go template formatting)

## Issues Found
No technical issues found.

- Bridge network: `--driver bridge`, `--subnet`, `--gateway`, `--ip-range` flags are all valid and correctly used.
- Macvlan: `--driver macvlan` with `-o parent=<iface>` is correct.
- IPvlan: `--driver ipvlan` with `-o parent=<iface>` and `-o ipvlan_mode=l2` is correct (l2 is the default mode; l3 is the alternative).
- Overlay: `--driver overlay --attachable --subnet` is valid for Swarm-mode attachable overlays.
- `docker network connect/disconnect <network> <container>` syntax is correct.
- `docker run -d --network <net> --ip <ip> --name <name> <image>` is correct.
- `docker inspect --format '{{json .NetworkSettings.Networks}}'` Go template is correct.
- `docker network ls`, `docker network prune`, `docker network inspect` are all correct.

## Review Notes
- The post title focuses on IPvlan in Portainer, but the body is entirely CLI-driven and does not walk through the Portainer UI for creating an IPvlan network. This is a content-scope observation, not a technical error — the CLI commands shown are equivalent to what Portainer would execute on the user's behalf.
- Static IP assignment with `--ip` requires the network to have been created with a `--subnet` (which is the case in the example) — this is correct.
- For IPvlan L3 mode, no gateway is used inside the container (the host routes traffic); the example uses L2 mode where a gateway is appropriate, so no change needed.
- `docker network prune` is destructive (removes all unused networks); a brief warning could help readers but its omission is not an error.
