# Validation Summary: How to Set Up the Helpdesk (Read-Only) Role in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer RBAC
- Portainer HTTP API
- `curl`
- Python 3

## Sources Consulted
- Portainer official documentation — Roles: https://docs.portainer.io/admin/user/roles
- Portainer official documentation — Environments / Manage access to environments: https://docs.portainer.io/admin/environments/environments
- Portainer official documentation — API documentation: https://docs.portainer.io/api/docs
- Portainer official documentation — API usage examples: https://docs.portainer.io/sts/api/examples
- Portainer official source — RBAC role IDs (`app/portainer/rbac/models/role.js`): https://github.com/portainer/portainer/blob/develop/app/portainer/rbac/models/role.js
- Portainer official source — built-in role names/descriptions (`app/portainer/rbac/services/role.service.js`): https://github.com/portainer/portainer/blob/develop/app/portainer/rbac/services/role.service.js
- Portainer official source — endpoint update handler and accepted payload fields (`api/http/handler/endpoints/endpoint_update.go`): https://github.com/portainer/portainer/blob/develop/api/http/handler/endpoints/endpoint_update.go
- Portainer official source — access policy payload shape (`app/portainer/services/api/accessService.js`): https://github.com/portainer/portainer/blob/develop/app/portainer/services/api/accessService.js

## Issues Found
1. The post did not state that the Helpdesk role is part of Portainer Business Edition RBAC. Current Portainer documentation explicitly scopes RBAC roles to Business Edition. I corrected the description, introduction, and overview to make that prerequisite explicit.
2. The UI steps were too generic and did not match Portainer's documented workflow. Portainer assigns environment access from **Environment-related > Environments > Manage access**, then applies the selected role and creates the access entry. I replaced the placeholder steps with the current documented path and action names.
3. The API section did not actually configure the Helpdesk role. It only inspected an environment's access policy maps. I replaced it with a current API flow that lists roles, confirms the Helpdesk role ID, and updates `TeamAccessPolicies` through `PUT /api/endpoints/{id}` using the documented/public payload shape.
4. The API example would have been unsafe if simplified to a direct overwrite because `TeamAccessPolicies` is replaced when provided. I changed the example to fetch the existing environment, merge the new team entry in Python, and send back only the updated policy map so existing team access is preserved.
5. The role reference table had incorrect role ID mappings and names. Against Portainer's current official source, the environment-scoped RBAC roles are `1` Environment Administrator, `2` Helpdesk, `3` Standard User, `4` Read-Only User, and `5` Operator. I corrected the table to match the current implementation.

## Review Notes
- Portainer renamed endpoints to environments in the UI in version 2.10, but the HTTP API still uses `/api/endpoints/...`. The post now reflects that distinction.
- The note that Helpdesk is `RoleId` `2` is accurate for current Portainer source, and the example also shows `GET /api/roles` so readers can verify the role list in their own installation.
