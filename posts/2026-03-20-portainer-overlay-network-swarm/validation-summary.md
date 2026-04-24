# Validation Summary: How to Create an Overlay Network in Portainer for Swarm - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer
- Docker Engine
- Docker Swarm
- Docker overlay networks
- Docker Compose / Swarm stack files
- Linux firewall configuration (`iptables`, `ufw`)

## Sources Consulted
- Docker Docs: Getting started with Swarm mode - https://docs.docker.com/engine/swarm/swarm-tutorial/
- Docker Docs: Overlay network driver - https://docs.docker.com/engine/network/drivers/overlay/
- Docker Docs: Manage swarm service networks - https://docs.docker.com/engine/swarm/networking/
- Docker Docs: `docker network create` CLI reference - https://docs.docker.com/reference/cli/docker/network/create/
- Docker Docs: Compose networks reference - https://docs.docker.com/reference/compose-file/networks/
- Docker Docs: Compose deploy reference - https://docs.docker.com/reference/compose-file/deploy/
- Docker Docs: `docker stack deploy` CLI reference - https://docs.docker.com/reference/cli/docker/stack/deploy/
- Portainer Docs: Add a new network - https://docs.portainer.io/user/docker/networks/add
- Portainer Docs: Install Portainer Agent on Docker Swarm - https://docs.portainer.io/admin/environments/add/swarm/agent
- Portainer Docs: Install Portainer CE with Docker Swarm on Linux - https://docs.portainer.io/sts/start/install-ce/server/swarm/linux
- Portainer official CE Swarm stack manifest - https://downloads.portainer.io/ce-lts/portainer-agent-stack.yml
- Ubuntu Server Docs: Firewall / UFW basics - https://ubuntu.com/server/docs/how-to/security/firewalls/

## Issues Found
- The Portainer UI instructions used labels that do not match the current Portainer network-creation docs. I changed `Attachable` to `Enable manual container attachment` and expressed overlay encryption as a driver option (`encrypted=true`) to match the documented UI model.
- The Swarm placement-constraint examples used non-canonical expressions such as `node.role == worker` and `node.labels.storage == "ssd"`. I updated them to the documented constraint syntax (`node.role==worker`, `node.labels.storage==ssd`, `node.role==manager`, `node.platform.os==linux`).
- The section titled `Overlay Network for Portainer Edge (Swarm)` was technically incorrect. The example was not an Edge Agent deployment. I renamed the section and corrected the stack so the Portainer Server connects to the Swarm agent over the overlay network using the documented Swarm pattern, updated the images to `:lts`, exposed the documented UI port `9443`, and removed the incorrect direct Docker socket mount from the Portainer Server service.
- The firewall guidance omitted the extra requirement for encrypted overlay networks. Docker documents that encrypted overlays also require IP protocol 50 (IPSec ESP), so I added that prerequisite and firewall note.
- The `docker network inspect ... | jq` example was described as showing which nodes have containers on the network, but the `Peers` field is specifically the overlay peers participating in that network. I corrected the wording and tightened the `jq` expression.

## Review Notes
- Portainer documents Swarm Agent installation as a legacy option and recommends the Edge Agent when edge features or policy management are needed.
- Docker documents that encrypted overlay networks are not supported for Windows containers. The post is otherwise Linux-oriented, so no broader rewrite was needed.
- `docker stack deploy` still uses the legacy Compose v3 format, but the post's `version: "3.8"` examples remain valid.
