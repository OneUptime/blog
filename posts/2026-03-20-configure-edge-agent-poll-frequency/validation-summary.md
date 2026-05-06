# Validation Summary: How to Configure Edge Agent Poll Frequency

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer Edge Agent
- Portainer HTTP API
- Docker
- PowerShell
- `curl`
- `python3`

## Sources Consulted
- Portainer Edge Agent overview: https://docs.portainer.io/2.27/advanced/edge-agent
- Install Edge Agent Standard on Docker Standalone: https://docs.portainer.io/admin/environments/add/docker/edge
- Install Edge Agent Async on Docker Standalone: https://docs.portainer.io/sts/admin/environments/add/docker/edge-async
- Portainer Edge Compute settings: https://docs.portainer.io/admin/settings/edge
- Portainer API documentation landing page: https://docs.portainer.io/api/docs
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Updating the Edge Agent: https://docs.portainer.io/start/upgrade/edge
- Portainer CE API schema 2.39.1: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer BE API schema 2.39.1: https://api-docs.portainer.io/versions/ee/2.39.1.yaml
- Portainer Agent README: https://github.com/portainer/agent/blob/develop/README.md
- Portainer Edge script generator: https://github.com/portainer/portainer/blob/develop/app/react/edge/components/EdgeScriptForm/scripts.ts
- Portainer endpoint creation handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/endpoints/endpoint_create.go
- Portainer endpoint heartbeat handling: https://github.com/portainer/portainer/blob/develop/api/internal/endpointutils/endpointutils.go
- Local CLI help checked in the review environment: `docker run --help`, `curl --help all`

## Issues Found
- The architecture diagram and explanation said the Edge Agent connected outbound on port `8000` using WSS. I corrected this to Portainer’s current model: the agent polls the Portainer API over `9443`, and standard mode opens an on-demand tunnel on `8000`; async mode only requires the UI/API port.
- The API example for creating an Edge environment used JSON with only `Name`, `EndpointCreationType`, and `EdgeCheckinInterval`. I replaced it with a multipart form request aligned with Portainer’s API and source, including the Docker container engine, Portainer URL, and extraction of the returned `EdgeKey`.
- The “deployment script” section did not actually produce deployment values for the later `docker run` commands. I changed it to generate an `EDGE_ID` locally and capture the `EdgeKey` returned by Portainer so the later examples have valid inputs.
- The async installation example used `EDGE_CHECKIN_INTERVAL` and `EDGE_SNAPSHOT_INTERVAL`, which are not current Edge Agent environment variables. I removed them and kept `EDGE_ASYNC=1`, noting that async Ping, Snapshot, and Command intervals are configured on the Portainer environment.
- The Windows example used a Linux-style bind syntax for the Docker named pipe and omitted the current mount layout Portainer generates. I replaced it with the PowerShell command structure Portainer currently emits for Windows Docker Standalone.
- The verification example treated `Status == 1` as the correct online check for Edge environments. I updated it to use Portainer’s computed `Heartbeat` and `LastCheckInDate`, which better reflect recent Edge check-ins.
- The image references used `portainer/agent:latest`. I changed them to `portainer/agent:<matching-portainer-server-version>` because Portainer’s documentation recommends matching Edge Agent and Portainer Server versions.

## Review Notes
- Edge Agent Async mode is available only in Portainer Business Edition.
- If async per-environment intervals are not set, Portainer falls back to the global Edge Compute Ping, Snapshot, and Command interval settings.
