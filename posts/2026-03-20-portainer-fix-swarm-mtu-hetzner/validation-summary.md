# Validation Summary: How to Fix Swarm MTU Issues with Portainer on Hetzner - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Docker Swarm
- Docker Engine networking
- Docker Compose / Stack files
- Portainer
- Hetzner Cloud networking
- cloud-init

## Sources Consulted
- Docker Docs, "Manage swarm service networks" - https://docs.docker.com/engine/swarm/networking/
- Docker Docs, "Overlay network driver" - https://docs.docker.com/engine/network/drivers/overlay/
- Docker Docs, "`dockerd`" - https://docs.docker.com/reference/cli/dockerd/
- Docker Docs, "`docker network create`" - https://docs.docker.com/reference/cli/docker/network/create/
- Docker Docs, "`docker swarm init`" - https://docs.docker.com/reference/cli/docker/swarm/init/
- Docker Docs, "Deploy a stack to a swarm" - https://docs.docker.com/engine/swarm/stack-deploy/
- Docker Docs, "Networks" (Compose file reference) - https://docs.docker.com/reference/compose-file/networks/
- Portainer Docs, "Why can't my agents communicate with Portainer on Swarm?" - https://docs.portainer.io/faqs/troubleshooting/agents-and-environment-management/why-cant-my-agents-communicate-with-portainer-on-swarm
- Portainer Docs, "Add a new stack" - https://docs.portainer.io/user/docker/stacks/add?fallback=true
- Portainer Docs, "Inspect or edit a stack" - https://docs.portainer.io/2.21/user/docker/stacks/edit
- Hetzner Docs, "FAQ" (Cloud technical details) - https://docs.hetzner.com/cloud/technical-details/faq/
- Hetzner Docs, "MTU" - https://docs.hetzner.com/networking/networks/troubleshooting/mtu/
- Hetzner Docs, "Hetzner Cloud Networks Configuration" - https://docs.hetzner.com/networking/networks/server-configuration/

## Issues Found
- The post stated that Hetzner Cloud's network interface MTU is 1450 bytes in general. I corrected this to Hetzner **private** network interfaces, because Hetzner documents public interfaces as 1500 bytes and private interfaces as 1450 bytes.
- The diagnosis commands were too specific and partly misleading. I replaced `ip link show eth0` with `ip addr` so the reader can identify the actual interface in use, and I changed the PMTU test values to `1422` and `1423`, matching Hetzner's documented private-network MTU behavior.
- The original Step 1 implied that setting `"mtu"` in `/etc/docker/daemon.json` fixes Swarm overlay networks. Docker documents that daemon MTU settings apply to the default `bridge` network; I corrected the text to explain that the Swarm fix is recreating ingress and overlay networks with the right MTU.
- The post used `1400` throughout as the recommended Swarm MTU on Hetzner. Portainer's official Swarm troubleshooting guidance for Hetzner recommends matching the underlying network MTU, so I updated the Swarm examples to `1450`.
- The bridge-network example used invalid JSON because it included a `//` comment and an unnecessary `bip` change. I replaced it with a valid shell example that sets only `"mtu": 1450`.
- The section about other cloud providers contained provider-wide MTU recommendations that were not supported by the primary sources reviewed. I replaced that table with a technically accurate provider-agnostic note about checking the actual path MTU.
- The "Alternative: Use a Private Network" section incorrectly claimed that Hetzner private networks have configurable MTU. Hetzner documents a 1450-byte MTU for private interfaces, not a custom MTU setting in network creation, so I corrected that section and updated the Swarm commands to use private addresses explicitly for control and data traffic.
- The conclusion overstated that the fix requires changing Docker daemon MTU on all nodes. I corrected it to say the core Swarm fix is recreating ingress and overlay networks with the correct MTU, while daemon MTU alignment is only additionally relevant for standalone containers on the default bridge.

## Review Notes
- The post is now technically sound for Swarm clusters whose node-to-node traffic uses Hetzner private networking. If the swarm communicates over public interfaces instead, Hetzner documents public MTU as 1500, so this specific MTU adjustment may not be necessary.
- `docker stack deploy` uses the legacy Compose v3 format for Swarm deployments. The example `version: "3.8"` remains acceptable in that context.
