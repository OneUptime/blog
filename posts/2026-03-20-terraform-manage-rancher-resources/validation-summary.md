# Validation Summary: How to Use Terraform to Manage Rancher Resources - Manage Resources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Rancher Manager
- Rancher2 Terraform provider
- Kubernetes namespaces and projects
- Rancher RBAC role template bindings
- Terraform S3 backend

## Sources Consulted
- Rancher API Keys documentation: https://ranchermanager.docs.rancher.com/reference-guides/user-settings/api-keys
- Rancher2 Terraform provider latest release: https://github.com/rancher/terraform-provider-rancher2/releases/tag/v14.1.0
- Rancher2 provider documentation: https://raw.githubusercontent.com/rancher/terraform-provider-rancher2/v14.1.0/docs/index.md
- Rancher2 `rancher2_cluster` data source documentation: https://raw.githubusercontent.com/rancher/terraform-provider-rancher2/v14.1.0/docs/data-sources/cluster.md
- Rancher2 `rancher2_project` resource documentation: https://raw.githubusercontent.com/rancher/terraform-provider-rancher2/v14.1.0/docs/resources/project.md
- Rancher2 `rancher2_namespace` resource documentation: https://raw.githubusercontent.com/rancher/terraform-provider-rancher2/v14.1.0/docs/resources/namespace.md
- Rancher2 `rancher2_project_role_template_binding` resource documentation: https://raw.githubusercontent.com/rancher/terraform-provider-rancher2/v14.1.0/docs/resources/project_role_template_binding.md
- Terraform `plan` command documentation: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Rancher project roles documentation: https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/cluster-and-project-roles

## Issues Found
- The Rancher UI navigation for creating API keys was outdated. Changed **User Settings > API Keys** to **User Avatar > Account & API Keys** to match the current Rancher documentation.
- The Rancher2 provider version constraint pinned the example to the old 4.x line. Updated `version = "~> 4.0"` to `version = "~> 14.0"` because the current official Rancher2 provider release is v14.1.0.

## Review Notes
The Rancher2 resource examples use supported arguments for provider v14.1.0. The Terraform CLI examples use valid `-var` syntax, but production workflows should prefer environment variables, `.tfvars` files, or a secrets manager for API credentials to avoid exposing secrets in shell history. Terraform was not installed in the local environment, so the examples were reviewed against official documentation rather than executed with `terraform validate`.
