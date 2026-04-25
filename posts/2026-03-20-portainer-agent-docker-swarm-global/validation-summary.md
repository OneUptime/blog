# Validation Summary: How to Install Portainer Agent on Docker Swarm as a Global Service - Docker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer Agent
- Portainer API
- Docker Swarm
- Docker CLI
- Docker Compose / Swarm stack YAML

## Sources Consulted
- Portainer Documentation: Install Portainer Agent on Docker Swarm - https://docs.portainer.io/admin/environments/add/swarm/agent
- Portainer Documentation: Add an environment via the Portainer API - https://docs.portainer.io/admin/environments/add/api
- Portainer Documentation: API documentation - https://docs.portainer.io/api/docs
- Portainer Agent README - https://github.com/portainer/agent
- Portainer Agent source: Swarm startup and cluster address handling - https://raw.githubusercontent.com/portainer/agent/master/cmd/agent/main.go
- Portainer Agent source: DNS lookup helper - https://raw.githubusercontent.com/portainer/agent/master/net/lookup.go
- Portainer source: endpoint creation handler - https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/endpoints/endpoint_create.go
- Portainer source: agent version detection - https://raw.githubusercontent.com/portainer/portainer/develop/api/agent/version.go
- Portainer source: URL parsing helper - https://raw.githubusercontent.com/portainer/portainer/develop/api/url/url.go
- Docker Docs: `docker service create` - https://docs.docker.com/reference/cli/docker/service/create/
- Docker Docs: `docker stack deploy` - https://docs.docker.com/reference/cli/docker/stack/deploy/
- Docker Docs: Use Swarm mode routing mesh - https://docs.docker.com/engine/swarm/ingress/
- Docker Docs: Define services in Docker Compose - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Define and manage networks in Docker Compose - https://docs.docker.com/reference/compose-file/networks/
- Docker Docs: Deploy a stack to a swarm - https://docs.docker.com/engine/swarm/stack-deploy/

## Issues Found
- The `docker service create` example attached the service to `portainer_agent_network` without creating that overlay network first. I added the required `docker network create --driver overlay portainer_agent_network` command.
- The stack file did not publish port `9001`, but the post later instructed readers to connect Portainer to `...:9001`. I added the published port mapping to the stack service so the example matches the connection instructions.
- The stack walkthrough told readers to manually create `portainer_net`, but the compose network definition was not marked `external`. Docker stack deployments create stack-scoped networks automatically unless they are declared external, so I removed the incorrect pre-create step.
- The Portainer UI instructions used `tcp://SWARM_MANAGER_IP:9001` as the environment address. Current Portainer documentation says the agent environment address should be entered without a protocol, so I changed it to `SWARM_MANAGER_IP:9001`.
- The Portainer API example posted JSON to `/api/endpoints`, but Portainer’s endpoint creation handler expects `multipart/form-data` fields such as `Name` and `EndpointCreationType`. I replaced the example with a working form-based request and added the TLS flags required for agent environments.
- The log-check comment claimed the command showed logs from a specific node, but `docker service logs` returns service-level aggregated logs. I corrected the wording to describe what the command actually does.

## Review Notes
- Portainer’s current documentation describes the Swarm Agent install path as a legacy option and recommends the Edge Agent for most new deployments.
- Docker’s `docker service` and `docker stack` commands for swarm management must be run from a manager node.
- I verified `AGENT_CLUSTER_ADDR` against the current agent source. Despite older README wording that describes it as `IP:PORT`, the Swarm agent code resolves `tasks.<service>` as a hostname and handles the agent port separately.
- The post still uses `portainer/agent:latest`, which is valid but less reproducible than pinning a specific tested version.
