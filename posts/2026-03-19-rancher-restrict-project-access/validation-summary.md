# Validation Summary: How to Restrict User Access to Specific Projects in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- Kubernetes
- RBAC
- Rancher Kubernetes API (`management.cattle.io/v3`)
- Terraform
- `kubectl`
- Bash
- `jq`

## Sources Consulted
- Rancher: Cluster and Project Roles - https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/cluster-and-project-roles
- Rancher: Projects and Kubernetes Namespaces with Rancher - https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/new-user-guides/manage-clusters/projects-and-namespaces
- Rancher: Projects workflow (RK-API examples for projects and project role template bindings) - https://ranchermanager.docs.rancher.com/v2.11/api/workflows/projects
- Rancher: API Reference (`projectroletemplatebindings`, `roletemplates`, `projects`) - https://ranchermanager.docs.rancher.com/v2.10/api/api-reference
- Rancher: Previous v3 Rancher API Guide - https://ranchermanager.docs.rancher.com/v2.14/api/v3-rancher-api-guide
- Rancher Terraform provider: `rancher2_project_role_template_binding` - https://github.com/rancher/terraform-provider-rancher2/blob/main/docs/resources/project_role_template_binding.md
- Rancher Terraform provider: `rancher2_project` - https://github.com/rancher/terraform-provider-rancher2/blob/main/docs/resources/project.md
- Rancher Terraform provider: `rancher2_principal` data source - https://github.com/rancher/terraform-provider-rancher2/blob/main/docs/data-sources/principal.md

## Issues Found
- The post originally omitted that Rancher `Cluster Member` users automatically become `Project Owner` on projects they create. I added that behavior to the access model and the cluster-member removal section because it materially affects isolation.
- The API example used the wrong endpoint shape and outdated field names for current Rancher management API usage. I replaced `/v3/projectroletemplatebindings` plus `projectId`, `roleTemplateId`, and `groupPrincipalId` with the namespaced `management.cattle.io/v3` endpoint and the documented `projectName`, `roleTemplateName`, and `groupPrincipalName` fields.
- The custom `RoleTemplate` YAML was invalid because it nested `context`, `displayName`, and `rules` under `spec`. Rancher `RoleTemplate` resources expose those fields at the top level, so I corrected the YAML and clarified that it must be applied to the Rancher management cluster.
- The UI steps for adding project members referenced `Project > Members`, which does not match Rancher’s documented flow for existing projects. I updated the steps to use the project menu, `Edit Config`, and the `Members` tab.
- The cross-project read-only section overstated isolation. Rancher documents that users who are `Project Owner` or `Project Member` in another project within the same cluster still inherit namespace creation permissions, so I added that caveat.
- The audit script queried `projectroletemplatebindings` in the cluster namespace and printed `roleTemplateId`, but Rancher stores project role template bindings in the project backing namespace and exposes `roleTemplateName` in the Kubernetes-style API. I corrected the script to look up `status.backingNamespace` and report the right field.
- The verification section was ambiguous about which credentials to use. I clarified that the checks should be run with the target user’s Rancher-generated kubeconfig, otherwise the expected authorization failures would not be meaningful.

## Review Notes
- Rancher v2.8.0 introduced the Rancher Kubernetes API, and the previous v3 API remains available but is older. Using `management.cattle.io/v3` examples is the safer choice for current automation guidance.
- The post still fits Rancher v2.7+ conceptually, but readers on newer Rancher versions should prefer the current RK-API and current role-template behavior documented in the 2.10-2.14 docs.
