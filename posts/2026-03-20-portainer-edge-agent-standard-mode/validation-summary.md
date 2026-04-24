# Validation Summary: How to Install Portainer Edge Agent in Standard Mode

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer Edge Agent
- Docker
- PowerShell
- Portainer HTTP API

## Sources Consulted
- Portainer docs: Install Edge Agent Standard on Docker Standalone - https://docs.portainer.io/admin/environments/add/docker/edge
- Portainer docs: The Portainer Edge Agent - https://docs.portainer.io/advanced/edge-agent
- Portainer docs: Install Edge Agent Async on Docker Standalone - https://docs.portainer.io/sts/admin/environments/add/docker/edge-async
- Portainer docs: Add an environment via the Portainer API - https://docs.portainer.io/admin/environments/add/api
- Portainer docs: API documentation - https://docs.portainer.io/api/docs
- Official Portainer source: endpoint creation handler - https://github.com/portainer/portainer/blob/develop/api/http/handler/endpoints/endpoint_create.go
- Official Portainer source: Edge deployment script generator - https://github.com/portainer/portainer/blob/develop/app/react/edge/components/EdgeScriptForm/scripts.ts
- Official Portainer agent source: supported Edge environment variables - https://github.com/portainer/agent/blob/develop/os/options.go
- Official Portainer agent source: Edge mode deployment options - https://github.com/portainer/agent/blob/develop/README.md

## Issues Found
- The post described standard mode as "always-connected" and showed all Edge traffic on port 8000 over WSS. Portainer's standard Edge mode actually polls the Portainer API on port 9443 and opens the port 8000 tunnel only when interactive management is requested. I corrected the description and diagram.
- The API example used a JSON payload for `POST /api/endpoints`, but Portainer's endpoint creation handler expects multipart form data. It also omitted `ContainerEngine=docker`, which would otherwise create a Kubernetes Edge environment instead of a Docker one. I replaced the example with a working multipart `curl` command and captured `EDGE_ID` / `EDGE_KEY` correctly.
- The API section claimed the create call returned a deployment script. Portainer returns environment data such as `EdgeKey` and, depending on settings, `EdgeID`. I updated the example to capture those values for the deployment commands below instead of claiming a script is returned.
- The install commands used `portainer/agent:latest`. Portainer recommends matching the agent version to the Portainer Server version. I updated the Linux examples to derive the server version from `/api/system/status` and changed the ARM / Windows examples to use a matching server version tag.
- The async example used `EDGE_CHECKIN_INTERVAL` and `EDGE_SNAPSHOT_INTERVAL`, which are not current Edge Agent startup environment variables. Async timing is configured in Portainer, while the agent container only needs `EDGE_ASYNC=1` plus the standard Edge variables. I removed the invalid environment variables and added the Business Edition caveat from the docs.
- The Windows example was incomplete. It missed the documented named pipe, Docker volumes bind mount, and data volume mount shape Portainer generates for Windows deployments. I replaced it with the current PowerShell-style command.
- The verification example checked `Status` only for environments that already had `EdgeID`. Portainer exposes Edge association separately from heartbeat. I updated the verification snippet to report both association and heartbeat state for Edge environments.

## Review Notes
- The examples still use `--insecure` because the post demonstrates self-signed certificate scenarios. On trusted TLS deployments, remove `--insecure` and keep `EDGE_INSECURE_POLL=0`.
