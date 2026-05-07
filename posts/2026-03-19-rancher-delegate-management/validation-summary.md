# Validation Summary: How to Delegate Cluster Management to Teams in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- Kubernetes
- Rancher RBAC (`RoleTemplate`, `ClusterRoleTemplateBinding`, `ProjectRoleTemplateBinding`, `Project`)
- Terraform (`rancher/rancher2` provider)
- `kubectl`

## Sources Consulted
- Rancher docs: Cluster and Project Roles - https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/cluster-and-project-roles
- Rancher docs: Projects workflow - https://ranchermanager.docs.rancher.com/api/workflows/projects
- Rancher docs: Global Resources - https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/global-resources
- Rancher docs: Locked Roles - https://ranchermanager.docs.rancher.com/v2.11/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/locked-roles
- Rancher docs: Enabling the API Audit Log to Record System Events - https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/advanced-user-guides/enable-api-audit-log
- Terraform Registry: `rancher2_cluster_role_template_binding` - https://registry.terraform.io/providers/rancher/rancher2/latest/docs/resources/cluster_role_template_binding
- Terraform Registry: `rancher2_principal` data source - https://registry.terraform.io/providers/rancher/rancher2/latest/docs/data-sources/principal

## Issues Found
- The post used the wrong object shape for Rancher `RoleTemplate` resources by nesting `context`, `displayName`, and `rules` under `spec`. I rewrote the manifest to use Rancher's documented top-level fields and clarified that it must be applied on the Rancher management cluster.
- The UI steps referred to built-in roles as `Cluster Owner`, `Project Owner`, and `Project Member`. Rancher's built-in membership roles are `Owner`, `Member`, and `Read Only`, so I updated the instructions to match current Rancher terminology.
- The cross-team visibility script created `ProjectRoleTemplateBinding` objects with the wrong fields and namespace. I changed it to use the documented top-level `projectName`, `roleTemplateName`, and `groupPrincipalName` fields, pull each project's `status.backingNamespace`, and use `kubectl create` with `generateName`.
- The project resource quota example omitted `spec.clusterName` and included `usedLimit`, which is not part of Rancher's documented authored example for project creation/update. I added `clusterName` and removed `usedLimit`.
- The role-restriction section used an invalid `RoleTemplate` example and implied that locking is a per-cluster-owner behavior. I replaced it with Rancher's documented locking behavior: locked roles are hidden from the member-role picker and cannot be newly assigned.
- The monitoring section relied on an undocumented event reason and an incorrect Rancher audit log path. I replaced it with direct watches on Rancher RBAC/project resources and Rancher's documented audit-log command/path for Helm and Docker installs.
- The delegated-admin section implied you could keep someone as a built-in cluster owner while withholding owner-level infrastructure access. I clarified that the custom role is for delegated admins who should receive that narrower role instead of full `Owner` access.

## Review Notes
- Rancher RBAC and UI navigation are version-sensitive. This review was checked against the current official documentation available on 2026-05-07, primarily Rancher v2.13/v2.14 docs and the current Rancher API workflow pages.
- The Step 10 Terraform module block is schematic; its final correctness still depends on how `./modules/cluster-delegation` resolves group identifiers internally.
- Rancher documents that CPU or memory project quotas can require matching container CPU/memory settings or container default resource limits when workloads are created. The post's quota example is valid, but operators should keep that runtime caveat in mind.
