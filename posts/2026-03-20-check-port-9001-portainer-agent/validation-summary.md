# Validation Summary: How to Check If Port 9001 Is Accessible for Portainer Agent

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Server
- Portainer Agent
- Docker
- TCP networking
- `nc` / netcat
- `curl`
- `ss`
- `netstat`
- UFW
- firewalld
- iptables
- SELinux

## Sources Consulted
- Portainer Documentation: Install Portainer Agent on Docker Standalone - https://docs.portainer.io/admin/environments/add/docker/agent
- Portainer Documentation: Requirements and prerequisites - https://docs.portainer.io/start/requirements-and-prerequisites
- Portainer Documentation: How does Portainer secure connectivity to and from Agents and Edge Agents? - https://docs.portainer.io/faqs/getting-started/how-does-portainer-secure-connectivity-to-and-from-agents-and-edge-agents
- Portainer Documentation: Updating on Docker Standalone - https://docs.portainer.io/start/upgrade/docker
- Portainer Agent official repository README - https://github.com/portainer/agent
- firewalld manual pages: `firewall-cmd` - https://firewalld.org/documentation/man-pages/firewall-cmd
- firewalld manual pages: `firewalld.richlanguage` - https://firewalld.org/documentation/man-pages/firewalld.richlanguage
- Local CLI help output: `docker ps --help`
- Local CLI help output: `docker logs --help`
- Local CLI help output: `docker inspect --help`
- Local CLI help output: `ss --help`
- Local CLI help output: `netstat --help`
- Local CLI help output: `curl --help`
- Local CLI help output: `nc -h`
- Local CLI help output: `ufw --help`
- Local CLI help output: `iptables --help`
- Local CLI help output: `chcon --help`

## Issues Found
- The overview stated port `9001` as if it were always fixed. Portainer documents `9001` as the default agent port and notes that ports can be changed during installation, so the wording was corrected to "By default".
- `docker ps --filter name=portainer_agent` only shows running containers, which is incomplete for a status check. It was changed to `docker ps -a --filter name=portainer_agent`.
- The `curl` connectivity test targeted the agent root path and did not verify a documented public endpoint. It was changed to `https://<agent-host-ip>:9001/ping`, which the official Portainer Agent exposes publicly and returns HTTP `204`.
- The `nc` example claimed a specific success string. Netcat output varies by implementation, so the note was changed to describe successful reachability instead of asserting exact text.
- The SELinux section recommended `ausearch`, `audit2allow`, `semodule`, and relabeling `/var/run/docker.sock` with `chcon`, which is not the Portainer-documented approach for agent deployment and risks giving incorrect remediation guidance. It was replaced with Portainer's documented requirement: Linux agent installs assume SELinux is disabled, and `--privileged` is required if SELinux must remain enabled.
- The version compatibility section used `portainer/agent:latest` even though Portainer's upgrade guidance says the agent version should match the Portainer Server version. It was corrected to inspect the server image tag and redeploy the agent with a matching tag.
- The server version check relied on an API call plus Python parsing. It was replaced with `docker inspect` against the Portainer container image tag so the guidance aligns directly with the version-matching step.

## Review Notes
- Portainer's current documentation describes the standard Docker Standalone Agent as a legacy option and recommends the Edge Agent for most use cases. The post remains technically relevant, but that product-positioning caveat may be worth incorporating in a future content update.
