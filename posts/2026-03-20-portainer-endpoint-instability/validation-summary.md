# Validation Summary: How to Fix Endpoint Instability in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer Agent
- Portainer HTTP API
- Docker Engine
- Docker CLI
- Linux system administration tools

## Sources Consulted
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer general settings: https://docs.portainer.io/admin/settings/general
- Install Portainer CE with Docker on Linux: https://docs.portainer.io/sts/start/install-ce/server/docker/linux
- Updating on Docker Standalone: https://docs.portainer.io/start/upgrade/docker
- Install Portainer Agent on Docker Standalone: https://docs.portainer.io/admin/environments/add/docker/agent
- Add an environment via the Portainer API: https://docs.portainer.io/admin/environments/add/api
- How does Portainer secure connectivity to and from Agents and Edge Agents?: https://docs.portainer.io/faqs/getting-started/how-does-portainer-secure-connectivity-to-and-from-agents-and-edge-agents
- Docker `stats` reference: https://docs.docker.com/reference/cli/docker/container/stats/
- Docker `events` reference: https://docs.docker.com/reference/cli/docker/system/events/
- Portainer source for endpoint status values: https://github.com/portainer/portainer/blob/develop/api/portainer.go

## Issues Found
- The `docker stats --no-stream | sort -k 4 -hr` example was incorrect because the default `docker stats` table output does not sort cleanly by memory usage that way. I replaced it with an official `--format` example that reliably shows CPU and memory fields.
- The `--snapshot-interval=120` example was incorrect. Portainer documents `--snapshot-interval` as a Go duration string such as `30s`, `5m`, or `1h`, and the documented default is `5m`, not `60s`. I corrected the example to `--snapshot-interval=10m` and fixed the default-value note.
- The Agent troubleshooting section incorrectly focused on Docker health check parameters and used an `nc`-based health check that is not a Portainer-documented fix for agent instability. I replaced this with log-based troubleshooting and the required `AGENT_SECRET` guidance from Portainer's agent documentation.
- The UI guidance in Step 7 was inaccurate. Snapshot interval is not configured per environment under `Environments -> Edit -> Advanced settings`; it is configured globally under `Settings -> General`. I corrected the path and wording.
- The DNS guidance incorrectly said to always use a hostname and not an IP address. Portainer's Agent environment documentation explicitly allows either a DNS name or an IP address. I changed this to prefer a stable hostname only when the address may change.
- The monitoring script assumed legacy HTTP on port `9000`. Current Portainer documentation uses HTTPS on `9443` by default. I updated the example to use `https://localhost:9443` and `curl -k` for the default self-signed certificate case.
- Minor command/explanatory inaccuracies were corrected, including the "continuous" ping comment on a bounded `ping -c 100` command, the `traceroute` note, the inotify limit wording, and the `docker restart <container-id>` placeholder text.

## Review Notes
- Portainer renamed "endpoints" to "environments" in the UI in version 2.10, but the API still uses `/api/endpoints`, so the post's API examples remain valid.
- Portainer currently describes the standard Agent on Docker Standalone as a legacy option and recommends the Edge Agent for most new deployments. This does not make the post incorrect, but it is a useful future-context note.
- Portainer documentation recommends matching the Agent version to the Portainer Server version and commonly uses `:lts` or explicit version tags. The post's `:latest` examples are syntactically valid, but version pinning would be safer in a future revision.
