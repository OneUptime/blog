# Validation Summary: How to Deploy Stacks with Custom Network Configurations in Portainer

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer stacks
- Docker Compose / Compose Specification
- Docker networking
- Docker bridge networks
- Docker overlay networks
- Docker Swarm

## Sources Consulted
- Portainer stack deployment documentation: https://docs.portainer.io/user/docker/stacks/add
- Portainer Docker networks documentation: https://docs.portainer.io/user/docker/networks
- Docker Compose networks reference: https://docs.docker.com/reference/compose-file/networks/
- Docker Compose version and name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker overlay network driver documentation: https://docs.docker.com/engine/network/drivers/overlay/

## Issues Found
1. **Obsolete top-level Compose `version` field.** The example used `version: "3.8"`, but current Docker Compose documentation marks the top-level `version` property as obsolete and only retained for backward compatibility. Removed it from the standalone bridge-network example.
2. **Overstated behavior of `internal: true`.** The comment said `internal: true` meant "No internet access from backend". Docker documents `internal` networks as externally isolated rather than making an absolute "no access at all" guarantee in every direction. Updated the comment to "Externally isolated backend network" to match the documented behavior.
3. **Cross-stack external-network example was incomplete.** The post said the example would allow services in different stacks to communicate, but it only defined the shared network and did not attach any services to it. Docker requires services to explicitly join named networks. Added service-level `networks` entries to both stack examples and clarified that the creating stack must be deployed first in the same Docker environment.

## Review Notes
- The bridge-network `ipam` example is valid: `subnet` and `gateway` are supported network IPAM fields in Docker Compose.
- The Swarm overlay example is valid for Portainer environments backed by Docker Swarm. Overlay networks connect multiple Docker daemons and `attachable: true` allows standalone containers to join in addition to Swarm services.
- Docker documents encrypted overlay networks as having a performance cost, and encrypted overlay networking is not supported for Windows containers. The post is still technically correct without that caveat, but it could be added in a future revision if the article is expanded.
- Portainer supports stacks in Docker Standalone and Swarm environments. The updated post now more clearly distinguishes same-host/shared-network behavior from the Swarm-specific overlay example.
