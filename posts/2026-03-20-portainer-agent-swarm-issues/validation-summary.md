# Validation Summary: How to Fix Agent Communication Issues on Docker Swarm - Portainer Issues

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Agent
- Portainer Server
- Docker Swarm
- Docker service networking and routing mesh
- Docker overlay networks
- UFW firewall rules

## Sources Consulted
- Portainer Documentation, "Install Portainer Agent on Docker Swarm" - https://docs.portainer.io/admin/environments/add/swarm/agent
- Portainer Documentation, "Install Portainer CE with Docker Swarm on Linux" - https://docs.portainer.io/sts/start/install-ce/server/swarm/linux
- Portainer official Swarm stack manifest - https://downloads.portainer.io/ce-lts/portainer-agent-stack.yml
- Portainer Agent repository README - https://github.com/portainer/agent
- Portainer Agent source, Swarm cluster startup logic - https://github.com/portainer/agent/blob/develop/cmd/agent/main.go
- Portainer Agent source, Docker network selection and service-name detection - https://github.com/portainer/agent/blob/develop/docker/docker.go
- Docker Docs, "Use Swarm mode routing mesh" - https://docs.docker.com/engine/swarm/ingress/
- Docker Docs, "Manage swarm service networks" - https://docs.docker.com/engine/swarm/networking/
- Docker Docs, "Overlay network driver" - https://docs.docker.com/engine/network/drivers/overlay/
- Docker Docs, "docker service create" - https://docs.docker.com/reference/cli/docker/service/create/
- Docker Docs, "docker service update" - https://docs.docker.com/reference/cli/docker/service/update/
- Docker Docs, "docker service logs" - https://docs.docker.com/reference/cli/docker/service/logs/

## Issues Found
- The Step 2 service-creation example attached the service to `portainer-agent-network` before the network was created in Step 3. I added an explicit note to create the overlay network first so the command works when followed literally.
- The `--publish mode=host` explanation said it "uses host networking". Docker documents this as bypassing the Swarm routing mesh for the published port, so I corrected the explanation.
- The `AGENT_CLUSTER_ADDR` section implied the variable is required if omitted. Current Portainer Agent code auto-detects `tasks.<service-name>` when running as a Swarm service, and the current official Swarm stack omits the variable entirely. I updated the post to mark the variable as optional on current releases and kept the service-DNS example for explicit configuration.
- The overlay test used `docker exec ... ping` inside the agent container, which assumes the agent image includes `ping` and that the local container selection is reliable. I replaced it with a temporary container attached to the overlay network, which matches Docker's documented `--attachable` behavior.
- The log-filtering example grepped service logs by `<node-id>`, and the cluster-verification step relied on fabricated cluster-member log messages. I replaced these with valid `docker service ps` and `docker service logs` checks, and I referenced real agent startup error messages from the official source.
- The firewall section implied the same port requirements apply uniformly on every node. I clarified that `2377/tcp` is the Swarm management port for manager nodes, while `7946/tcp+udp` and `4789/udp` are the inter-node networking ports, and `9001/tcp` is needed for agent reachability.

## Review Notes
- Portainer's current docs describe installing the traditional Portainer Agent on Docker Swarm as a legacy option and recommend the Edge Agent for most new deployments. The post is still technically relevant for existing Agent-based Swarm environments.
- The official Portainer CE Swarm stack currently omits `AGENT_CLUSTER_ADDR`; explicitly setting it to `tasks.<service-name>` still aligns with current agent behavior, but it is no longer required for Swarm service deployments.
- If host management features are needed, Portainer's install docs say to add `--mount type=bind,src=/,dst=/host` to the Agent deployment. The post focuses on communication issues, so I did not expand it in the article body.
