# Validation Summary: How to Configure Environment Snapshots in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer REST API
- Portainer Edge Agent Async
- curl

## Sources Consulted
- Portainer General settings documentation: https://docs.portainer.io/admin/settings/general
- Portainer API access documentation: https://docs.portainer.io/api/access
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer Edge Compute settings documentation: https://docs.portainer.io/admin/settings/edge
- Portainer documentation for installing Edge Agent Async on Docker Standalone: https://docs.portainer.io/admin/environments/add/docker/edge-async
- Portainer source for `PUT /settings`: https://github.com/portainer/portainer/blob/develop/api/http/handler/settings/settings_update.go
- Portainer source for `POST /api/endpoints/{id}/snapshot`: https://github.com/portainer/portainer/blob/develop/api/http/handler/endpoints/endpoint_snapshot.go
- Portainer source for `POST /api/endpoints/snapshot`: https://github.com/portainer/portainer/blob/develop/api/http/handler/endpoints/endpoint_snapshots.go
- Portainer source for `--snapshot-interval`: https://github.com/portainer/portainer/blob/develop/api/cli/cli.go

## Issues Found
- The post incorrectly described snapshot configuration as something you set on individual standard environments. I corrected this to match Portainer's documented behavior: for standard environments, `Snapshot interval` is a global setting under **Settings** -> **General**; per-environment snapshot timing is only available for Edge Agent Async environments.
- The original UI instructions pointed readers to **Environments** instead of **Settings** -> **General**. I updated the steps to the documented UI path and kept the documented default interval of `5m`.
- The original API example authenticated and then listed environments with `GET /api/endpoints`, which does not configure snapshots. I replaced it with a supported `GET /api/settings` and `PUT /api/settings` example using the documented `X-API-Key` header and the `SnapshotInterval` field.
- The `Installing the Portainer Agent (for Cloud K8s)` section was unrelated to snapshot configuration, and the `helm install portainer-agent portainer/portainer-agent` example was not an appropriate way to configure snapshot behavior. I replaced that section with documented Edge Agent Async per-environment snapshot configuration steps.
- The best-practices list contained generic environment-management advice and a malformed tags example. I replaced it with snapshot-specific guidance consistent with Portainer's documented behavior.

## Review Notes
- The article now covers two related behaviors: the global snapshot interval for standard environments and per-environment sync intervals for Edge Agent Async environments. This is technically accurate, but these could be split into separate posts in the future if a narrower scope is preferred.
- I did not add a server startup `--snapshot-interval` example in order to keep the edits limited, but Portainer also supports configuring the global interval at startup through the documented CLI flag.
