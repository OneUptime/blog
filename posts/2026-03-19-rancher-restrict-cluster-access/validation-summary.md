# Validation Summary: How to Restrict User Access to Specific Clusters in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- Kubernetes
- Rancher RBAC
- Rancher Kubernetes API (`management.cattle.io/v3`)
- Rancher v3 API
- Terraform Rancher2 provider
- `kubectl`
- `curl`

## Sources Consulted
- Rancher Global Permissions: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/global-permissions
- Rancher Cluster and Project Roles: https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/cluster-and-project-roles
- Rancher Adding Users to Clusters: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/manage-clusters/access-clusters/add-users-to-clusters
- Rancher Previous v3 API Guide: https://ranchermanager.docs.rancher.com/v2.14/api/v3-rancher-api-guide
- Rancher API Reference: https://ranchermanager.docs.rancher.com/v2.12/api/api-reference
- Rancher Projects API workflow: https://ranchermanager.docs.rancher.com/v2.11/api/workflows/projects
- Rancher source for `GlobalRole`, `ProjectRoleTemplateBinding`, and `ClusterRoleTemplateBinding`: https://github.com/rancher/rancher/blob/main/pkg/apis/management.cattle.io/v3/authz_types.go
- Rancher settings source: https://github.com/rancher/rancher/blob/main/pkg/settings/setting.go
- Terraform `rancher2_cluster_role_template_binding` resource: https://registry.terraform.io/providers/rancher/rancher2/latest/docs/resources/cluster_role_template_binding
- Terraform `rancher2_principal` data source: https://github.com/rancher/terraform-provider-rancher2/blob/master/docs/data-sources/principal.md

## Issues Found
- The post referred to a `cluster-default-role` setting and a `kubectl patch settings cluster-default-role` command. Current Rancher docs and source do not expose that setting in supported versions, so Step 1 was replaced with the documented `GlobalRole` and `inheritedClusterRoles` review flow.
- The access model omitted custom `GlobalRole` objects that grant `inheritedClusterRoles` on downstream clusters. That access path was added to the explanation.
- The original explanation of the **Standard User** global role was inaccurate. It was updated to match Rancher docs: it is the default for new external-auth users and allows login plus cluster creation, but it does not itself grant visibility into existing clusters.
- The UI navigation for adding and removing cluster members was outdated. It was updated to the documented `Cluster Management` -> `Edit Config` -> `Member Roles` flow.
- The post referenced a built-in cluster `Read-Only` role in the cluster-member UI example. Rancher’s built-in `Read-only` role is a project role, not a cluster role, so that wording was corrected.
- The `ClusterRoleTemplateBinding` YAML example used the wrong object shape and field names for the Rancher Kubernetes API. It incorrectly used `spec`, `roleTemplateId`, and `userPrincipalId`; these were corrected to top-level `clusterName`, `roleTemplateName`, and `userPrincipalName`.
- The `ClusterRoleTemplateBinding` example used `kubectl apply` with `generateName`. This was changed to `kubectl create`, which matches Rancher’s documented `generateName` workflows.
- The revoke and audit examples used incorrect RK-API field names such as `roleTemplateId` and only considered cluster bindings. They were corrected to `roleTemplateName` and expanded to account for project bindings, which can also grant cluster visibility.
- The prerequisite said `Rancher v2.7+`, but the post uses `kubectl` with the Rancher Kubernetes API, which Rancher documents from v2.8 onward. The prerequisite was updated to `Rancher v2.8+`.

## Review Notes
- The legacy top-level `/v3` API examples for `curl` were left in place because Rancher still documents the previous v3 API as available.
- Project-based access is stored via `ProjectRoleTemplateBinding` resources in each project’s backing namespace on the management cluster, so complete access audits must include those namespaces.
- The Terraform arguments used in the post are valid, but the snippet assumes the referenced `rancher2_cluster.*` resources and `rancher2_principal` data sources are defined elsewhere in the user’s Terraform configuration.
