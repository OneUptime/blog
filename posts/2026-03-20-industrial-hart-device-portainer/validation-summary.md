# Validation Summary: How to Manage Industrial HART Device Data with Portainer - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer Business Edition
- Portainer Edge Agent
- Portainer Edge Stacks
- Portainer Edge Groups
- Portainer Edge Jobs
- Docker Engine
- Docker Compose
- Prometheus node_exporter
- Redis
- HART device data at the deployment/operations layer

## Sources Consulted
- Portainer Docs: Install Edge Agent Standard on Docker Standalone — https://docs.portainer.io/admin/environments/add/docker/edge
- Portainer Docs: The Portainer Edge Agent — https://docs.portainer.io/advanced/edge-agent
- Portainer Docs: Add a new Edge Stack — https://docs.portainer.io/user/edge/stacks/add
- Portainer Docs: Edge Stacks — https://docs.portainer.io/user/edge/stacks
- Portainer Docs: Edge Jobs — https://docs.portainer.io/user/edge/jobs
- Portainer Docs: Updating the Edge Agent — https://docs.portainer.io/start/upgrade/edge
- Portainer Docs: How does Portainer secure connectivity to and from Agents and Edge Agents? — https://docs.portainer.io/faqs/getting-started/how-does-portainer-secure-connectivity-to-and-from-agents-and-edge-agents
- Docker Docs: Set, use, and manage variables in a Compose file with interpolation — https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/
- Docker Docs: Version and name top-level elements — https://docs.docker.com/reference/compose-file/version-and-name/
- Prometheus node_exporter README — https://github.com/prometheus/node_exporter/blob/master/README.md?plain=1

## Issues Found
- The Portainer edge-agent setup flow and sample `docker run` command were incomplete for current Portainer docs. I updated the UI path to `Docker Standalone` + `Edge Agent Standard`, switched the text to copying the generated command, and fixed the sample command to include `EDGE_ID`, the `/:/host` and `portainer_agent_data:/data` mounts, and `portainer/agent:lts`. I also clarified that `EDGE_INSECURE_POLL=1` is only needed for self-signed certificates.
- The prerequisites and architecture section implied only port `8000` mattered. Current Portainer docs require the Portainer Server UI/API port (`9443` by default) and the tunnel port (`8000`) to be reachable from edge devices, so I corrected both sections.
- The stack used `DEVICE_ID=${HOSTNAME}`, which relies on Compose interpolation from the execution environment and is not a reliable way to identify edge devices in this scenario. I changed it to `DEVICE_ID=${PORTAINER_EDGE_ID}` to align with Portainer Edge Stack environment support.
- The Compose example used the top-level `version` field, which Docker now treats as obsolete. I removed it.
- The `node-exporter` service did not match the current official container guidance for monitoring the host. I replaced it with the documented host-monitoring pattern using `quay.io/prometheus/node-exporter:latest`, `network_mode: host`, `pid: host`, a root filesystem bind mount, and `--path.rootfs=/host`.
- The offline cache example referenced `cache-data` without defining that named volume in the Compose file. I added `cache-data:` under `volumes`.
- The Edge Jobs/update/security notes were too broad. I narrowed Edge Jobs to the currently supported beta scope, clarified that Edge Stack updates follow rollout settings as agents poll in, and changed the security guidance to trusted TLS endpoints plus the unique Edge ID and `EDGE_KEY` per device.

## Review Notes
- Docker's `get.docker.com` convenience script is valid and documented by Docker, but distro-specific package installation and version pinning may be preferable for tightly controlled industrial production images.
- `portainer/agent:lts` matches current Portainer LTS documentation, but Portainer also documents that agent versions should match the Portainer Server version.
- The post is technically relevant and now accurate as a Portainer edge-deployment guide, but it remains largely deployment-focused rather than covering HART protocol parsing or transport specifics.
