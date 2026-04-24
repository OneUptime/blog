# Validation Summary: How to Apply Access Policies to Environment Groups in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer Business Edition RBAC
- Environment groups
- Portainer HTTP API
- Bash
- cURL

## Sources Consulted
- Portainer docs: Groups https://docs.portainer.io/admin/environments/groups
- Portainer docs: Roles https://docs.portainer.io/sts/admin/user/roles
- Portainer docs: API usage examples https://docs.portainer.io/sts/api/examples
- Portainer source: environment group routes https://github.com/portainer/portainer/blob/develop/api/http/handler/endpointgroups/handler.go
- Portainer source: environment group update payload and behavior https://github.com/portainer/portainer/blob/develop/api/http/handler/endpointgroups/endpointgroup_update.go
- Portainer source: add environment to group route https://github.com/portainer/portainer/blob/develop/api/http/handler/endpointgroups/endpointgroup_endpoint_add.go
- Portainer source: access policy JSON model and environment/environment-group structs https://github.com/portainer/portainer/blob/develop/api/portainer.go
- Portainer source: built-in role ID mapping used by the UI https://github.com/portainer/portainer/blob/develop/app/portainer/rbac/models/role.js

## Issues Found
- The UI navigation was partially outdated. The post said to use an Environments page and Groups tab, but current Portainer docs place groups under `Environment-related -> Groups`. I updated the UI steps to match the official docs.
- The API examples for assigning and revoking group access used an unsupported route, `/api/endpoint_groups/{id}/teamaccesspolicies`. Portainer updates group access through `PUT /api/endpoint_groups/{id}` with a `TeamAccessPolicies` object in the payload. I corrected all related examples.
- The role ID table was incorrect. The post mapped Operator, Helpdesk, Standard User, and Read-Only incorrectly. I corrected the IDs to match Portainer's built-in role definitions used by the product.
- The payload examples used `RoleID`. Portainer's access policy model uses `RoleId`. I updated the examples to use the canonical field name from the API model.
- The verification example implied inherited group access would appear directly on an environment's `TeamAccessPolicies`. In Portainer, group access is evaluated from the environment group, and environment-specific policies may remain empty unless there is an override. I rewrote the verification section to inspect the group policy and the environment's `GroupId`.
- The "add environment to a group" example used `POST`, but the Portainer handler uses `PUT /api/endpoint_groups/{id}/endpoints/{endpointId}`. I corrected the HTTP method.
- The bulk script inherited the same incorrect route, field name, and role ID issues. I corrected the route, wrapped the payload in `TeamAccessPolicies`, and fixed the role IDs.

## Review Notes
- The post is technically relevant and salvageable. After correction, the examples align with current Portainer documentation and the current upstream Portainer source.
- The post uses JWT authentication from `/api/auth`, which remains valid per Portainer's API examples, although Portainer documentation also documents `X-API-Key` authentication for access tokens.
