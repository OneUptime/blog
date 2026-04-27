# Validation Summary: How to Configure Per-Environment Access Control in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (Business Edition)
- Portainer REST API (`/api/auth`, `/api/endpoints/{id}`)
- Role-Based Access Control (RBAC)
- Bash / curl / python3 (used in API examples)

## Sources Consulted
- [Portainer Roles Documentation](https://docs.portainer.io/admin/user/roles)
- [Portainer Docker roles and permissions](https://docs.portainer.io/advanced/docker-roles-and-permissions)
- [Portainer Kubernetes roles and bindings](https://docs.portainer.io/advanced/kubernetes-roles-and-bindings)
- [Portainer source: `api/internal/authorization/k8s_authorizations_default.go`](https://github.com/portainer/portainer/blob/0e489aa89846e4209f8b53c4b9d9f9626cb37f94/api/internal/authorization/k8s_authorizations_default.go)
- [Portainer source: `api/portainer.go` (RoleID constants via iota)](https://github.com/portainer/portainer)

## Issues Found
- **Role ID table was incorrect.** The original table mapped role IDs to the wrong role names. Per the Portainer source code (`RoleID` const block in `api/portainer.go`, defined with `iota` starting at 1), the correct mapping is:
  - 1 = Environment Admin (RoleIDEndpointAdmin)
  - 2 = Helpdesk (RoleIDHelpdesk)
  - 3 = Standard User (RoleIDStandardUser)
  - 4 = Read-Only (RoleIDReadonly)
  - 5 = Operator (Business Edition only)

  The original post had Operator listed as 2, Helpdesk as 3, Standard User as 4, and Read-Only as 5. I corrected the table so the IDs match the values Portainer actually persists in `TeamAccessPolicies` / `UserAccessPolicies`. Without this fix, anyone copying RoleId values into API calls would assign the wrong role.

## Review Notes
- The API examples (auth flow, JWT extraction, `/api/endpoints/{id}` GET, `TeamAccessPolicies` / `UserAccessPolicies` field names) are accurate against current Portainer API behavior.
- The intro sentence contains an awkward duplication ("how to configure How to Configure Per-Environment Access Control in Portainer in Portainer") that appears to be a template-rendering artifact rather than a technical error, so it was left untouched per the instruction to avoid stylistic changes.
- The post uses `--insecure` with curl, which is appropriate for the default self-signed cert at `https://localhost:9443` but should be removed for production use against a properly-certificated Portainer instance.
- The Operator role is exclusive to Portainer Business Edition; the four other roles are present in CE as well. The post's "Business Edition" tag correctly signals this.
