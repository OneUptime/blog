# Validation Summary: How to Set Up Portainer for IoT Device Management

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Portainer Edge Agent
- Portainer Edge Groups
- Portainer Edge Stacks
- Docker
- Docker Compose
- IoT / edge device management

## Sources Consulted
- Portainer documentation: Welcome and edition overview - https://docs.portainer.io/
- Portainer documentation: Requirements and prerequisites - https://docs.portainer.io/start/requirements-and-prerequisites
- Portainer documentation: Edge Compute settings - https://docs.portainer.io/2.21/admin/settings/edge
- Portainer documentation: Install Edge Agent Standard on Docker Standalone - https://docs.portainer.io/admin/environments/add/docker/edge
- Portainer documentation: The Portainer Edge Agent - https://docs.portainer.io/advanced/edge-agent
- Portainer documentation: Edge Groups - https://docs.portainer.io/2.27/user/edge/groups
- Portainer documentation: Add a new Edge Stack - https://docs.portainer.io/user/edge/stacks/add
- Portainer documentation: View container logs - https://docs.portainer.io/user/docker/containers/logs
- Portainer documentation: API documentation - https://docs.portainer.io/api/docs
- Portainer API docs: Business Edition 2.39.1 OpenAPI spec - https://api-docs.portainer.io/?edition=ee&version=2.39.1

## Issues Found
- The post incorrectly stated that Edge features require Portainer Business Edition. Portainer CE also supports Edge Agents and Edge Compute basics, so this was corrected to say some Edge Compute settings are BE-only rather than making BE a blanket requirement.
- The post used outdated or incorrect UI terminology in Step 1. `Enforce Edge ID uniqueness` was corrected to `Enforce use of Portainer generated Edge ID`, matching Portainer's documented setting name and behavior.
- The networking guidance in Step 1 was incomplete. The post only mentioned port `8000`, but Portainer documents that Edge Agents need outbound access to both the API/UI port (usually `9443`) and the tunnel port (`8000`) on the Portainer Server.
- The enrollment flow in Step 2 was too simplified and the placeholder values were inaccurate. The navigation was corrected to the current Docker Standalone wizard flow, and `EDGE_ID` was changed from a user-chosen value to the Portainer-generated Edge ID shown in the UI.
- The sample `docker run` command hardcoded `EDGE_INSECURE_POLL=1` and `portainer/agent:latest`. The post was corrected so `EDGE_INSECURE_POLL=1` is only added for self-signed certificates, and the image reference now makes it clear the agent tag should match the Portainer Server version.
- The stack deployment section referred to generic stacks and used `${EDGE_ID}` inside the compose file. Portainer documents Edge Stack deployment through **Edge Stacks**, and device-specific stack variables use `PORTAINER_EDGE_ID`, so both were corrected.
- The security section recommended rotating Edge Keys via the Portainer API without clear support for that exact workflow in the reviewed documentation. This was replaced with documented guidance about HTTPS/self-signed certificates and `AGENT_SECRET`.
- The monitoring section used the phrase `Last heartbeat timestamp`, which is not the Portainer terminology used in the reviewed docs. This was adjusted to refer to environment status and snapshot/check-in data instead.

## Review Notes
- Portainer recommends matching the Edge Agent version to the Portainer Server version instead of relying on floating tags.
- Some Edge Compute capabilities shown in the UI are edition-dependent. Basic Edge Agent workflows are available beyond BE, but certain configuration conveniences and rollout features are BE-only.
