# Validation Summary: How to Configure Per-Environment Access Control in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer Business Edition RBAC
- Portainer HTTP API
- Bash
- `curl`
- `python3`

## Sources Consulted
- Portainer Environments docs: https://docs.portainer.io/admin/environments/environments
- Portainer Groups docs: https://docs.portainer.io/admin/environments/groups
- Portainer Roles docs: https://docs.portainer.io/admin/user/roles
- Portainer API access docs: https://docs.portainer.io/api/access
- Portainer API usage examples: https://docs.portainer.io/api/examples
- Portainer Docker roles and permissions docs: https://docs.portainer.io/advanced/docker-roles-and-permissions
- Portainer troubleshooting FAQ on environment visibility: https://docs.portainer.io/faqs/troubleshooting/logs-errors-and-debugging/why-cant-my-users-see-anything-in-the-environment-they-have-access-to
- Portainer API spec, BE 2.39.1: https://api-docs.portainer.io/versions/ee/2.39.1.yaml

## Issues Found
- The UI navigation was inaccurate. The draft said to open the environment details page and use a top-right **Manage access** button, but the official docs route is **Environment-related → Environments → Manage access** from the environment list row. I corrected the steps.
- The post implied per-environment RBAC generically without noting edition scope. Portainer documents these granular environment roles as Business Edition functionality, while Community Edition supports only basic user and group assignments. I added that caveat.
- The explanation of effective access was incomplete and misleading. It omitted inherited group access, direct-assignment override behavior, and policy precedence. I corrected the explanation to match the docs.
- The post used `Administrator` as if it were a per-environment role. Portainer documents `Administrator` as a global admin role and `Environment administrator` as the per-environment full-access role. I corrected the design pattern entries.
- The post treated `Standard User` as though it were environment-wide administration. Portainer documents `Standard User` as full control over resources owned by the user or their team, not all resources in the environment. I clarified that distinction.
- The API examples used undocumented dedicated endpoints for `teamaccesspolicies` and `useraccesspolicies`. The current official API spec documents updating environment access through `PUT /api/endpoints/{id}` with `TeamAccessPolicies` and `UserAccessPolicies` in the request body. I updated the API example, the removal example, and the bulk script accordingly.
- The API examples hardcoded role IDs without showing how to verify them. I changed the examples to resolve role IDs from the documented `GET /api/roles` endpoint before applying access policies.

## Review Notes
- The post is now technically accurate for current Portainer documentation and is effectively a Portainer Business Edition guide because it relies on RBAC roles such as Environment administrator, Helpdesk, and Standard User.
- The revised API examples continue to use the documented JWT authentication flow from Portainer's API usage examples. Portainer's API docs also document API access tokens via `X-API-Key`.
