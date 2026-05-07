# Validation Summary: How to Configure the Agent Secret Between Portainer Server and Agent

## Status
validated

## Post Type
Configuration guide / troubleshooting guide

## Technologies Covered
- Portainer Server
- Portainer Agent
- Docker CLI
- Linux firewall tooling (`ufw`, `firewall-cmd`, `iptables`)
- Linux network/socket tools (`nc`, `ss`)
- SELinux

## Sources Consulted
- Portainer FAQ, "How does Portainer secure connectivity to and from Agents and Edge Agents?": https://docs.portainer.io/faqs/getting-started/how-does-portainer-secure-connectivity-to-and-from-agents-and-edge-agents
- Portainer documentation, "Install Portainer Agent on Docker Standalone": https://docs.portainer.io/admin/environments/add/docker/agent
- Portainer FAQ, "Why have my agents stopped working after upgrading Portainer?": https://docs.portainer.io/faqs/upgrading/why-have-my-agents-stopped-working-after-upgrading-portainer
- Portainer documentation, "Updating on Docker Standalone": https://docs.portainer.io/start/upgrade/docker
- Portainer documentation, "Install Portainer CE with Docker on Linux" (official versioned LTS page): https://docs.portainer.io/2.33-lts/start/install-ce/server/docker/linux
- Docker CLI reference, `docker inspect`: https://docs.docker.com/reference/cli/docker/inspect/
- Docker CLI reference, `docker run`: https://docs.docker.com/reference/cli/docker/container/run
- Docker CLI reference, `docker logs`: https://docs.docker.com/reference/cli/docker/container/logs/
- Docker formatting reference for `--format`: https://docs.docker.com/go/formatting/
- firewalld manual page, `firewall-cmd`: https://firewalld.org/documentation/man-pages/firewall-cmd
- firewalld rich language documentation: https://firewalld.org/documentation/man-pages/firewalld.richlanguage
- Local CLI help/man pages consulted for syntax verification: `ufw(8)`, `iptables(8)`, `ss --help`, `nc -h`

## Issues Found
1. **The post did not actually document agent secret configuration.** The original content focused on generic port checks and troubleshooting, but did not show the documented requirement to set the same `AGENT_SECRET` value on both the Portainer Server and Portainer Agent. I updated the overview and command examples to show the correct container environment variable setup on both sides.
2. **The explanation of agent security behavior was incomplete and misleading.** Portainer documents that the Agent serves HTTPS on port `9001`, is claimed by the first Portainer instance by default, and only uses `AGENT_SECRET` as an optional authentication mechanism shared by matching Portainer instances. I corrected the overview to reflect that behavior.
3. **The `curl -k https://<agent-host-ip>:9001` test was not appropriate as the primary validation step.** Portainer's own instructions focus on ensuring port `9001` is reachable and entering the environment URL without a protocol prefix. I removed the curl example and replaced it with reachability and listening checks that align with the documented setup.
4. **The SELinux remediation was incorrect for Portainer Agent.** The original section suggested generating a custom policy module, temporarily disabling enforcement, and relabeling `/var/run/docker.sock`. Portainer's documented guidance for Docker-based agent deployments is that SELinux-disabled is assumed, and if SELinux must remain enforcing the container should be deployed with `--privileged`. I replaced the section with that documented approach.
5. **The versioning guidance used `portainer/agent:latest` and omitted the secret on redeploy.** Portainer's upgrade documentation says to match the Agent version to the Portainer Server version and explicitly preserve any custom `AGENT_SECRET` when updating the agent. I changed the commands to inspect current image tags, use matching release tags, and include `-e AGENT_SECRET=...` in the redeploy example.

## Review Notes
- Portainer's current Docker Standalone Agent documentation labels the standalone Agent as a legacy option and recommends the Edge Agent for most new Docker Standalone deployments.
- The server example in the post uses the Community Edition image `portainer/portainer-ce:lts`. Business Edition users should substitute the corresponding `portainer/portainer-ee:<matching-tag>` image.
- The `lts` examples are correct only when the Portainer Server is also running an LTS tag. If the server is pinned to a specific release or an STS tag, the Agent should use that same release line.
