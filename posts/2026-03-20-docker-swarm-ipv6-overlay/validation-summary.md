# Validation Summary: How to Configure Docker Swarm IPv6 Overlay Networks

## Status
not-technically-relevant

## Post Type
Guide

## Technologies Covered
- Docker Engine
- Docker Swarm
- Docker overlay networks
- Docker Compose / stack files
- IPv6 container networking

## Sources Consulted
- Docker Docs: Use IPv6 networking - https://docs.docker.com/engine/daemon/ipv6/
- Docker Docs: Manage swarm service networks - https://docs.docker.com/engine/swarm/networking/
- Docker Docs: docker network create - https://docs.docker.com/reference/cli/docker/network/create/
- Docker Docs: docker swarm init - https://docs.docker.com/reference/cli/docker/swarm/init/
- Docker Docs: Deploy a stack to a swarm - https://docs.docker.com/engine/swarm/stack-deploy/
- Docker Docs: Define and manage networks in Docker Compose - https://docs.docker.com/reference/compose-file/networks/
- Docker Docs: Docker Engine v27 release notes - https://docs.docker.com/engine/release-notes/27/
- Moby issue #43643: Swarm overlay network doesn't work when advertised over IPv6 - https://github.com/moby/moby/issues/43643

## Issues Found
- The post's core claim is not supported by current Docker documentation. Current Docker docs document IPv6 for Docker daemon and custom network usage, but the Swarm networking docs do not document IPv6 overlay networking for Swarm services or ingress. The Swarm overlay examples still show `EnableIPv6: false` and IPv4-only subnets. What I changed: I did not patch the README and instead marked the post `not-technically-relevant`, because the tutorial's main premise is not currently supported/documented.
- The stack example mixes current Docker Compose networking syntax with Swarm stack deployment. Docker documents `enable_ipv6` under Docker Compose networking, while `docker stack deploy` is explicitly documented as using the legacy Compose file version 3 format rather than the latest Compose specification. What I changed: I included this in the removal rationale rather than attempting a partial fix, because correcting it would require rewriting the post around a different deployment model.
- Several individual examples are also incorrect or outdated. `experimental: true` is no longer required for IPv6-related `ip6tables` behavior in current Docker Engine releases; `docker swarm init --advertise-addr [2001:db8::manager]` is not a valid IPv6 literal and the documented flag format is `<ip|interface>[:port]`; and the ingress network can only be removed after services depending on it are removed. What I changed: I recorded these problems in the review summary instead of editing the post, because they are secondary to the unsupported central premise.
- Current Moby issue tracking also shows unresolved Swarm IPv6 problems in practice. Issue `moby/moby#43643` documents overlay communication failure when the swarm is advertised over IPv6, which directly contradicts the post's claim that an IPv6 advertise address and IPv6 overlay workflow are expected to work. What I changed: I used this as additional support for the removal decision.

## Review Notes
- If this topic is to be salvaged, it should be rewritten as a different post, such as Docker IPv6 on bridge/custom networks, or a Swarm-focused article that explains the current IPv6 limitations instead of presenting IPv6 overlay networking as a supported configuration.
