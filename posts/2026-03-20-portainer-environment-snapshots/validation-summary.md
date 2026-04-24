# Validation Summary: How to Configure Environment Snapshots in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer API
- Portainer Edge Agent
- Docker
- `curl`

## Sources Consulted
- Portainer docs: General settings, snapshot interval: https://docs.portainer.io/admin/settings/general
- Portainer docs: Accessing the Portainer API: https://docs.portainer.io/api/access
- Portainer docs: API usage examples: https://docs.portainer.io/api/examples
- Portainer docs: Install Edge Agent Async on Docker Standalone: https://docs.portainer.io/sts/admin/environments/add/docker/edge-async
- Portainer docs: The Portainer Edge Agent: https://docs.portainer.io/advanced/edge-agent
- Portainer source: settings update handler (`SnapshotInterval` request field): https://github.com/portainer/portainer/blob/develop/api/http/handler/settings/settings_update.go
- Portainer source: bulk snapshot endpoint handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/endpoints/endpoint_snapshots.go
- Portainer source: per-environment snapshot endpoint handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/endpoints/endpoint_snapshot.go
- Portainer source: snapshot data models: https://github.com/portainer/portainer/blob/develop/api/portainer.go
- Portainer source: Docker and Kubernetes snapshot collection: https://github.com/portainer/portainer/blob/develop/pkg/snapshot/docker.go
- Portainer Agent source: documented Edge Agent environment variables: https://github.com/portainer/agent/blob/develop/README.md

## Issues Found
- The post used an incorrect API endpoint for triggering snapshots on all environments. I changed `POST /api/snapshots` to `POST /api/endpoints/snapshot` to match Portainer's current handler and router.
- The snapshot contents section overstated what Portainer stores. I removed claims about per-container resource usage and Swarm service configurations, and rewrote the bullets to match the current snapshot model and Portainer docs: container/image/network/volume data plus summary counts and basic version/node information.
- The async Edge Agent example was not valid as written. The original `docker run` command placed Docker flags after the image name, which would not work, and it used unsupported `EDGE_PING_INTERVAL` and `EDGE_SNAPSHOT_INTERVAL` environment variables. I replaced it with a valid Docker standalone Edge Agent async deployment command using supported options, and noted that async mode is a Portainer Business Edition feature.

## Review Notes
- The `PUT /api/settings` example using `"SnapshotInterval": "10m"` is correct. Portainer still expects a duration string for this field.
- The JWT-based API example using `POST /api/auth` and `Authorization: Bearer ...` is still supported in current Portainer docs and source. Portainer's API access docs now emphasize user-generated access tokens with the `X-API-Key` header, but the blog's JWT flow remains technically valid.
- In real deployments, Portainer recommends matching the agent image version to the Portainer Server version. The example now uses the `lts` tag as a safer generic reference.
