# Validation Summary: How to Run Portainer Agent in Docker for Remote Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Docker Swarm
- Portainer CE
- Portainer Agent
- Portainer Edge Agent
- Portainer API
- UFW firewall rules
- curl and jq

## Sources Consulted
- Portainer documentation: Install Portainer CE with Docker on Linux - https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer documentation: Install Portainer Agent on Docker Standalone - https://docs.portainer.io/admin/environments/add/docker/agent
- Portainer documentation: Install Portainer Agent on Docker Swarm - https://docs.portainer.io/admin/environments/add/swarm/agent
- Portainer documentation: Install Edge Agent Standard on Docker Standalone - https://docs.portainer.io/admin/environments/add/docker/edge
- Portainer documentation: The Portainer Edge Agent - https://docs.portainer.io/advanced/edge-agent
- Portainer documentation: Add an environment via the Portainer API - https://docs.portainer.io/admin/environments/add/api
- Portainer API documentation - https://api-docs.portainer.io/?edition=ce&version=2.39.2
- Portainer documentation: Accessing the Portainer API - https://docs.portainer.io/api/access
- Docker Docs: Compose file version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Local Docker CLI help/version output for command syntax validation
- Local UFW version output for firewall command syntax validation

## Issues Found
- The API example for adding an Agent environment used a JSON request body with `Content-Type: application/json`. Current Portainer endpoint creation expects `multipart/form-data`, so the example was changed to use `curl -F` form fields.
- The API example set `TLS` to `false` for an Agent environment. Portainer's API documentation requires `TLS=true` when `EndpointCreationType=2`, so the example now sets `TLS=true`, `TLSSkipVerify=true`, and `TLSSkipClientVerify=true`.
- The Agent Compose example implied `AGENT_SECRET` could be set independently on the agent. Portainer requires the same `AGENT_SECRET` to be configured on the Portainer Server container, so the comments and explanation were corrected.
- The Swarm `docker service create` example referenced `portainer_agent_network` without creating it first and omitted `AGENT_CLUSTER_ADDR`. The example now creates an attachable overlay network and sets `AGENT_CLUSTER_ADDR=tasks.portainer_agent`.
- The Swarm Compose example omitted `AGENT_CLUSTER_ADDR` and did not publish port `9001`, which would prevent the Portainer Server from reaching a separately deployed Swarm Agent environment. The snippet now sets `AGENT_CLUSTER_ADDR: tasks.agent` and publishes `9001` in host mode.
- The security Compose snippet described `CAP_HOST_MANAGEMENT` as restricting which Portainer server can connect. That environment variable enables host management features and requires a `/host` bind mount, so the misleading line was removed and the section now focuses on `AGENT_SECRET`.
- The Docker Compose snippets used the obsolete top-level `version` field. Docker Compose still accepts it for backward compatibility, but current Docker docs mark it obsolete and warn when it is used, so the `version` lines were removed.

## Review Notes
- The post uses floating `:latest` image tags. This works, but production deployments should generally pin Portainer Server and Agent to matching explicit versions or an appropriate Portainer release channel.
- Portainer documentation now labels the regular Portainer Agent for Docker Standalone and Swarm as a legacy option and recommends Edge Agent for most use cases, especially where direct inbound connectivity is not available.
