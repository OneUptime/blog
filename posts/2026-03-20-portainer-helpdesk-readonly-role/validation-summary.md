# Validation Summary: How to Set Up the Helpdesk (Read-Only) Role in Portainer - Readonly

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition RBAC
- Portainer HTTP API
- Docker / Swarm environment permissions
- Kubernetes RBAC mapping in Portainer
- `curl`
- Python 3

## Sources Consulted
- Portainer Docs: Roles — https://docs.portainer.io/admin/user/roles
- Portainer Docs: Environments / Manage access — https://docs.portainer.io/admin/environments/environments
- Portainer Docs: Docker roles and permissions — https://docs.portainer.io/advanced/docker-roles-and-permissions
- Portainer Docs: Kubernetes roles and bindings — https://docs.portainer.io/advanced/kubernetes-roles-and-bindings
- Portainer Docs: Accessing the Portainer API — https://docs.portainer.io/api/access
- Portainer Docs: API documentation / Business Edition 2.39.1 — https://docs.portainer.io/api/docs and https://api-docs.portainer.io/?edition=ee&version=2.39.1
- Portainer source (official), tag `2.39.1` — https://github.com/portainer/portainer/tree/2.39.1

## Issues Found
- The introduction incorrectly treated Helpdesk as equivalent to Read-Only. I corrected it to state that Helpdesk is a distinct Business Edition RBAC role and that Read-Only User is narrower.
- The environment access API examples used stale routes (`/api/endpoints/{id}/teamaccesspolicies` and `/api/endpoints/{id}/useraccesspolicies`). I updated them to the current environment update flow using `PUT /api/endpoints/{id}` with `TeamAccessPolicies` / `UserAccessPolicies`.
- The post mapped Helpdesk to `RoleId: 3`. I corrected it to `RoleId: 2`, which matches Portainer's current role seeding.
- The team creation example used the wrong JSON key casing (`name`). I corrected it to `Name`.
- The team membership example used the wrong route and payload shape. I changed it from `POST /api/teams/{id}/memberships` with lowercase keys to `POST /api/team_memberships` with `UserID`, `TeamID`, and `Role`.
- The multi-environment assignment loop would have used the stale route and wrong role ID. I updated it to fetch current team access policies, merge the Helpdesk entry, and submit the merged payload to `PUT /api/endpoints/{id}`.
- The conclusion overclaimed that Helpdesk could "see everything but change nothing" and "resolve most Level 1 issues without escalation." I tightened this to inspecting deployed resources and triaging issues before escalation.

## Review Notes
- Portainer's official API guidance recommends per-user access tokens via `X-API-Key`. The post still uses JWT login via `/api/auth`, which remains present in the current OpenAPI spec and is still valid.
- Helpdesk access is a Portainer Business Edition feature. Community Edition users will not have this role available.
- If the post is expanded later to cover volume browsing specifically, Portainer documents additional prerequisites for non-admin volume browsing, including the Portainer Agent and the relevant security setting.
