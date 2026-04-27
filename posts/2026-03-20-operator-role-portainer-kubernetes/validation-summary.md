# Validation Summary: How to Use the Operator Role in Portainer for Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (Business Edition)
- Portainer HTTP API
- Kubernetes RBAC

## Sources Consulted
- Portainer Roles documentation: https://docs.portainer.io/admin/user/roles
- Portainer Kubernetes roles and bindings: https://docs.portainer.io/advanced/kubernetes-roles-and-bindings
- Portainer namespace access: https://docs.portainer.io/user/kubernetes/namespaces/access
- Portainer API access docs: https://docs.portainer.io/api/access
- Portainer source - `AccessPolicy` struct (`json:"RoleId"`): https://raw.githubusercontent.com/portainer/portainer/develop/api/portainer.go
- Portainer source - endpoints router (no `/teamaccesspolicies` subroute; `PUT /endpoints/{id}` is the update path): https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/endpoints/handler.go
- Portainer source - `endpointUpdate` payload accepts `TeamAccessPolicies` and `UserAccessPolicies`: https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/endpoints/endpoint_update.go
- Portainer source - DB migration confirming built-in role IDs (1=Endpoint Administrator, 2=HelpDesk, 3=Standard User, 4=Read-Only User): https://raw.githubusercontent.com/portainer/portainer/develop/api/datastore/migrator/migrate_dbversion20.go

## Issues Found

1. **Wrong API endpoint for environment team access policies.** The post used `PUT /api/endpoints/{id}/teamaccesspolicies`. That subroute does not exist in the Portainer API - the endpoints router only registers `PUT /endpoints/{id}` for updates, and the `endpointUpdate` payload is what accepts the `TeamAccessPolicies` map. Fixed by switching to `PUT /api/endpoints/{id}` with `{"TeamAccessPolicies": {...}}` in the body.

2. **Wrong JSON key for the role identifier.** The post used `"RoleID"`. The Go `AccessPolicy` struct in Portainer serializes the field as `json:"RoleId"` (lowercase `d`). Fixed throughout the example.

3. **Hard-coded `RoleID: 2` as Operator was incorrect.** Per the DB migration in Portainer source, RoleId `2` is HelpDesk, not Operator. Operator is a Portainer Business Edition role and its numeric ID is not part of the CE-defined 1-4 range; it varies and should be discovered at runtime. Fixed by adding a step that queries `GET /api/roles` and resolves the Operator role by name, then uses that ID in the `TeamAccessPolicies` body. This also makes the example correct on any BE installation regardless of role-seed order.

## Review Notes

- The role-capability lists in the post (what Operators can/cannot do, and what they see in the Kubernetes UI) line up with Portainer's documented `portainer-operator` cluster role and `portainer-view` namespace role bindings (read-only on most resources, with patch on workloads and delete on pods at the cluster level, and no Secrets access).
- The "Configure Namespace-Level Operator Access" section uses the generic phrase "Operator role on that namespace only". In Portainer's terminology, the role you actually assign at namespace scope is called *Namespace Operator*; the UI flow described (Environments > Namespaces > Access) is correct and the visible role choices on that screen will be the BE roles applicable to namespace scope, so I did not change the wording.
- This guide is BE-only (RBAC and the Operator role are not available in Portainer CE). The post already calls this out via the "Business Edition" tag; readers on CE will not see these roles.
