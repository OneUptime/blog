# Validation Summary: How to Install Portainer Agent on Docker Standalone - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Agent
- Portainer Server
- Docker Engine
- Docker Compose
- UFW

## Sources Consulted
- Portainer Documentation: Install Portainer Agent on Docker Standalone - https://docs.portainer.io/admin/environments/add/docker/agent
- Portainer Documentation: Add a Docker Standalone environment - https://docs.portainer.io/admin/environments/add/docker
- Portainer Documentation: Add an environment via the Portainer API - https://docs.portainer.io/admin/environments/add/api
- Portainer Documentation: Updating on Docker Standalone - https://docs.portainer.io/start/upgrade/docker
- Portainer Documentation: How does Portainer secure connectivity to and from Agents and Edge Agents? - https://docs.portainer.io/faqs/getting-started/how-does-portainer-secure-connectivity-to-and-from-agents-and-edge-agents
- Docker Docs: docker container run - https://docs.docker.com/reference/cli/docker/container/run/
- Docker Docs: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Services reference - https://docs.docker.com/reference/compose-file/services/
- Ubuntu Server documentation: Firewalls - https://ubuntu.com/server/docs/how-to/security/firewalls/

## Issues Found
- The post used `portainer/agent:latest` for installation and upgrade examples. Portainer’s current Docker Standalone and upgrade docs use `portainer/agent:lts`, so both command examples were updated.
- The Docker Compose example used the top-level `version: "3.8"` field. Docker’s current Compose reference marks the top-level `version` property as obsolete, so it was removed.
- The Compose example set `AGENT_SECRET` as an active placeholder even though Portainer only requires it when the Portainer server itself was started with `AGENT_SECRET`. This was changed to commented optional configuration to avoid an incorrect default setup.
- Step 3 showed a `POST /api/endpoints` example for registering an agent-managed Docker Standalone environment, using `tcp://192.168.1.100:9001`. Portainer’s current docs do not document a dedicated API request format for this agent flow, and the agent UI flow requires entering `host:9001` without a protocol. The section was replaced with the supported UI-based procedure and the correct URL format.
- The post omitted current Portainer caveats that materially affect correctness: the Docker Standalone agent is now documented as a legacy option, the agent requires Docker access via the local Unix socket rather than Docker-over-TCP, SELinux hosts need `--privileged`, and host-management features require `-v /:/host`. These points were added where relevant.

## Review Notes
- Portainer’s current documentation recommends the Edge Agent for most new deployments; the standard Docker Standalone Agent is still supported but documented as a legacy option.
- Portainer’s upgrade docs also state that the agent version should match the Portainer Server version. Using the `lts` tag follows Portainer’s current installation guidance, but environments that pin exact versions should keep server and agent releases aligned.
