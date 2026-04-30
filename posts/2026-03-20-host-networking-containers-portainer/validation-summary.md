# Validation Summary: How to Configure Host Networking Mode for Containers in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine networking
- Docker Compose / Compose Specification
- UFW
- ntopng

## Sources Consulted
- Docker Docs, Host network driver: https://docs.docker.com/engine/network/drivers/host/
- Docker Docs, Services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Docs, Networks reference: https://docs.docker.com/reference/compose-file/networks/
- Docker Docs, Version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs, Packet filtering and firewalls: https://docs.docker.com/engine/network/packet-filtering-firewalls/
- Docker Docs, Overlay network driver: https://docs.docker.com/engine/network/drivers/overlay/
- Docker Docs, Deploy a stack to a swarm: https://docs.docker.com/engine/swarm/stack-deploy/
- Docker Docs, `docker network create`: https://docs.docker.com/reference/cli/docker/network/create/
- Docker Docs, `docker inspect`: https://docs.docker.com/reference/cli/docker/inspect/
- Docker Docs, `docker network inspect`: https://docs.docker.com/reference/cli/docker/network/inspect/
- Portainer Docs, Networks: https://docs.portainer.io/user/docker/networks
- Portainer Docs, Add a new stack: https://docs.portainer.io/user/docker/stacks/add
- Portainer Docs, Add a new container: https://docs.portainer.io/2.27/user/docker/containers/add
- ntop Docker repository: https://github.com/ntop/docker-ntop
- ntopng User Interface Guide: https://www.ntop.org/guides/ntopng/user_interface/index.html

## Issues Found
- The post described host networking as something to create from Portainer's **Networks** screen. I corrected this to explain that host mode uses Docker's predefined `host` network and is configured on the container or stack instead.
- The original Compose examples were generic multi-network examples rather than host-network examples. I replaced them with `network_mode: host` service definitions so the examples match the post title and behavior.
- The draft mixed host networking with `ports:` and user-defined `networks:` patterns. I corrected this because Compose rejects `ports` with `network_mode: host`, and `network_mode` cannot be combined with `networks`.
- The overlay encryption example used an invalid Compose key (`encrypted: true`) and was unrelated to host networking. I replaced that section with host-mode-appropriate security guidance using the host firewall.
- The UFW subnet-based examples were misleading in this context. I updated them to host-port-based firewall rules, which is how host-mode services are actually secured.
- The troubleshooting section relied on container DNS and stack-specific bridge network inspection, which do not apply to host networking. I replaced those commands with checks that confirm host mode, inspect the predefined `host` network, verify the listening host port, and test connectivity.
- The `ntopng` example incorrectly combined `ports:` with `network_mode: host` and omitted the top-level named volume declaration. I removed `ports:` and added the `volumes:` declaration so the YAML is valid.
- One of the original YAML examples was structurally invalid due to indentation and mapping errors. I replaced the pattern examples with valid host-network use cases.

## Review Notes
- This guide is now accurate for Docker Standalone environments in Portainer. Docker Swarm and Kubernetes have different host-networking workflows and should be documented separately.
- Docker host networking is supported on Linux, and on Docker Desktop 4.34+ only when the feature is explicitly enabled.
- The top-level Compose `version` field was removed from the example because it is obsolete in the current Compose Specification.
