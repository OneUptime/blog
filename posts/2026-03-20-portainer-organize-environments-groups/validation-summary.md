# Validation Summary: How to Organize Environments with Groups in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer HTTP API
- `curl`
- Python 3 (`json` parsing in shell pipelines)

## Sources Consulted
- Portainer documentation: Groups - https://docs.portainer.io/admin/environments/groups
- Portainer documentation: Accessing the Portainer API - https://docs.portainer.io/api/access
- Portainer Community Edition API specification 2.39.1 - https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer source: environment group create handler - https://github.com/portainer/portainer/blob/develop/api/http/handler/endpointgroups/endpointgroup_create.go
- Portainer source: environment group update handler - https://github.com/portainer/portainer/blob/develop/api/http/handler/endpointgroups/endpointgroup_update.go
- Portainer source: add/remove environment group membership handlers - https://github.com/portainer/portainer/blob/develop/api/http/handler/endpointgroups/endpointgroup_endpoint_add.go and https://github.com/portainer/portainer/blob/develop/api/http/handler/endpointgroups/endpointgroup_endpoint_delete.go
- Portainer source: environment group inspect handler and environment list handler - https://github.com/portainer/portainer/blob/develop/api/http/handler/endpointgroups/endpointgroup_inspect.go and https://github.com/portainer/portainer/blob/develop/api/http/handler/endpoints/endpoint_list.go
- Portainer source: request bouncer auth handling - https://github.com/portainer/portainer/blob/develop/api/http/security/bouncer.go

## Issues Found
- The Web UI navigation was outdated. The post said to open **Environments** and use a **Groups** tab, but current Portainer docs place groups under **Environment-related > Groups**. I updated the steps to match the current UI.
- The API examples used field names that did not match the current documented payload schema for group operations. I updated the request bodies to use the documented keys such as `Name`, `Description`, and `AssociatedEndpoints`.
- The sample `GROUP_ID=1` was misleading because Portainer documents group ID `1` as the built-in **Unassigned** group. I changed the example to use a non-reserved placeholder value and added a note.
- The "add environment to a group" example used `POST`, but the current API defines `PUT /endpoint_groups/{id}/endpoints/{endpointId}`. I corrected the method.
- The bulk operations example incorrectly assumed `GET /endpoint_groups/{id}` returns associated environment IDs. The current inspect endpoint returns group metadata, while environment membership is retrieved by listing environments filtered with `groupIds`. I updated both examples to use `GET /endpoints?groupIds=...`.

## Review Notes
- JWT authentication via `POST /api/auth` and `Authorization: Bearer <token>` is still supported by the current API spec and source. Portainer’s end-user API access documentation now primarily demonstrates long-lived access tokens passed with the `X-API-Key` header instead.
