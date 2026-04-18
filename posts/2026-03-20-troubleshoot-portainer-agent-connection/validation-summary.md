# Validation Summary: How to Troubleshoot Portainer Agent Connection Issues - Troubleshoot

## Status
validated

## Post Type
Troubleshooting guide / Tutorial

## Technologies Covered
- Portainer Agent / Portainer Server (Portainer CE 2.x)
- Docker (CLI, socket, volumes)
- Linux networking utilities (`ss`, `netstat`, `nc`, `curl`)
- Firewalls: UFW, firewalld (rich rules), iptables
- SELinux (ausearch, audit2allow, semodule, chcon, setenforce)
- Portainer REST API (`/api/status` endpoint)

## Sources Consulted
- Portainer official docs: https://docs.portainer.io/admin/environments/add/docker-standalone
- Portainer Agent deployment reference (portainer/agent Docker Hub)
- Portainer API reference (`/api/status` endpoint)
- Red Hat container-selinux policy / `man container_selinux` (for `container_file_t` vs. deprecated `svirt_sandbox_file_t`)
- Red Hat SELinux User's Guide (audit2allow workflow)
- UFW, firewalld, iptables, ss, nc man pages

## Issues Found
1. **Direction of communication misstated.** The original said "The Portainer Agent communicates with the Portainer server on TCP port 9001." The agent actually *listens* on 9001; the Portainer server initiates outbound connections to the agent. Changed to "The Portainer Agent listens on TCP port 9001 for connections from the Portainer server." for accuracy.
2. **Deprecated SELinux type.** `svirt_sandbox_file_t` is the legacy label; Red Hat's container-selinux policy (RHEL 7.4+/8/9) replaced it with `container_file_t` (kept as an alias but discouraged). Updated `chcon -Rt svirt_sandbox_file_t /var/run/docker.sock` to use `container_file_t`.
3. **Missing recommended volume mount.** The Portainer Agent 2.x docker run reference includes `-v /:/host` so Portainer can access host files/metrics (required for several UI features to function properly). Added this mount to the update command.

## Review Notes
- `chcon -R` on a single file (the docker socket) is harmless but the `-R` flag has no effect; left as-is since it matches common SELinux troubleshooting snippets and does no harm.
- `setenforce 0` is useful for diagnosis but should not be recommended as a permanent fix; the post already frames it as "temporarily disable enforcement for testing", which is appropriate.
- The `audit2allow` workflow generates a `.te` file alongside the `.pp`; reviewers should inspect `.te` output before loading the module (not called out explicitly, but commonly known).
- Pinning to `portainer/agent:latest` pulls the newest tag; for production, matching a specific server version (e.g., `portainer/agent:2.21.5`) is safer — the post already advises "Update agent to match server version" so the intent is correct.
- The `curl -k https://<agent-host-ip>:9001` test will produce TLS output since the agent uses a self-signed cert by default; `-k` (insecure) is appropriate here.
