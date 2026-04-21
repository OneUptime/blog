# Validation Summary: How to Troubleshoot Edge Agent Connection Issues - Agent

## Status
validated

## Post Type
Troubleshooting guide / tutorial

## Technologies Covered
- Portainer Edge Agent
- Portainer API
- Docker
- Windows Containers / Windows Container Service
- Mermaid diagrams
- Bash and PowerShell command examples

## Sources Consulted
- Portainer Edge Agent documentation: https://docs.portainer.io/advanced/edge-agent
- Portainer Edge Agent Standard on Docker Standalone documentation: https://docs.portainer.io/admin/environments/add/docker/edge
- Portainer Edge Agent Async on Docker Standalone documentation: https://docs.portainer.io/sts/admin/environments/add/docker/edge-async
- Portainer troubleshooting documentation for Edge Agent connection issues: https://docs.portainer.io/faqs/troubleshooting/agents-and-environment-management/troubleshooting-edge-agent-connection-issues
- Portainer API documentation: https://docs.portainer.io/api/docs and https://api-docs.portainer.io/?edition=ee&version=2.39.1
- Portainer Agent source documentation and option parsing: https://github.com/portainer/agent
- Portainer Edge script generation source: https://github.com/portainer/portainer
- Docker Hub Portainer Agent image metadata: https://hub.docker.com/r/portainer/agent/tags

## Issues Found
- The Edge Agent communication diagram and explanation claimed all outbound traffic used WSS on port 8000. Updated it to show HTTPS API polling on port 9443, the standard-mode TLS reverse tunnel on port 8000, and that async mode does not use the tunnel.
- The API environment creation example used JSON with `Content-Type: application/json`, but Portainer's `/api/endpoints` create endpoint expects `multipart/form-data`. Replaced the JSON body with `curl -F` form fields.
- The API example omitted required/important Edge Docker environment fields. Added `ContainerEngine=docker`, `URL=https://portainer.example.com:9443`, and `EdgeTunnelServerAddress=portainer.example.com:8000`.
- The API example said it generated a deployment script, but it only creates an environment. Renamed the section and changed the example to print `EDGE_ID` and `EDGE_KEY` values for the deployment commands.
- The async Docker command used `EDGE_CHECKIN_INTERVAL` and `EDGE_SNAPSHOT_INTERVAL`, which are not Portainer Agent environment variables. Removed them and clarified that async ping, snapshot, and command intervals are configured by Portainer.
- The async Docker command did not mention that async mode requires an Edge Agent Async environment and is a Portainer Business Edition feature. Added a short comment with the API flag needed for async environment creation.
- The Windows command used a Linux-style bind mount for the Docker named pipe and omitted Portainer's expected Windows volume mounts. Updated it to PowerShell syntax using the Portainer-generated `type=npipe`, Docker volumes bind mount, and `C:\data` agent data volume.

## Review Notes
- `portainer/agent:latest` is valid, but production guides may prefer a pinned Portainer Agent version to avoid unexpected upgrades.
- `EDGE_INSECURE_POLL=1` is required when the Portainer Server uses a self-signed certificate; the examples keep `EDGE_INSECURE_POLL=0` for a trusted certificate setup.
