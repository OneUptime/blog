# Validation Summary: How to Fix MAC Address Collisions in Docker Compose via Portainer (2)

## Status
validated

## Post Type
Guide / Troubleshooting tutorial

## Technologies Covered
- Docker Engine
- Docker Compose / Compose Specification
- Portainer
- Docker networking (bridge and macvlan)
- Bash

## Sources Consulted
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose version and name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose `down` CLI reference: https://docs.docker.com/reference/cli/docker/compose/down/
- Docker `inspect` CLI reference: https://docs.docker.com/reference/cli/docker/inspect/
- Docker `system events` CLI reference: https://docs.docker.com/reference/cli/docker/system/events/
- Docker bridge network driver reference: https://docs.docker.com/engine/network/drivers/bridge/
- Docker macvlan network driver reference: https://docs.docker.com/engine/network/drivers/macvlan/
- Compose Specification: https://compose-spec.github.io/compose-spec/spec.html
- Portainer "Inspect or edit a stack": https://docs.portainer.io/sts/user/docker/stacks/edit
- Portainer "Add a new stack": https://docs.portainer.io/sts/user/docker/stacks/add

## Issues Found
- The Compose examples used top-level `version: "3.8"`, which Docker now marks as obsolete. I removed `version` from the examples.
- The Compose examples referenced `mynet` without a top-level `networks` declaration. I added the missing `networks:` blocks so the snippets are valid Compose examples.
- The article implied Docker's automatic MAC assignment commonly generates duplicates. I corrected the explanation to focus on reused static `mac_address` values and other manually managed MAC settings.
- The duplicate-check commands only inspected running containers and could concatenate multiple network MAC addresses together. I changed them to inspect all containers and compare MAC addresses per network.
- The Step 4 comment described `02:42` as a Docker-reserved prefix. I corrected this to recommend unique locally administered MAC addresses instead.
- The network reset step treated manual `docker network rm` as a normal follow-up to `docker compose down`. I clarified that `docker compose down` already removes Compose-managed networks and that manual removal is only needed if the network still exists.
- The Portainer redeploy instructions assumed every stack can be edited through the Editor tab. I corrected this to distinguish Web Editor stacks from Git-backed stacks, which must be updated in Git or detached first.
- Step 7 suggested changing `docker0`'s MAC address and using `bip` / `fixed-cidr` as a MAC-collision fix. I removed that guidance because Docker documents those settings as bridge IP/subnet controls, not container MAC controls.
- The monitoring script only checked the second whitespace-delimited field and would miss multi-network cases. I rewrote it to detect duplicate network/MAC pairs and print the matching containers.

## Review Notes
- The commands assume a Linux Docker host because they use `journalctl`, `ip`, Bash, and GNU-style tooling.
- Docker documents that `docker events` only returns the most recent 256 stored events, so it is useful for recent troubleshooting but not as a full historical audit trail.
- The post now uses network-scoped `mac_address`, which aligns with current Docker guidance when service-level `mac_address` may be rejected by newer Docker Engine versions.
