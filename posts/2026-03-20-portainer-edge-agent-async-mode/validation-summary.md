# Validation Summary: How to Install Portainer Edge Agent in Async Mode

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer Edge Agent
- Docker
- Bash
- PowerShell

## Sources Consulted
- Portainer docs: Install Edge Agent Async on Docker Standalone - https://docs.portainer.io/sts/admin/environments/add/docker/edge-async
- Portainer docs: Install Edge Agent Standard on Docker Standalone - https://docs.portainer.io/admin/environments/add/docker/edge
- Portainer docs: The Portainer Edge Agent - https://docs.portainer.io/advanced/edge-agent
- Portainer docs: Add an environment via the Portainer API - https://docs.portainer.io/admin/environments/add/api
- Portainer docs: API documentation - https://docs.portainer.io/api/docs
- Portainer docs: Updating the Edge Agent - https://docs.portainer.io/start/upgrade/edge
- Portainer official source: Edge agent command generation - https://github.com/portainer/portainer/blob/develop/app/react/edge/components/EdgeScriptForm/scripts.ts
- Portainer official source: Edge agent command snapshots - https://github.com/portainer/portainer/blob/develop/app/react/edge/components/EdgeScriptForm/__snapshots__/scripts.test.ts.snap
- Portainer Agent official source: environment variable parsing - https://github.com/portainer/agent/blob/master/os/options.go
- Portainer Agent official README - https://github.com/portainer/agent/blob/master/README.md

## Issues Found
- The networking explanation described async mode as outbound WSS traffic to port 8000. Portainer documents async mode as polling the Portainer UI/API port, typically 9443, and explicitly says the tunnel port is not required. I updated the diagram and explanation to reflect async polling over HTTPS.
- The "Generate Edge Deployment Script" section used an API example that posted JSON to `/api/endpoints` and implied Portainer would return a deployment script. Portainer's documented API example for environment creation is multipart form data and does not document an Edge Async deployment-script workflow. I replaced this with the supported UI-generated command workflow documented by Portainer.
- The installation examples used `portainer/agent:latest`. Portainer documents that agent versions must match the Portainer Server version. I replaced `latest` with a version placeholder variable and clarified that it must match the server version.
- The async install command included `EDGE_CHECKIN_INTERVAL` and `EDGE_SNAPSHOT_INTERVAL`. These are not documented agent environment variables, and Portainer's generated async deployment commands only add `EDGE_ASYNC=1`. I removed those invalid variables and noted that ping, snapshot, and command intervals are configured in Portainer.
- The Windows example used a Linux-style named-pipe volume mount and omitted the standard Windows volume mounts. I replaced it with the Windows PowerShell form Portainer generates, using `--mount type=npipe` and the documented Windows data mounts.
- The verification example depended on a previously defined `TOKEN` and filtered environments by `EdgeID`. I added the authentication step locally within the section and changed the filter to use Portainer's edge environment types instead.

## Review Notes
- Edge Agent Async mode is a Portainer Business Edition feature.
- Portainer's public docs document async environment creation through the UI-generated command, not a deployment-script API example.
- Async ping, snapshot, and command intervals are Portainer-side settings delivered to the agent during polling rather than extra `docker run` environment variables.
- If the Portainer Server instance was started with a custom `AGENT_SECRET`, Portainer documents that the same `AGENT_SECRET` must also be provided to the Edge Agent deployment.
