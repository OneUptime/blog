# Validation Summary: How to Fix Agent Secret Mismatch Between Server and Agent - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Server
- Portainer Agent
- Docker
- Docker Compose
- Docker Swarm
- Bash shell
- OpenSSL

## Sources Consulted
- Portainer Documentation: How does Portainer secure connectivity to and from Agents and Edge Agents? https://docs.portainer.io/faqs/getting-started/how-does-portainer-secure-connectivity-to-and-from-agents-and-edge-agents
- Portainer Documentation: Why have my agents stopped working after upgrading Portainer? https://docs.portainer.io/faqs/upgrading/why-have-my-agents-stopped-working-after-upgrading-portainer
- Portainer Documentation: Install Portainer Agent on Docker Standalone https://docs.portainer.io/admin/environments/add/docker/agent
- Portainer Documentation: Install Portainer Agent on Docker Swarm https://docs.portainer.io/admin/environments/add/swarm/agent
- Portainer Agent repository README and authentication notes https://github.com/portainer/agent
- Docker Docs: `docker service update` https://docs.docker.com/reference/cli/docker/service/update/
- GNU Bash Reference Manual: Command Substitution https://www.gnu.org/software/bash/manual/bash.html

## Issues Found
- The post incorrectly treated the mismatch as a value entered in a per-environment Portainer UI field. I changed Steps 2 and 3 to check and correct `AGENT_SECRET` on the Portainer Server container itself, because Portainer's official docs describe `AGENT_SECRET` as an environment variable set when starting the Portainer Server container.
- The `How AGENT_SECRET Works` section implied the Portainer Server simply "sends the secret" to the agent. I corrected that explanation to state that the Portainer Server and agent must both be started with the same `AGENT_SECRET`, matching Portainer's documentation and the agent repository's authentication description.
- The shell example claiming `AGENT_SECRET=$(cat /tmp/secret)` would preserve a trailing newline was technically wrong in Bash. I replaced it with a hidden `\r` / line-ending example, because Bash command substitution removes trailing newlines.
- The "Remove the Secret" section incorrectly said this disables authentication and allows any Portainer instance to connect. I corrected it to Portainer's default claim-based behavior: without `AGENT_SECRET`, the first Portainer instance to claim the agent becomes the only one allowed to manage it.
- The conclusion repeated the same server-side configuration error by referring to an "Agent secret" field in Portainer. I corrected it to the actual requirement: the `AGENT_SECRET` environment variable must match on both the Portainer Server and the agent.

## Review Notes
- Current Portainer 2.39 LTS documentation describes the Portainer Agent on Docker Standalone and Docker Swarm as a legacy option and recommends the Edge Agent for many new deployments. The post remains technically valid after correction, but that product-positioning note may be worth incorporating in a future editorial pass.
