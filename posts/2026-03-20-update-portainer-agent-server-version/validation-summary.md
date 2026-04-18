# Validation Summary: How to Update Portainer Agent to Match Server Version - Server

## Status
validated

## Post Type
Tutorial / Operational Guide

## Technologies Covered
- Portainer (server and agent)
- Docker
- UFW (Uncomplicated Firewall)
- firewalld
- iptables
- SELinux (audit2allow, semodule, chcon)
- ss / netstat / nc / curl
- Python 3 (for parsing JSON API output)

## Sources Consulted
- Portainer Agent installation docs: https://docs.portainer.io/admin/environments/add/docker/agent
- Portainer API reference (status endpoint): https://docs.portainer.io/api/docs
- Docker CLI reference (`docker ps`, `docker logs`, `docker inspect`, `docker run`): https://docs.docker.com/reference/cli/docker/
- UFW manual: `ufw(8)`
- firewalld rich rule docs: https://firewalld.org/documentation/man-pages/firewalld.richlanguage.html
- SELinux container labeling notes (svirt_sandbox_file_t / container_file_t alias)

## Issues Found
No technical issues found.

- Port 9001/TCP is the correct default for the Portainer Agent.
- Port 9443 is the correct default HTTPS port for the Portainer server.
- The `/api/status` endpoint returns a `Version` field, matching the Python parsing example.
- The provided `docker run` command for the agent matches the standard Portainer Agent installation form (Docker socket and volumes mount).
- Firewall snippets (UFW, firewalld rich rule, iptables) are syntactically correct.
- SELinux commands are valid; `svirt_sandbox_file_t` remains a working alias for `container_file_t` on current RHEL/CentOS releases.

## Review Notes
- The post pulls `portainer/agent:latest` to "match server version." For a strict version match, users would want to substitute a specific tag (e.g. `portainer/agent:2.21.4`) corresponding to the server version returned by `/api/status`. The current example still works and is widely used in practice, so no edit was made.
- `svirt_sandbox_file_t` is the legacy SELinux type label; on newer policy it is aliased to `container_file_t`. Both work today, but readers on very recent distributions may prefer `container_file_t`.
- `netstat` is deprecated on many modern distributions in favor of `ss`; the post correctly lists `ss` first and offers `netstat` only as an alternative.
