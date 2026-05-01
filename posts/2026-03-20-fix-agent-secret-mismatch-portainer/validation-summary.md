# Validation Summary: How to Fix Agent Secret Mismatch Between Server and Agent

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Portainer Server
- Portainer Agent
- Docker CLI
- Docker container inspection and logs
- OpenSSL

## Sources Consulted
- Portainer Documentation, "How does Portainer secure connectivity to and from Agents and Edge Agents?": https://docs.portainer.io/faqs/getting-started/how-does-portainer-secure-connectivity-to-and-from-agents-and-edge-agents
- Portainer Documentation, "Install Portainer Agent on Docker Standalone": https://docs.portainer.io/admin/environments/add/docker/agent
- Portainer Documentation, "Updating on Docker Standalone": https://docs.portainer.io/start/upgrade/docker
- Portainer Documentation, "CLI configuration options": https://docs.portainer.io/advanced/cli
- Docker Docs, "`docker inspect`": https://docs.docker.com/reference/cli/docker/inspect/
- Docker Docs, "`docker container logs`": https://docs.docker.com/reference/cli/docker/container/logs/
- Portainer Agent GitHub repository README: https://github.com/portainer/agent

## Issues Found
- The post documented the server-side secret as a `--agent-secret` CLI flag. I changed this to the documented `AGENT_SECRET` environment variable on the Portainer Server container because current Portainer documentation describes shared-secret configuration that way.
- The post said that if the server had no secret, "any agent can connect". I corrected this to Portainer's documented default claim-based authentication flow for standard agents, where the first Portainer instance claims the agent unless shared-secret mode is enabled.
- The server verification command inspected container arguments for `--agent-secret`. I replaced it with an environment-variable inspection command for `AGENT_SECRET`, which matches the documented server configuration model.
- The agent verification command used a broad `grep AGENT_SECRET`. I tightened it to `grep '^AGENT_SECRET='` so it checks the exact variable being discussed.
- The restart examples used `:latest` tags while current Portainer guidance says the Server and Agent versions should match. I updated the examples to use matching `:lts` tags and clarified that the Server and Agent tags or versions should match.
- The post described failures as silent and gave a fixed reconnection time. I removed those unsupported specifics and kept the outcome limited to the documented Offline-to-Online behavior once the secret is corrected.

## Review Notes
- Portainer's current documentation labels the Docker Standalone Agent path as a legacy option and recommends the Edge Agent for most new use cases. That does not make this post incorrect, but it is a relevant product-direction caveat.
- Portainer's update guidance says to keep the Agent version aligned with the Portainer Server version. Future edits should preserve that advice if image tags are changed.
