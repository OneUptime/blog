# Validation Summary: How to Pre-Stage Edge Agents with Join Tokens - Agents

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer Edge Agent
- Portainer API
- Docker
- Shell scripting (Bash and PowerShell)

## Sources Consulted
- Portainer Edge Agent: https://docs.portainer.io/advanced/edge-agent
- Install Edge Agent Standard on Docker Standalone: https://docs.portainer.io/admin/environments/add/docker/edge
- Install Edge Agent Async on Docker Standalone: https://docs.portainer.io/admin/environments/add/docker/edge-async
- Add an environment via the Portainer API: https://docs.portainer.io/admin/environments/add/api
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer authentication handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/auth/authenticate.go
- Portainer endpoint creation handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/endpoints/endpoint_create.go
- Portainer Edge script generator: https://github.com/portainer/portainer/blob/develop/app/react/edge/components/EdgeScriptForm/scripts.ts
- Portainer 2.39.1 release: https://github.com/portainer/portainer/releases/tag/2.39.1

## Issues Found
- The networking explanation said all Edge Agent traffic goes outbound on port 8000. I corrected this to reflect Portainer's documented behavior: the agent polls the Portainer API over HTTPS on port 9443 and standard mode opens an on-demand tunnel on port 8000.
- The `POST /api/endpoints` example used a JSON body and omitted required edge-environment fields. I changed it to multipart form data, added the Portainer URL and `ContainerEngine=docker`, and extracted `EDGE_KEY` plus a usable `EDGE_ID` from the response.
- The text said the create-environment API call returned a deployment script. I corrected this to retrieving the join token details returned by the API.
- The installation commands used `portainer/agent:latest`. I replaced `latest` with `2.39.1` and noted that the agent tag should match the Portainer Server version.
- The async example used `EDGE_CHECKIN_INTERVAL` and `EDGE_SNAPSHOT_INTERVAL`, which are not current Edge Agent container environment variables. I removed them and kept the supported `EDGE_ASYNC=1` deployment pattern.
- The async section did not mention that Edge Agent Async mode is only available in Portainer Business Edition. I added that constraint.
- The Windows example used a Linux-style volume mount and Bash line continuation syntax. I replaced it with the current PowerShell `--mount` syntax Portainer generates for Windows deployments.
- The verification example treated `Status` as the edge connectivity signal. I updated it to use `Heartbeat`, which is the field Portainer computes for Edge environment check-in state.

## Review Notes
- If the Portainer Server is configured with `AGENT_SECRET`, the same `AGENT_SECRET` must also be passed to the Edge Agent deployment command; the post assumes the default case where no custom agent secret is configured.
- When `EnforceEdgeID` is disabled, Portainer can associate the first agent-provided Edge ID at first check-in; when it is enabled, use the Portainer-generated `EdgeID`.
- For long-term accuracy, the safest deployment practice is to match the agent image tag to the exact Portainer Server release rather than using `latest`.
