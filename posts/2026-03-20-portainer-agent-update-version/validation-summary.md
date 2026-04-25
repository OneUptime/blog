# Validation Summary: How to Update Portainer Agent to Match Server Version

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer API
- Docker
- Docker Swarm
- Kubernetes
- Bash

## Sources Consulted
- Portainer update guidance and update order: https://docs.portainer.io/start/upgrade
- Portainer Docker standalone update docs: https://docs.portainer.io/start/upgrade/docker
- Portainer Docker Swarm update docs: https://docs.portainer.io/start/upgrade/swarm
- Portainer Kubernetes agent install docs: https://docs.portainer.io/admin/environments/add/kubernetes/agent
- Portainer note on agent-only deployments and version matching: https://docs.portainer.io/start/upgrade/tobe/agent
- Portainer CE API spec (`/system/version`): https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Docker CLI docs for `docker inspect`: https://docs.docker.com/reference/cli/docker/inspect/
- Docker CLI docs for `docker service update`: https://docs.docker.com/reference/cli/docker/service/update/
- Kubernetes docs for `kubectl set image`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/
- Kubernetes docs for `kubectl rollout status`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/

## Issues Found
- The introduction overstated the update rule. Portainer’s official guidance is that agent and server versions should match, and that Portainer Server should be updated before the agents. I corrected that explanation.
- The Docker standalone, Swarm, and automation examples used `portainer/agent:latest`, which conflicts with Portainer’s recommendation to match the agent tag to the server version. I changed the examples to use a pinned `PORTAINER_VERSION`.
- The image verification command `docker inspect ... | grep -i "Image"` was not a reliable way to confirm the deployed image. I replaced it with Docker’s documented `docker inspect --format '{{.Config.Image}}'`.
- The Swarm example used a stack-specific service name (`portainer-agent_agent`) as if it were universal, and it did not align with Portainer’s documented `docker service update --force` flow. I changed it to the default `portainer_agent` example and noted that custom service names may differ.
- The Kubernetes section was incorrect. Portainer’s current docs do not provide an official `portainer/portainer-agent` Helm chart for agent-only deployments. I replaced that section with a Kubernetes DaemonSet image update using the documented `portainer-agent` DaemonSet/container names and standard `kubectl` commands.
- The conclusion recommended updating server and agents “together”, which is less accurate than Portainer’s documented order. I corrected it to update Portainer Server first, then the agents, and replaced the stale fixed version example with a generic server-version placeholder.

## Review Notes
- Portainer’s current docs describe the Docker Standalone Agent and Kubernetes Agent as legacy options for many new deployments, and recommend the Edge Agent for many use cases.
- If Portainer Server was started with a custom `AGENT_SECRET`, the same secret must also be supplied to the agent during updates. The post does not cover that advanced setup.
- The API example using `POST /api/auth` and `GET /api/system/version` is valid against Portainer’s current API documentation.
