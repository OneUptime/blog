# Validation Summary: How to Create Custom Roles in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Kubernetes RBAC
- `kubectl`
- Rancher `RoleTemplate` resources

## Sources Consulted
- Rancher Custom Roles: https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/custom-roles
- Rancher Cluster and Project Roles: https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/cluster-and-project-roles
- Rancher API Reference (`RoleTemplate` schema): https://ranchermanager.docs.rancher.com/v2.10/api/api-reference
- Kubernetes RBAC Reference: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes Deprecated API Migration Guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide/
- `kubectl` Subresource Conventions: https://kubernetes.io/docs/reference/kubectl/conventions/

## Issues Found
- The post used outdated Rancher UI labels such as **Roles** and **Project**. I updated these to the current official labels **Role Templates** and **Project/Namespaces** so the navigation matches Rancher documentation.
- The sample RBAC rules used the obsolete `extensions` API group for workload resources. I removed `extensions` and kept these resources under `apps`, which is the current supported API group for Deployments, DaemonSets, StatefulSets, and ReplicaSets.
- The sample description said the role could "view all workloads," but the rules only covered Deployments, DaemonSets, StatefulSets, and ReplicaSets. I narrowed the wording to match the actual permissions granted.
- The deployment scaling permission was mixed into the main deployment rule. I split `deployments/scale` into its own rule with `get`, `update`, and `patch`, which is more accurate for the scale subresource.
- The troubleshooting section implied that a more restrictive role could override another role's permissions. I corrected this because Kubernetes RBAC permissions are additive and do not provide deny rules; blocking behavior would come from another authorizer, admission control, or external policy.

## Review Notes
- The `RoleTemplate` examples are valid against the official Rancher API schema: `apiVersion: management.cattle.io/v3`, `kind: RoleTemplate`, `spec.context`, `roleTemplateNames`, and `rules` all match the documented fields.
- The inheritance example using `roleTemplateNames: [project-member]` is valid for project-scoped custom roles.
- Rancher v2.9.0 and later adds constraints for external `RoleTemplate` objects, but that caveat does not affect this post because the examples use inline `rules` rather than `external: true`.
