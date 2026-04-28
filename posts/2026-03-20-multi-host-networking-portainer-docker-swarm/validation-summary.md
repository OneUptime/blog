# Validation Summary: How to Set Up Multi-Host Networking with Portainer and Docker Swarm

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Swarm (cluster mode)
- Docker overlay networks (VXLAN, IPsec encryption)
- Portainer (Community / Business Edition)
- Docker Compose / Stack file format (v3.8)
- Docker CLI (`docker node`, `docker network`, `docker exec`)

## Sources Consulted
- Docker Swarm tutorial — port requirements: https://docs.docker.com/engine/swarm/swarm-tutorial/
- Docker overlay network driver (encryption with `--opt encrypted`): https://docs.docker.com/engine/network/drivers/overlay/
- Compose specification — networks (`attachable`, `driver_opts`, `external`): https://docs.docker.com/reference/compose-file/networks/
- Docker Swarm services — placement constraints (`node.role`, `node.labels.<key>`): https://docs.docker.com/engine/swarm/services/#placement-constraints
- `docker node update` reference (`--label-add`): https://docs.docker.com/reference/cli/docker/node/update/
- `docker network inspect` reference: https://docs.docker.com/reference/cli/docker/network/inspect/
- Compose `version` field (obsolete but still parsed): https://docs.docker.com/reference/compose-file/version-and-name/
- Portainer Docker Swarm documentation (CE supports Swarm, overlay, stacks): https://docs.portainer.io/user/docker/swarm

## Issues Found
- **Prerequisite incorrectly required Business Edition.** The post listed "Portainer Business Edition with Swarm environment configured" as a prerequisite. Portainer Community Edition fully supports Docker Swarm management, including overlay network creation, stack deployment, and node label editing — Swarm support is not gated behind BE (BE adds RBAC, OAuth/LDAP, edge/GitOps features, and support, not Swarm itself). Updated the prerequisite to "Portainer (Community or Business Edition) with a Swarm environment configured."

All other technical content was verified correct:
- Swarm port list (2377/TCP, 7946/TCP+UDP, 4789/UDP) matches official docs.
- `driver_opts: encrypted: "true"` is the correct Compose mapping for IPsec-encrypted overlays.
- `attachable: true` correctly allows standalone containers onto the overlay.
- Placement constraint syntax (`node.role == worker`, `node.labels.<key> == <value>`) is valid.
- `docker node update --label-add <k>=<v> <node>` and `docker network inspect <name>` match CLI reference docs.

## Review Notes
- The Compose file `version: "3.8"` declaration is still parsed by `docker stack deploy`, but per the current Compose Specification the top-level `version` field is obsolete and emits a warning when used with newer `docker compose`. This is informational — it does not break Swarm stack deploys, which still rely on the legacy 3.x schema semantics — so it was left as-is to keep the author's chosen style.
- Step 5's example `docker exec -it frontend_container ping backend_container_on_different_host` uses placeholder container names; readers should substitute actual container IDs/names, or use service-name DNS (e.g. `ping backend`) which is the more idiomatic Swarm approach. Technically still valid as a debugging illustration.
- The `myapi:1.2.3` image is a placeholder example image — readers should substitute their own.
