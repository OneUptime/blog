# Validation Summary: How to Configure Container Isolation in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker Compose
- Linux namespaces
- Container networking
- Seccomp and Linux capabilities

## Sources Consulted
- Docker Compose file reference, version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose file reference, services: https://docs.docker.com/reference/compose-file/services/
- Docker Compose file reference, networks: https://docs.docker.com/reference/compose-file/networks/
- Docker Engine security, user namespace remapping: https://docs.docker.com/engine/security/userns-remap/
- Docker CLI reference, `docker system info`: https://docs.docker.com/reference/cli/docker/system/info/
- Docker CLI reference, `docker container run`: https://docs.docker.com/reference/cli/docker/container/run/
- Docker Engine resource constraints: https://docs.docker.com/engine/containers/resource_constraints/
- Docker networking overview: https://docs.docker.com/network
- Docker Compose networking: https://docs.docker.com/compose/how-tos/networking/
- Portainer documentation, add a new stack: https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer documentation, advanced container settings: https://docs.portainer.io/user/docker/containers/advanced
- Portainer documentation, Swarm setup and Docker security settings: https://docs.portainer.io/sts/user/docker/swarm/setup

## Issues Found
- Removed the obsolete top-level Compose `version` field. Docker's current Compose reference marks it as obsolete and only retained for backward compatibility.
- Corrected the opening explanation so it no longer implies that Portainer exposes daemon-level features like `userns-remap` through the UI or stack file. That setting is configured on the Docker host.
- Replaced the `userns-remap` verification command. The original `docker info | grep -A 5 "Runtimes"` example would not verify the setting as described. The updated commands match Docker's documented verification steps for the `default` remap user.
- Tightened the IPC example. `ipc: private` is now described as an explicit private IPC setting rather than the universal default, which Docker documents as daemon-dependent.
- Corrected the network test expectation. In the provided multi-network example, `frontend` is not attached to the `private` network, so resolving `database` by service name should fail instead of producing a direct TCP refusal/timeout.
- Corrected the second verification comment so it matches the command shown. The command verifies access to `database`, not to both frontend and database networks.

## Review Notes
- `deploy.resources` is appropriate for Swarm-style deployments. The post already includes a separate non-Swarm example using `mem_limit`, `memswap_limit`, `cpus`, and `cpu_shares`, which is useful because resource-handling differs by deployment mode.
- With `userns-remap` enabled, Docker documents compatibility limits for host namespace sharing such as `--pid=host` and `--network=host`. The checklist already steers readers away from those settings.
