# Validation Summary: How to Configure Docker Swarm with IPv6

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker Engine
- Docker Swarm
- Docker overlay networking
- IPv6
- Docker Stack
- Compose file version 3

## Sources Consulted
- Docker Docs: Use IPv6 networking - https://docs.docker.com/engine/daemon/ipv6/
- Docker Docs: `docker network create` - https://docs.docker.com/reference/cli/docker/network/create/
- Docker Docs: Overlay network driver - https://docs.docker.com/engine/network/drivers/overlay/
- Docker Docs: Manage swarm service networks - https://docs.docker.com/engine/swarm/networking/
- Docker Docs: Deploy a stack to a swarm - https://docs.docker.com/engine/swarm/stack-deploy/
- Docker Docs: Compose networks reference - https://docs.docker.com/reference/compose-file/networks/
- Docker Docs: `dockerd` reference - https://docs.docker.com/reference/cli/dockerd/
- Moby Engine v28 release notes - https://github.com/moby/moby/discussions/49497
- RFC 3849: IPv6 Address Prefix Reserved for Documentation - https://www.rfc-editor.org/rfc/rfc3849.html

## Issues Found
- The original `daemon.json` example used invalid IPv6 literals such as `fd00:swarm:node1::/80` and `fd00:swarm::/48`. I removed that block and replaced the setup with the documented Swarm init/join flow, because Docker's `ipv6` and `fixed-cidr-v6` daemon options apply to the default bridge network rather than being the control point for Swarm overlay creation.
- The post stated that Swarm IPv6 required enabling IPv6 in `daemon.json` on every node. I corrected this to focus on creating the overlay network with `docker network create --driver overlay --ipv6`, which is the documented mechanism for user-defined networks.
- The overlay and stack examples used invalid IPv6 subnets and gateways. I replaced them with `2001:db8::/32` documentation prefixes, which are reserved for examples by RFC 3849.
- The original verification commands inspected containers with `docker ps --filter name=web`, which is unreliable for Swarm tasks and only sees local containers. I changed them to use the Swarm service label `com.docker.swarm.service.name`.
- The original connectivity test referred to an `api` container that did not exist in that section and used `ping6`. I replaced it with an attachable overlay-network test container using `ping -6`.
- The original stack example created IPv6 networks inline in the stack file. I changed it to pre-create the IPv6 overlay networks and reference them as external networks, which is the lower-risk documented path for `docker stack deploy` using the legacy Compose v3 format.

## Review Notes
- Docker Docs explicitly state that IPv6 networking in Docker Engine is supported on Linux hosts.
- Docker's `default-address-pools` and `fixed-cidr-v6` settings are still relevant for the default bridge network and local user-defined networks, but they are separate from the Swarm overlay network creation shown in this post.
- The post remains intentionally dual-stack. Based on current Docker documentation and release notes, Swarm networks still keep IPv4 alongside IPv6 rather than being documented as IPv6-only.
