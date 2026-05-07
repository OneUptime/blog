# Validation Summary: How to Automate User Management in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Rancher v3 API
- Rancher RBAC
- Terraform
- Shell scripting
- Active Directory / external directory group integration

## Sources Consulted
- Rancher v3 API guide: https://ranchermanager.docs.rancher.com/v2.14/api/v3-rancher-api-guide
- Rancher users workflow: https://ranchermanager.docs.rancher.com/api/workflows/users
- Rancher API keys reference: https://ranchermanager.docs.rancher.com/v2.13/reference-guides/user-settings/api-keys
- Rancher cluster and project roles: https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/cluster-and-project-roles
- Rancher tokens workflow: https://ranchermanager.docs.rancher.com/api/workflows/tokens
- Terraform Rancher2 provider registry API: https://registry.terraform.io/v1/providers/rancher/rancher2
- Rancher2 provider user resource docs: https://raw.githubusercontent.com/rancher/terraform-provider-rancher2/master/docs/resources/user.md
- Rancher2 provider global role binding docs: https://raw.githubusercontent.com/rancher/terraform-provider-rancher2/master/docs/resources/global_role_binding.md
- Rancher2 provider cluster role template binding docs: https://raw.githubusercontent.com/rancher/terraform-provider-rancher2/master/docs/resources/cluster_role_template_binding.md
- Rancher2 provider project role template binding docs: https://raw.githubusercontent.com/rancher/terraform-provider-rancher2/master/docs/resources/project_role_template_binding.md
- Rancher2 provider cluster data source docs: https://raw.githubusercontent.com/rancher/terraform-provider-rancher2/master/docs/data-sources/cluster.md
- Rancher generated management v3 user client: https://raw.githubusercontent.com/rancher/rancher/master/pkg/client/generated/management/v3/zz_generated_user.go
- Rancher generated management v3 cluster role template binding client: https://raw.githubusercontent.com/rancher/rancher/master/pkg/client/generated/management/v3/zz_generated_cluster_role_template_binding.go
- Rancher generated management v3 project role template binding client: https://raw.githubusercontent.com/rancher/rancher/master/pkg/client/generated/management/v3/zz_generated_project_role_template_binding.go

## Issues Found
- The `curl` authentication examples were updated to use API-key basic auth via `curl -u`, which is the documented authentication flow for the Rancher v3 API.
- The local-user API example created a user but did not grant the `user-base` global role required for login. I added a `globalrolebindings` call after user creation.
- The batch user-creation example omitted passwords for local users. I changed the CSV format to `username,name,password`, added `mustChangePassword`, and added the `user-base` binding for each created user.
- The cluster role binding example omitted a binding `name` and used a constructed `userPrincipalId`. I changed it to send an explicit `name` and the supported `userId` field.
- The Terraform example pinned an obsolete provider major (`~> 4.0`), referenced an undefined cluster data source, omitted required user passwords and the `user-base` login binding, and used invalid sample role values (`developer`, `viewer`) for a cluster role binding. I updated it to the current 14.x provider line, added the cluster data source, added passwords and `rancher2_global_role_binding`, and switched the sample role IDs to valid Rancher role template IDs.
- The Active Directory sync example queried Rancher users by `email`, but Rancher’s generated management v3 user type does not expose an `email` field. It also created project role bindings without a binding `name`. I replaced the example with direct external-group binding using `groupPrincipalId`, `projectId`, `roleTemplateId`, and `name`.
- The off-boarding example claimed to remove all role bindings but only deleted cluster role template bindings, and it did not guard against missing users. I added a not-found check and deletion loops for global, cluster, and project role bindings.

## Review Notes
- The post still uses Rancher’s previous `/v3` API. Rancher introduced RK-API in v2.8, and the v3 API is described as the previous API in current docs. The examples are still valid after correction, but a future refresh could migrate them to RK-API or `kubectl` workflows.
- Rancher’s token docs note that legacy v3 API tokens are being phased out starting in Rancher v2.14.0. Future automation should track Rancher’s token and API migration guidance closely.
- The Terraform example now uses inline passwords because the `rancher2_user` resource requires them; in production, these values should come from sensitive variables or a secret manager rather than committed defaults.
