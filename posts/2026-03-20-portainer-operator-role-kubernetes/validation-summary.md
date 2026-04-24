# Validation Summary: How to Use the Operator Role in Portainer for Kubernetes - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition RBAC
- Kubernetes
- Kubernetes RBAC
- Portainer HTTP API
- Access control for Portainer environments and namespaces

## Sources Consulted
- Portainer roles documentation: https://docs.portainer.io/sts/admin/user/roles
- Portainer namespace access documentation: https://docs.portainer.io/2.33-lts/user/kubernetes/namespaces/access
- Portainer API documentation landing page: https://docs.portainer.io/api/docs
- Portainer BE 2.39.1 API spec: https://api-docs.portainer.io/versions/ee/2.39.1.yaml
- Portainer 2.39.1 role ID definitions: https://raw.githubusercontent.com/portainer/portainer/2.39.1/app/portainer/rbac/models/role.js
- Portainer 2.39.1 role descriptions in UI source: https://raw.githubusercontent.com/portainer/portainer/2.39.1/app/portainer/rbac/services/role.service.js
- Portainer 2.39.1 environment update handler: https://raw.githubusercontent.com/portainer/portainer/2.39.1/api/http/handler/endpoints/endpoint_update.go
- Portainer 2.39.1 namespace access UI logic showing namespace access inherits the existing environment role: https://raw.githubusercontent.com/portainer/portainer/2.39.1/app/react/kubernetes/namespaces/AccessView/CreateAccessWidget/CreateAccessInnerForm.tsx
- Portainer 2.39.1 namespace access payload generation showing `RoleId: 0` is used to keep the existing environment role: https://raw.githubusercontent.com/portainer/portainer/2.39.1/app/react/kubernetes/namespaces/AccessView/createAccessConfigMapPayload.ts

## Issues Found
- The post described the Operator role as Kubernetes-specific and able to deploy new applications. Portainer’s current role documentation describes Operator as an environment-wide role for operational control of existing resources, and explicitly distinguishes it from namespace-scoped roles. I corrected the introduction, comparison table, capability list, practical example, and conclusion to reflect that.
- The API example for assigning the Operator role used a stale endpoint and the wrong numeric role ID. I changed the request from `PUT /api/endpoints/{id}/teamaccesspolicies` with `RoleId: 2` to `PUT /api/endpoints/{id}` with a `TeamAccessPolicies` payload and `RoleId: 5`, which matches Portainer’s current API shape and role constants.
- The namespace section incorrectly claimed that Operator could be combined with namespace-level access control and used a stale namespace-access API path. Portainer’s documentation says cluster-wide roles such as Operator cannot be assigned to individual namespaces. I rewrote that section to explain the current behavior and removed the incorrect API call.
- The team-structure and usage examples implied Operator is the right role for self-service app deployment in development namespaces. I updated those examples so Operator is used for environment-wide operations on existing workloads, while namespace-scoped self-service deployment is associated with Standard User or Namespace Operator.

## Review Notes
- Portainer’s advanced RBAC roles such as Operator, Helpdesk, Read-only User, and Namespace Operator are Business Edition features; this post now reflects that in the introduction.
- Namespace access in current Portainer inherits the user or team’s existing environment role rather than assigning Operator at the namespace level.
- The review was documentation and source based. No live Portainer instance was available in this repository to execute the example requests end-to-end.
