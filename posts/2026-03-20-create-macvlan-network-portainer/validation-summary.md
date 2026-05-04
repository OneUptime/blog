# Validation Summary: How to Create a Macvlan Network in Portainer

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Docker (network drivers: bridge, macvlan, ipvlan, overlay, host, none)
- Docker CLI (`docker network`, `docker run`, `docker inspect`, `docker exec`)
- Portainer (mentioned in title/intro, but body is CLI-focused)
- Docker Swarm (overlay driver context)
- Linux networking concepts (MAC, L2, parent interface)

## Sources Consulted
- Docker network drivers overview: https://docs.docker.com/engine/network/drivers/
- Docker macvlan driver: https://docs.docker.com/engine/network/drivers/macvlan/
- Docker ipvlan driver: https://docs.docker.com/engine/network/drivers/ipvlan/
- Docker bridge driver: https://docs.docker.com/engine/network/drivers/bridge/
- Docker overlay driver: https://docs.docker.com/engine/network/drivers/overlay/
- `docker network create` reference: https://docs.docker.com/reference/cli/docker/network/create/
- `docker network connect/disconnect` reference: https://docs.docker.com/reference/cli/docker/network/
- `docker run` reference: https://docs.docker.com/reference/cli/docker/container/run/
- Portainer networks documentation: https://docs.portainer.io/user/docker/networks

## Issues Found
No technical issues found.

All commands and flags verified against Docker CLI documentation:
- `docker network create` with `--driver`, `--subnet`, `--gateway`, `--ip-range`, `--attachable` flags — all valid.
- `--ip-range 172.20.10.0/24` is correctly contained within `--subnet 172.20.0.0/16`.
- Macvlan and IPvlan `-o parent=eth0` and `-o ipvlan_mode=l2` driver options — valid.
- `docker network connect/disconnect <network> <container>` — correct syntax.
- `docker run --network <name> --ip <ip>` — valid for static IP assignment on user-defined networks.
- `docker inspect --format '{{json .NetworkSettings.Networks}}'` — valid Go template syntax.
- `docker network prune`, `docker network ls`, `docker network inspect` — all valid.
- The Docker network types table (Bridge, Macvlan, IPvlan, Overlay, Host, None) accurately describes each driver. The IPvlan note about a shared MAC is correct (IPvlan L2 mode shares the parent interface's MAC across containers, each getting its own IP).

## Review Notes
- **Scope mismatch (non-technical)**: The title is "How to Create a Macvlan Network in Portainer" but the body provides only Docker CLI commands and does not walk through Portainer's UI workflow (Networks → Add network → Driver: macvlan, etc.). This is a content/structure issue, not a technical inaccuracy, so per the review guidelines (no restructuring or new sections) it was left as-is.
- **Macvlan caveats not mentioned**: Some practical caveats about Macvlan are not covered but are commonly hit in production: (1) the parent interface usually needs promiscuous mode enabled, (2) by default the Docker host cannot communicate with Macvlan containers on the same parent interface without a `macvlan` sub-interface workaround, and (3) many Wi-Fi adapters and most cloud-provider NICs do not allow Macvlan due to MAC filtering. These are correctness-adjacent omissions but the existing content is not wrong.
- **IPvlan L2 default**: `-o ipvlan_mode=l2` is the default for the IPvlan driver, so the flag is technically optional but harmless to specify explicitly.
- **Static IP requires user-defined network**: The `--ip` flag with `docker run` only works on user-defined networks with a configured subnet, which is the case in the example. Worth noting for readers but the example is correct.
