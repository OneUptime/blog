# Validation Summary: How to Set Up Automatic Edge Environment Onboarding in Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer Business Edition
- Portainer Edge Agent
- Portainer HTTP API
- Docker
- PowerShell
- Python

## Sources Consulted
- Portainer docs: Install Edge Agent Standard on Docker Standalone: https://docs.portainer.io/admin/environments/add/docker/edge
- Portainer docs: Install Edge Agent Async on Docker Standalone: https://docs.portainer.io/admin/environments/add/docker/edge-async
- Portainer docs: Auto onboarding: https://docs.portainer.io/admin/environments/aeec
- Portainer docs: Updating the Edge Agent: https://docs.portainer.io/start/upgrade/edge
- Portainer docs: API documentation: https://docs.portainer.io/api/docs
- Portainer API schema for environments: https://api-docs.portainer.io/versions/ee/2.39.2/endpoints.yaml
- Portainer docs source for Edge Agent Standard: https://raw.githubusercontent.com/portainer/portainer-docs/2.39/admin/environments/add/docker/edge.md
- Portainer docs source for Edge Agent Async: https://raw.githubusercontent.com/portainer/portainer-docs/2.39/admin/environments/add/docker/edge-async.md
- Portainer docs source for Auto onboarding: https://raw.githubusercontent.com/portainer/portainer-docs/2.39/admin/environments/aeec.md
- Portainer source: Edge script generation templates: https://github.com/portainer/portainer/blob/develop/app/react/edge/components/EdgeScriptForm/scripts.ts
- Portainer source: endpoint creation handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/endpoints/endpoint_create.go
- Portainer source: Edge key generation: https://github.com/portainer/portainer/blob/develop/api/chisel/key.go
- Portainer Agent source: supported edge env vars: https://github.com/portainer/agent/blob/develop/os/options.go

## Issues Found
- The networking explanation was incorrect. The post said all Edge Agent traffic was outbound WSS on port 8000. I corrected this to match Portainer’s docs: the agent polls the Portainer API over the UI port, typically 9443, and standard mode opens an outbound TLS tunnel on port 8000 only when interactive management is required.
- The API onboarding example was incorrect. It used a JSON body for `POST /api/endpoints`, omitted required Edge environment fields, and claimed the response returned a deployment script. I changed it to the documented `multipart/form-data` request, added `ContainerEngine` and `URL`, and updated the example to extract `EdgeID` and `EdgeKey` from the response instead.
- The Linux deployment examples used `portainer/agent:latest`. I replaced that with `portainer/agent:2.39.2` and added a note that the agent version should match the Portainer Server version.
- The async deployment example used unsupported agent environment variables for interval tuning. I removed `EDGE_CHECKIN_INTERVAL` and `EDGE_SNAPSHOT_INTERVAL` and clarified that async Ping, Snapshot, and Command intervals are configured in Portainer when the async environment is created.
- The Windows deployment example was incomplete. It only mounted the Docker named pipe and omitted the current bind and data mounts used by Portainer’s generated Windows standalone command. I replaced it with the current PowerShell-compatible command pattern from Portainer’s script generator.
- The verification example checked the endpoint `Status` field to determine whether an Edge environment was online. That is not the right signal for Edge check-ins. I replaced it with `Heartbeat` and `LastCheckInDate`, which reflect recent Edge Agent communication.

## Review Notes
The post is now technically correct against Portainer’s current 2.39 LTS documentation and source as of 2026-05-07. The command examples are pinned to `2.39.2`; if the Portainer Server is on a different version, the agent image tag should be updated to match it. Portainer’s official automatic onboarding flow is primarily UI-driven via the Auto onboarding page, while the API example in the post now accurately covers pre-staging an Edge environment and retrieving its credentials.
