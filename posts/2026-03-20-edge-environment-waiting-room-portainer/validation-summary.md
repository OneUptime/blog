# Validation Summary: How to Use the Edge Environment Waiting Room in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition
- Portainer Edge Compute and Waiting Room
- Portainer Edge Agent
- Portainer Auto onboarding
- Portainer HTTP API
- Docker CLI
- PowerShell
- Bash
- Python 3

## Sources Consulted
- Portainer docs, Waiting Room: https://docs.portainer.io/user/edge/waiting-room
- Portainer docs, Auto onboarding: https://docs.portainer.io/admin/environments/aeec
- Portainer docs, Install Edge Agent Standard on Docker Standalone: https://docs.portainer.io/admin/environments/add/docker/edge
- Portainer docs, Install Edge Agent Async on Docker Standalone: https://docs.portainer.io/admin/environments/add/docker/edge-async
- Portainer docs, The Portainer Edge Agent: https://docs.portainer.io/advanced/edge-agent
- Portainer docs, API documentation: https://docs.portainer.io/api/docs
- Portainer API spec, Business Edition 2.39.1: https://api-docs.portainer.io/versions/ee/2.39.1.yaml
- Portainer source, generated Edge commands: https://github.com/portainer/portainer/blob/2.39.1/app/react/edge/components/EdgeScriptForm/scripts.ts
- Portainer source, Waiting Room table fields: https://github.com/portainer/portainer/blob/2.39.1/app/react/edge/edge-devices/WaitingRoomView/Datatable/columns.ts
- Portainer source, Waiting Room list query: https://github.com/portainer/portainer/blob/2.39.1/app/react/edge/edge-devices/WaitingRoomView/Datatable/useEnvironments.ts
- Portainer Agent source, supported environment variables: https://github.com/portainer/agent/blob/2.39.1/os/options.go

## Issues Found
- The post was describing generic Edge Agent deployment, not the documented Waiting Room workflow. I corrected the introduction and workflow explanation to match Portainer's Waiting Room behavior: devices connect through Auto onboarding, appear in the Waiting Room, and must be associated before becoming managed environments.
- The Edge communication diagram and explanation were technically wrong. The original draft implied all outbound communication was WSS to port `8000`, but Portainer documents API polling on `9443` and an on-demand TLS tunnel on `8000` for standard mode only. I updated the diagram and text accordingly.
- The deployment-script section used the wrong onboarding model. It created a per-device Edge environment with `POST /api/endpoints`, which is not the documented Waiting Room path. I replaced that with the correct Portainer Business Edition flow: enable Edge Compute and the waiting room, go to **Environment-related** -> **Auto onboarding**, and use the generated pre-deploy script pattern.
- The async install example used unsupported agent variables. `EDGE_ASYNC` is supported, but `EDGE_CHECKIN_INTERVAL` and `EDGE_SNAPSHOT_INTERVAL` are not recognized agent environment variables. I removed them and kept async mode aligned with current Portainer-generated commands.
- The Windows example used an outdated mount pattern. I replaced the short named-pipe `-v` form with the current Portainer-generated Windows containers command using `--mount type=npipe`, the Docker volumes bind mount, and the agent data volume.
- The verification section checked for generic connected Edge environments instead of the Waiting Room. I changed it to list untrusted Edge environments with `edgeDeviceUntrusted=true`, which matches the current Waiting Room query model in Portainer.
- The wording used "approve" where current Portainer UI uses "associate". I updated the description and call to action to use the current UI terminology.

## Review Notes
- The examples pin `portainer/agent:2.39.1` because that matches the current Portainer 2.39.1 LTS documentation and API spec reviewed on May 1, 2026. In practice, keep the agent tag aligned with your Portainer Server release.
- If Portainer uses a self-signed certificate, the Edge Agent examples must use `EDGE_INSECURE_POLL=1`. The post now calls this out.
