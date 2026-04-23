# Validation Summary: How to Run Edge Agent on ARM Devices

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer Edge Agent
- Portainer API
- Docker Engine
- Docker multi-platform images
- ARM / ARM64 devices
- Windows Docker named-pipe mounts
- Shell scripting
- PowerShell

## Sources Consulted
- Portainer Edge Agent Standard on Docker Standalone documentation: https://docs.portainer.io/admin/environments/add/docker/edge
- Portainer Edge Agent Async on Docker Standalone documentation: https://docs.portainer.io/sts/admin/environments/add/docker/edge-async
- Portainer Edge Agent advanced documentation: https://docs.portainer.io/advanced/edge-agent
- Portainer API access documentation: https://docs.portainer.io/api/access
- Portainer API documentation index: https://docs.portainer.io/api/docs
- Portainer 2.39.1 endpoint creation source: https://github.com/portainer/portainer/blob/2.39.1/api/http/handler/endpoints/endpoint_create.go
- Portainer 2.39.1 Edge Agent command generation source: https://github.com/portainer/portainer/blob/2.39.1/app/react/edge/components/EdgeScriptForm/scripts.ts
- Portainer Agent 2.39.1 option parsing source: https://github.com/portainer/agent/blob/2.39.1/os/options.go
- Portainer Agent README: https://github.com/portainer/agent
- Docker `docker run` CLI documentation: https://docs.docker.com/reference/cli/docker/container/run/
- Docker multi-platform image documentation: https://docs.docker.com/build/building/multi-platform/

## Issues Found
- The Edge Agent communication explanation said all outbound traffic went to port 8000 over WSS. Portainer documents API polling on the UI/API port, usually 9443, and a separate standard-mode tunnel on port 8000. The diagram and explanation were corrected, including the async-mode note that only the UI/API port is required.
- The API example used a JSON body for `POST /api/endpoints`, but Portainer's endpoint creation handler expects `multipart/form-data`. The example now uses `curl -F` form fields.
- The API example omitted fields required to create a Docker Edge environment accurately. It now includes `URL=https://portainer.example.com:9443` and `ContainerEngine=docker`, then exports `EDGE_KEY` and `EDGE_ID` from the response.
- The API authentication example used username/password JWT flow. Current Portainer API documentation recommends API access tokens in the `X-API-Key` header, so the examples now use `PORTAINER_API_KEY`.
- The Docker commands used `portainer/agent:latest`. Portainer documentation recommends matching agent and server versions, so the examples now use `portainer/agent:lts` as the stable LTS example tag.
- The async command used `EDGE_CHECKIN_INTERVAL` and `EDGE_SNAPSHOT_INTERVAL`, which are not current Portainer Agent environment options. These were removed; async intervals are configured in Portainer and delivered by the server.
- The Windows command used a Unix-style pipe volume mount. It was corrected to the Portainer-generated Windows `--mount type=npipe` syntax and the expected Windows volume mounts.
- The verification command used `Status == 1`, which can be misleading for Edge connectivity. It now checks the Edge `Heartbeat` field returned by Portainer.

## Review Notes
- Async Edge Agent mode is documented as a Portainer Business Edition feature.
- `EDGE_INSECURE_POLL=0` assumes the Portainer Server certificate is trusted by the agent. Use `EDGE_INSECURE_POLL=1` only when connecting to a self-signed Portainer certificate.
- For STS or pinned Portainer deployments, replace `portainer/agent:lts` with the agent tag that matches the Portainer Server version.
