# Validation Summary: How to Understand Portainer RBAC Roles and Permissions

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition
- Portainer RBAC
- Portainer HTTP API
- Docker
- Docker Swarm
- Kubernetes

## Sources Consulted
- Portainer roles documentation: https://docs.portainer.io/sts/admin/user/roles
- Portainer Docker roles and permissions reference: https://docs.portainer.io/advanced/docker-roles-and-permissions
- Portainer API documentation landing page: https://docs.portainer.io/api/docs
- Portainer API access documentation source: https://raw.githubusercontent.com/portainer/portainer-docs/2.39/api/access.md
- Portainer BE OpenAPI spec 2.39.1: https://api-docs.portainer.io/versions/ee/2.39.1.yaml
- Portainer endpoint update handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/endpoints/endpoint_update.go
- Portainer MCP access-policy role mapping: https://github.com/portainer/portainer-mcp/blob/main/pkg/portainer/models/access_policy.go

## Issues Found
- The post claimed to cover all available roles but omitted Edge Administrator and Namespace Operator. I added both and clarified the scope of system-level, environment-level, and namespace-scoped roles based on Portainer's official roles documentation.
- The environment-level role table used unsupported numeric "Level" values and non-official naming such as "Read-Only Viewer". I removed the numeric hierarchy, aligned the names to Portainer's published terminology, and corrected the role descriptions.
- The permission matrix was presented as universal Portainer RBAC behavior even though Portainer documents Docker/Swarm permissions separately from Kubernetes role mappings. I scoped the matrix to Docker/Swarm and added a note that Kubernetes permissions differ.
- Several matrix entries were technically incorrect, especially around Operator and Standard User capabilities. I corrected the rows to match Portainer's published Docker/Swarm permission matrix and added the resource-access caveat for Standard User and Read-Only User permissions.
- The API example used an incorrect update path (`/api/endpoints/{id}/teamaccesspolicies`) and the wrong JSON field name (`RoleID`). I updated it to use `PUT /api/endpoints/{id}` with `TeamAccessPolicies` and `RoleId`, which matches the current OpenAPI spec and handler implementation.
- The original API example would also have been misleading because updating `TeamAccessPolicies` replaces the map on the environment. I changed the snippet to fetch the current policy map, merge the new team entry, and then send the update.
- The role ID reference table was wrong. I corrected the built-in environment access role IDs to Environment Administrator `1`, Helpdesk `2`, Standard User `3`, Read-Only User `4`, and Operator `5`, and added a note to verify them with `GET /api/roles`.

## Review Notes
- Portainer's high-level roles page says Operator can start and stop containers or services, but the detailed Docker/Swarm permissions reference marks container start and stop as not allowed for Operator. The post now follows the detailed Docker/Swarm permissions reference because it is the more specific source for per-action behavior.
