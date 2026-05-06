# Validation Summary: How to Configure Async Edge Agent Ping and Snapshot Frequency

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer Edge Agent
- Portainer API
- Docker
- curl
- Python 3

## Sources Consulted
- Portainer docs: Install Edge Agent Async on Docker Standalone — https://docs.portainer.io/admin/environments/add/docker/edge-async
- Portainer docs: Install Edge Agent Standard on Docker Standalone — https://docs.portainer.io/admin/environments/add/docker/edge
- Portainer docs: The Portainer Edge Agent — https://docs.portainer.io/2.27/advanced/edge-agent
- Portainer docs: API documentation — https://docs.portainer.io/api/docs
- Portainer OpenAPI spec (BE 2.39.1) — https://api-docs.portainer.io/versions/ee/2.39.1.yaml
- Portainer docs: Updating the Edge Agent — https://docs.portainer.io/start/upgrade/edge
- Portainer agent source — https://github.com/portainer/agent
- Docker docs: Running containers — https://docs.docker.com/engine/containers/run/
- Docker docs: Storage — https://docs.docker.com/engine/storage/
- Docker docs: Volumes — https://docs.docker.com/engine/storage/volumes/

## Issues Found
1. The post incorrectly implied that all Edge Agent traffic goes outbound to port `8000`. I updated the diagram and explanation to distinguish API traffic on `9443` from the on-demand reverse tunnel on `8000`, and to note that async mode only requires the API port.
2. The post did not mention that async Edge Agent mode is only available in Portainer Business Edition. I added that requirement.
3. The Portainer API example used the wrong request shape for `POST /api/endpoints`, omitted the required `URL` field for an Edge environment, and claimed it generated a deployment script. I replaced it with a form-data example using `EndpointCreationType=4`, `URL`, and `EdgeAsyncMode=true`, and renamed the section to reflect what the API call actually does.
4. The async installation example used unsupported environment variables for interval control (`EDGE_CHECKIN_INTERVAL` and `EDGE_SNAPSHOT_INTERVAL`). I removed them and clarified that ping, snapshot, and command intervals are configured in Portainer, with defaults of once a minute.
5. The install commands used `portainer/agent:latest`, which conflicts with Portainer's guidance to keep the agent version aligned with the Portainer Server version. I replaced those with a matching-version placeholder.
6. The Windows variation omitted the persistent `/data` volume and did not explain that Windows uses the Docker named pipe instead of the Linux socket mounts. I updated that example and noted that async mode also needs `EDGE_ASYNC=1`.

## Review Notes
- If the Portainer Server uses a self-signed certificate, the agent command should include `-e EDGE_INSECURE_POLL=1`.
- Portainer's current documentation expects you to copy the generated install command from the Portainer UI for the target environment. That remains the safest production path because it keeps the command aligned with the server version and environment mode.
