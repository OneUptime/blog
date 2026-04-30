# Validation Summary: How to Fix SELinux Issues with Portainer Agent

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Agent
- Portainer Server API
- SELinux
- Docker
- Linux firewall tooling (`ufw`, `firewalld`, `iptables`)

## Sources Consulted
- Portainer documentation: Install Portainer Agent on Docker Standalone — https://docs.portainer.io/admin/environments/add/docker/agent
- Portainer documentation: My host is using SELinux. Can I use Portainer? — https://docs.portainer.io/sts/faqs/installing/my-host-is-using-selinux.-can-i-use-portainer
- Portainer documentation: Updating on Docker Standalone — https://docs.portainer.io/start/upgrade/docker
- Portainer documentation: API documentation — https://docs.portainer.io/api/docs
- Portainer official source: agent README and ping handler — https://github.com/portainer/agent
- Portainer official source: system status handler and status model — https://github.com/portainer/portainer
- Docker documentation: Bind mounts and SELinux labeling — https://docs.docker.com/engine/storage/bind-mounts/
- Docker documentation: Running containers (`--privileged`) — https://docs.docker.com/engine/containers/run/
- firewalld rich language manual — https://firewalld.org/documentation/man-pages/firewalld.richlanguage
- Ubuntu Server firewall documentation / UFW syntax — https://ubuntu.com/server/docs/how-to/security/firewalls/
- Portainer Docker Hub tags for `portainer/agent` — https://hub.docker.com/r/portainer/agent/tags

## Issues Found
- The SELinux section recommended generating a custom SELinux policy and relabeling `/var/run/docker.sock` with `chcon`. Portainer’s current official guidance for SELinux-enabled Docker hosts is to run the Portainer Agent with `--privileged`, so the section was corrected to redeploy the agent in privileged mode instead.
- The HTTPS connectivity test used the agent root URL with a vague expected result. The post was updated to use the agent’s documented `/ping` endpoint over HTTPS and to expect HTTP `204`, matching the agent’s official ping handler.
- The Portainer server version check used the deprecated `/api/status` endpoint. This was updated to `/api/system/status`, which is the current public status endpoint in Portainer’s official source.
- The upgrade example pulled and ran `portainer/agent:latest`, which does not guarantee a match with the Portainer server version. The commands were updated to retrieve the server version first and then pull and run the matching `portainer/agent:$SERVER_VERSION` image.
- Because this post is specifically about SELinux-enabled hosts, the agent redeploy and update commands were updated to include `--privileged`; otherwise the recreated container can hit the same SELinux access problem again.

## Review Notes
- Portainer’s current documentation describes the Docker Standalone Agent as a legacy option and recommends the Edge Agent for most new deployments when its feature set is sufficient.
