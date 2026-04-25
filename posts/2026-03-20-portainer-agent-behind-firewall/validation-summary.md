# Validation Summary: How to Run Portainer Agent Behind a Firewall

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Agent
- Portainer Server
- Docker
- Linux networking tools (`ss`, `netstat`, `nc`, `curl`)
- UFW
- firewalld
- iptables
- SELinux

## Sources Consulted
- Portainer Documentation, "Install Portainer Agent on Docker Standalone" - https://docs.portainer.io/admin/environments/add/docker/agent
- Portainer Documentation, "Updating on Docker Standalone" - https://docs.portainer.io/start/upgrade/docker
- Portainer Documentation, "My host is using SELinux. Can I use Portainer?" - https://docs.portainer.io/sts/faqs/installing/my-host-is-using-selinux.-can-i-use-portainer
- Portainer official agent repository README - https://github.com/portainer/agent
- Docker Docs, `docker container ls` - https://docs.docker.com/reference/cli/docker/container/ls/
- Docker Docs, `docker container logs` - https://docs.docker.com/reference/cli/docker/container/logs/
- Docker Docs, `docker inspect` - https://docs.docker.com/reference/cli/docker/inspect/
- Docker Docs, container restart policies - https://docs.docker.com/engine/containers/start-containers-automatically/
- Docker Docs, running containers and `--privileged` - https://docs.docker.com/engine/containers/run/
- Ubuntu Server documentation, UFW firewall syntax - https://documentation.ubuntu.com/server/how-to/security/firewalls/
- firewalld manual, `firewall-cmd` - https://firewalld.org/documentation/man-pages/firewall-cmd.html
- firewalld documentation, rich rule syntax - https://firewalld.org/documentation/zone/options
- Linux `ss(8)` manual page - https://man7.org/linux/man-pages/man8/ss.8.html
- OpenBSD `nc(1)` manual page - https://man.openbsd.org/nc.1
- curl man page - https://curl.se/docs/manpage.html

## Issues Found
- The connectivity check used `curl` against the agent root URL with no documented endpoint or expected status. I changed it to query the agent's documented public `/ping` endpoint over HTTPS and noted the expected `204` response.
- The SELinux section suggested generating a custom policy, switching SELinux to permissive mode, and relabeling `/var/run/docker.sock`. Portainer's current documentation instead states that SELinux-enabled hosts require deploying the agent with `--privileged`, so I replaced that section with the supported deployment guidance.
- The version compatibility section updated the agent with `portainer/agent:latest`, which does not reliably match the Portainer server version. I changed the instructions to inspect the Portainer server image/tag and redeploy the agent with the same tag, and I added the required `AGENT_SECRET` note for installations that use it.

## Review Notes
- Portainer currently documents the standard Portainer Agent as a legacy option and recommends the Edge Agent for many new deployments, especially when direct access to port `9001` is not practical.
- The firewall commands reviewed here are syntactically valid, but the `iptables` example is runtime-only unless the host also saves rules persistently through its distro-specific tooling.
