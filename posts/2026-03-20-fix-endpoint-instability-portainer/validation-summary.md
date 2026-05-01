# Validation Summary: How to Fix Endpoint Instability in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer Agent
- Docker
- systemd (`systemctl`, `journalctl`)
- Linux networking (`ping`, MTU/path MTU)

## Sources Consulted
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer general settings: https://docs.portainer.io/admin/settings/general
- Portainer installation on Docker Standalone: https://docs.portainer.io/2.33-lts/start/install-ce/server/docker/linux
- Portainer update guide for Docker Standalone: https://docs.portainer.io/start/upgrade/docker
- Portainer Agent installation on Docker Standalone: https://docs.portainer.io/admin/environments/add/docker/agent
- Portainer FAQ on retrieving Portainer logs: https://docs.portainer.io/faqs/troubleshooting/logs-errors-and-debugging/how-can-i-get-the-logs-for-portainer-itself
- Portainer troubleshooting for agent communication and MTU issues on Swarm: https://docs.portainer.io/faqs/troubleshooting/agents-and-environment-management/why-cant-my-agents-communicate-with-portainer-on-swarm
- Portainer troubleshooting for connection reset and related connectivity failures: https://docs.portainer.io/2.33-lts/faqs/troubleshooting/agents-and-environment-management/troubleshooting-edge-agent-connection-issues
- Docker CLI reference for `docker run`: https://docs.docker.com/reference/cli/docker/container/run
- Docker CLI reference for `docker logs`: https://docs.docker.com/reference/cli/docker/container/logs/
- Docker CLI reference for `docker stats`: https://docs.docker.com/reference/cli/docker/container/stats/
- Linux `ping(8)` manual page: https://man7.org/linux/man-pages/man8/ping.8.html
- Local command help on the review host: `systemctl --help`, `journalctl --help`, `ping -h`

## Issues Found
- The post said Portainer polls endpoints every `--snapshot-interval` seconds with a default of `60s`. Current Portainer documentation defines `--snapshot-interval` as a duration string and documents a default of `5m`. I corrected the explanation to match the current behavior and terminology.
- The Step 1 log command searched for `endpoint`, which is not the current Portainer terminology in the relevant docs and logs. I updated it to search for `environment` and adjusted the example error descriptions to match current Portainer wording more closely.
- The Step 3 `docker run` example would not work as written. It used `--snapshot-interval 300` even though Portainer expects a duration such as `10m`, used the unsupported `latest` tag instead of the documented LTS channel example, exposed only legacy HTTP port `9000`, and omitted stopping/removing the existing `portainer` container before recreating it. I corrected all of those points.
- The network section overstated behavior by using a fixed `1%` packet-loss threshold and saying MTU mismatches cause TCP connections to hang silently. I changed this to more accurate language: any persistent packet loss is worth investigating, and MTU mismatches can black-hole packets and stall connections.
- The Step 5 guidance referenced a specific `"error processing snapshot"` agent log pattern that is not supported by the current documentation I checked. I replaced it with broader connection-error patterns (`error`, `timeout`, `reset`, `tls`) and adjusted the explanation accordingly.
- The Step 6 upgrade section recommended `portainer/agent:latest` and did not provide a working redeploy command. Current Portainer guidance requires keeping the agent version aligned with the Portainer Server version. I replaced this with a stop/remove/pull/redeploy example using `:lts` as the documented example channel and noted the `AGENT_SECRET` requirement.

## Review Notes
- The guide assumes a Linux host with systemd and the GNU/Linux `ping` implementation. Commands such as `systemctl`, `journalctl`, `top -b`, and `ping -M do` are not portable to non-systemd Linux distributions, macOS, or Windows without adjustment.
- The Portainer examples are now aligned with current Docker Standalone and Portainer CE LTS documentation. If a deployment uses Portainer BE, STS, or an exact pinned version, the image tag should match that edition/channel/version across both the Portainer Server and the agent.
- Docker was not installed in the local review environment, so Docker commands were validated against official Portainer and Docker documentation rather than executed locally.
