# Validation Summary: Best Practices for Edge Device Management with Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer Edge Agent
- Portainer Edge Groups and Alerting
- Docker Engine
- Docker Compose
- Linux `systemd`
- UFW firewall

## Sources Consulted
- Portainer Edge Groups: https://docs.portainer.io/2.27/user/edge/groups
- Install Edge Agent Standard on Docker Standalone: https://docs.portainer.io/admin/environments/add/docker/edge
- The Portainer Edge Agent: https://docs.portainer.io/2.27/advanced/edge-agent
- Updating the Edge Agent: https://docs.portainer.io/start/upgrade/edge
- Updating Portainer: https://docs.portainer.io/start/upgrade
- Portainer Observability: https://docs.portainer.io/user/observability
- Portainer Alerting: https://docs.portainer.io/user/observability/alerting
- Docker Compose services reference (`restart`): https://docs.docker.com/reference/compose-file/services/
- Docker `run` reference (`--restart`): https://docs.docker.com/reference/cli/docker/container/run
- Docker Engine install on Ubuntu: https://docs.docker.com/engine/install/ubuntu/
- UFW man page: https://manpages.ubuntu.com/manpages/jammy/man8/ufw.8.html
- Portainer Agent repository: https://github.com/portainer/agent

## Issues Found
- The UFW example opened SSH from any source even though the comment said "management network only". I changed it to a source-restricted rule using `ufw allow proto tcp from 10.0.0.0/24 to any port 22`.
- The Edge Groups example implied dynamic groups were universally available. I added the missing caveat that dynamic Edge Groups require Edge Compute to be enabled.
- The health-monitoring section referenced enabling heartbeat alerts from "Edge Environments" and listed PagerDuty as a direct notification target. Current Portainer documentation points to Business Edition Observability and Alerting, with the Environment Down rule and notification channels such as email, Slack, Microsoft Teams, and webhook. I updated the steps to match the documented workflow.
- The provisioning script validated arguments after dereferencing `$2` under `set -u`, which would fail before the usage check. I changed it to validate argument count first.
- The provisioning script used a human-friendly `device-id` as `EDGE_ID`, but Portainer documents `EDGE_ID` as the Portainer-generated edge identifier. I updated the usage to `<edge-id> <edge-key>` and renamed the variables accordingly.
- The provisioning script used `systemctl enable docker`, which does not ensure Docker is started on all distributions. I changed it to `systemctl enable --now docker`.
- The provisioning script always set `EDGE_INSECURE_POLL=1`, but Portainer documents this as necessary only when the Portainer server uses a self-signed certificate. I removed the unconditional flag and added a comment explaining when to use it.
- The provisioning script used `portainer/agent:latest`, but Portainer recommends matching the agent version to the Portainer Server version. I changed the example to `portainer/agent:lts` and noted that the tag should match the server release stream/version.

## Review Notes
- Docker documents `https://get.docker.com` as a valid convenience install path, but recommends it primarily for testing, development, or controlled bootstrap workflows rather than fully managed production installs.
- Portainer alerting is documented under Observability and is available only in Portainer Business Edition.
