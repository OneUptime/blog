# Validation Summary: How to Override Team Roles for Individual Users in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition RBAC
- Portainer HTTP API
- Bash
- `curl`
- Python 3 JSON parsing

## Sources Consulted
- Portainer Documentation, Roles: https://docs.portainer.io/sts/admin/user/roles
- Portainer Documentation, Groups: https://docs.portainer.io/admin/environments/groups
- Portainer Documentation, API documentation index: https://docs.portainer.io/api/docs
- Portainer Documentation, Accessing the Portainer API: https://docs.portainer.io/2.21/api/access
- Portainer source, endpoint route registration: https://github.com/portainer/portainer/blob/742523de1728af0bda6454362ac4945d014c6f3c/api/http/handler/endpoints/handler.go
- Portainer source, endpoint update payload and behavior: https://github.com/portainer/portainer/blob/742523de1728af0bda6454362ac4945d014c6f3c/api/http/handler/endpoints/endpoint_update.go
- Portainer source, effective access resolver: https://github.com/portainer/portainer/blob/742523de1728af0bda6454362ac4945d014c6f3c/pkg/authorization/resolver.go
- Portainer source, effective access resolver tests: https://github.com/portainer/portainer/blob/742523de1728af0bda6454362ac4945d014c6f3c/pkg/authorization/resolver_test.go
- Portainer source, RBAC role IDs used by the UI: https://github.com/portainer/portainer/blob/742523de1728af0bda6454362ac4945d014c6f3c/app/portainer/rbac/models/role.js

## Issues Found
- The post did not state that these RBAC roles are a Portainer Business Edition feature. I added a note in the introduction so the scope is accurate.
- The role-resolution explanation was incorrect. The post originally implied that the more permissive role wins between user and team access. I corrected this to match Portainer's current resolver: direct user access on the environment takes precedence, then inherited user group access, then team environment access, then inherited team group access.
- The post incorrectly claimed that direct user policies can only elevate access. I corrected this to reflect Portainer's actual precedence rules: a direct user policy can grant either a higher or lower role than the team would otherwise provide.
- The API examples used the wrong endpoint path and payload shape. I changed the examples from `PUT /api/endpoints/{id}/useraccesspolicies` to `PUT /api/endpoints/{id}` with a `UserAccessPolicies` object in the request body, which matches the current official handler.
- The `RoleId` values in the examples were wrong for the built-in roles used in the article. I corrected the examples to use `Helpdesk=2` and `Standard user=3`.
- The removal example posted back only the raw policy map. I corrected it to send the required `UserAccessPolicies` wrapper object.
- The verification example incorrectly tried to read a synthetic per-user role from `/api/endpoints`. I replaced it with an accurate check for accessible environments and pointed readers to Portainer's Effective access viewer for confirming the resolved role.

## Review Notes
- Portainer's documentation currently recommends API access tokens in the `X-API-Key` header for API usage. The post uses JWT authentication via `/api/auth` and `Authorization: Bearer`, which is still supported in the current Portainer source.
- Portainer renamed "endpoints" to "environments" in the UI, but the API path remains `/api/endpoints`.
