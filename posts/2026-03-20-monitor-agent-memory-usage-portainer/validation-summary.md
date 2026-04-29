# Validation Summary: How to Monitor Agent Memory Usage in Portainer

## Status
validated

## Post Type
Tutorial / Operational Guide

## Technologies Covered
- Portainer (Server and Agent)
- Docker
- Linux networking tools (ss, netstat, nc, curl)
- UFW, firewalld, iptables
- SELinux (ausearch, audit2allow, semodule, setenforce, chcon)
- Python 3 (for JSON parsing of API response)

## Sources Consulted
- Portainer Agent installation and connectivity docs: https://docs.portainer.io/admin/environments/add/docker/agent
- Portainer Server default ports (9000/9443): https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer API status endpoint (`/api/status` returning Version): https://docs.portainer.io/api/access
- Docker CLI reference (ps, logs, inspect, run): https://docs.docker.com/reference/cli/docker/
- ufw / firewalld / iptables manual pages
- SELinux container labelling notes (svirt_sandbox_file_t legacy alias / container_file_t)

## Issues Found
No technical issues found. All commands, ports, flags, and API references verified:
- Port 9001/TCP for the Portainer Agent is correct.
- Port 9443 for the Portainer Server HTTPS endpoint is correct.
- `/api/status` endpoint with `Version` JSON key is valid for the Portainer API.
- UFW, firewalld rich-rule, and iptables syntax are all correct.
- `audit2allow` / `semodule` / `setenforce` / `chcon` invocations are syntactically correct.
- Docker run flags for the agent (`-p 9001:9001`, the docker socket bind, the volumes bind, `--restart=always`) match Portainer's documented agent install command.
- The Python 3 one-liner correctly parses JSON from stdin and uses an f-string.

## Review Notes
- The post title refers to "memory usage" monitoring, but the body content is about agent connectivity and version troubleshooting. The technical content is accurate; the title/content mismatch is editorial and out of scope for technical correction per the review instructions.
- The SELinux type `svirt_sandbox_file_t` is the legacy label. On modern container-selinux (RHEL 8+/CentOS 8+), the canonical type is `container_file_t`. The legacy label is generally still aliased and accepted, so the command remains functional, but readers on newer systems may prefer `container_file_t`.
- Pinning `portainer/agent:latest` is convenient but not best practice in production; matching the major version of the Portainer Server (e.g., `portainer/agent:2.x.y`) avoids agent/server protocol mismatches. The post advises matching versions but uses the `latest` tag in the example command.
- `docker container rm` is fine, though many examples use `docker rm` (equivalent shorthand).
