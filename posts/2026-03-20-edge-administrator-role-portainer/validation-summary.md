# Validation Summary: How to Set Up the Edge Administrator Role in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition
- Portainer Edge Compute
- Portainer RBAC
- Portainer HTTP API
- `curl`

## Sources Consulted
- Portainer docs, Edge Compute: https://docs.portainer.io/admin/settings/edge
- Portainer docs, Roles: https://docs.portainer.io/admin/user/roles
- Portainer docs, Edge Groups: https://docs.portainer.io/user/edge/groups
- Portainer docs, Waiting Room: https://docs.portainer.io/user/edge/waiting-room
- Portainer docs, Accessing the Portainer API: https://docs.portainer.io/api/access
- Portainer docs, API documentation landing page: https://docs.portainer.io/api/docs
- Portainer BE OpenAPI spec referenced from the official API docs: https://api-docs.portainer.io/versions/ee/2.39.1.yaml

## Issues Found
- The post said Edge Administrators manage edge environments they are "assigned to" and can be restricted to specific edge groups. Portainer documents the Edge Administrator role as applying across all Edge environments. I corrected the capability list and rewrote the edge-group section to clarify that Edge Groups organize environments but do not scope the role.
- The post said Edge Administrators can configure edge agent settings. Portainer documents the global Edge Agent poll, ping, snapshot, and command-frequency settings under **Settings > Edge Compute**, not as an Edge Administrator capability. I replaced that bullet with a documented Edge Administrator capability: creating and managing edge groups.
- The `PUT /api/users/8` example attempted to promote a user with only `{\"Role\": 3}`. Portainer's official documentation does not provide a documented standalone API workflow for assigning the Edge Administrator role, and the example payload was not reliable as written. I replaced that section with the documented UI workflow under **Settings > Edge Compute > Edge Compute access**.
- The `PUT /api/edge_groups/1/access` example used an undocumented endpoint. I removed it and replaced the API section with documented Edge Group creation and inspection calls.
- The API example previously authenticated with a JWT generated earlier in the removed role-assignment section, which would have left the later commands without a defined token. I updated the Edge Group API example to use the officially documented `X-API-Key` header instead.

## Review Notes
Portainer's documentation currently mixes JWT-based API examples with API-key-based guidance. The post now uses the documented UI flow for Edge Administrator assignment and keeps the API example limited to documented Edge Group endpoints.
