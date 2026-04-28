# Validation Summary: How to Configure Namespace-Level Access in Portainer for Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (Business Edition RBAC)
- Kubernetes
- Portainer REST API (`/api/auth`, `/api/endpoints/{id}`)
- Bash + curl + python3 for scripting API interactions

## Sources Consulted
- Portainer Roles documentation: https://docs.portainer.io/admin/user/roles
- Portainer API docs: https://docs.portainer.io/api/docs
- Portainer source on GitHub (api/internal/authorization/authorizations.go and api/dataservices/role/role.go): https://github.com/portainer/portainer
- Sister validated blog post in the same repo confirming the canonical Role ID mapping: posts/2026-03-20-portainer-rbac-roles-permissions/README.md

## Issues Found
- The "Role Reference" table contained an incorrect Role ID → Role Name mapping. The canonical Portainer environment-level Role IDs are 1 = Environment Administrator, 2 = Helpdesk, 3 = Standard User, 4 = Read-Only User, 5 = Operator. The post had Operator at ID 2, Helpdesk at ID 3, Standard User at ID 4, and Read-Only at ID 5 — these are wrong. The table was rewritten to use the correct IDs and to use the official role names ("Environment Administrator" and "Read-Only User"). This was cross-checked against the validated sister post `posts/2026-03-20-portainer-rbac-roles-permissions/README.md` which uses the same canonical mapping.

## Review Notes
- The auth flow (`POST /api/auth` returning a JSON body containing `jwt`) and the `GET /api/endpoints/{id}` response shape (with `TeamAccessPolicies` and `UserAccessPolicies` fields) are both consistent with the Portainer 2.x API.
- The post uses `--insecure` with curl, which is appropriate for default Portainer self-signed certs but should be removed once a trusted certificate is in place.
- The intro sentence contains an awkward title duplication ("how to configure How to Configure Namespace-Level Access in Portainer for Kubernetes in Portainer..."). This is a stylistic / templating issue rather than a technical inaccuracy and was left unchanged per the review instructions.
- The "UI" steps are intentionally generic; namespace-level access in Portainer for Kubernetes is configured under Environments → (cluster) → Namespaces → (namespace) → Access, but expanding the UI walkthrough is out of scope for a technical-correctness pass.
- Namespace-level access policies in Portainer are tied to Kubernetes RBAC rolebindings managed by Portainer; the role IDs in the table apply to environment-level access policies, not in-namespace Kubernetes Role/ClusterRole IDs.
