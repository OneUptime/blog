# Validation Summary: How to Assign Project Roles in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- Kubernetes
- Rancher RBAC
- Rancher management API
- Terraform (`rancher2` provider)
- `kubectl`
- `curl` and `jq`

## Sources Consulted
- Rancher: Cluster and Project Roles — https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/cluster-and-project-roles
- Rancher: Adding Users to Projects — https://ranchermanager.docs.rancher.com/v2.9/how-to-guides/new-user-guides/add-users-to-projects
- Rancher: Projects workflow — https://ranchermanager.docs.rancher.com/api/workflows/projects
- Rancher: Custom Roles — https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/custom-roles
- Rancher: API Reference — https://ranchermanager.docs.rancher.com/api/api-reference
- Rancher: Previous v3 Rancher API Guide — https://ranchermanager.docs.rancher.com/api/v3-rancher-api-guide
- Rancher Terraform provider: `rancher2_project_role_template_binding` — https://github.com/rancher/terraform-provider-rancher2/blob/master/docs/resources/project_role_template_binding.md
- Kubernetes: `kubectl auth can-i` reference — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/

## Issues Found
- The built-in project role label was written as `Read-Only`. I corrected it to `Read Only` to match Rancher's documented UI role name. I left the Terraform role template ID as `read-only`, which is the correct machine-readable identifier.
- The UI navigation for editing project membership was inaccurate. I replaced the "open the project view and choose Project > Members" flow with Rancher's documented path through `Cluster Management`, `Explore`, `Cluster > Projects/Namespaces`, `Edit Config`, and the `Members` tab.
- The API example used the older top-level `/v3/projectroletemplatebindings` collection and Norman-style fields such as `projectId` and `roleTemplateId`. I replaced it with the currently documented management API path under `/apis/management.cattle.io/v3/.../projectroletemplatebindings` and the correct `projectName`, `roleTemplateName`, `userPrincipalName`, and `groupPrincipalName` fields.
- The custom `RoleTemplate` example incorrectly nested `context`, `displayName`, and `rules` under `spec`. I moved those fields to the top level because Rancher `RoleTemplate` resources use top-level fields in the management API.
- The role-modification instructions suggested editing a project member entry in place. I updated them to remove and re-add the membership with the new role, which is the workflow Rancher documents for changing project membership.
- The permission-check example used `kubectl auth can-i create deployments`. I changed it to `deployments.apps` to use the explicit Kubernetes API resource form documented by `kubectl`.

## Review Notes
- Rancher v2.14 documentation states that the previous `/v3` Rancher API is still available, but Rancher's current public API documentation centers on the management/RK-API endpoints under `/apis/management.cattle.io/v3`.
- Rancher documents an important RBAC caveat: users with the `Owner` or `Member` project role also inherit the cluster-scoped namespace creation role. That affects namespace creation behavior across projects a user belongs to, even though the post's assignment steps are otherwise correct.
