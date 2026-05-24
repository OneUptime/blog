# Validation Summary: How to Create Grafana Folders and Permissions with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform / HCL
- Grafana
- Grafana Terraform Provider (grafana/grafana)
- Grafana RBAC (folder permissions, dashboard permissions, teams, service accounts, organizations)

## Sources Consulted
- Grafana Terraform Provider — `grafana_folder` resource: https://registry.terraform.io/providers/grafana/grafana/latest/docs/resources/folder
- Grafana Terraform Provider — `grafana_folder_permission` resource: https://registry.terraform.io/providers/grafana/grafana/latest/docs/resources/folder_permission
- Grafana Terraform Provider — `grafana_team` resource: https://registry.terraform.io/providers/grafana/grafana/latest/docs/resources/team
- Grafana Terraform Provider — `grafana_dashboard_permission` resource: https://registry.terraform.io/providers/grafana/grafana/latest/docs/resources/dashboard_permission
- Grafana Terraform Provider — `grafana_service_account` resource: https://registry.terraform.io/providers/grafana/grafana/latest/docs/resources/service_account
- Grafana Terraform Provider — `grafana_service_account_token` resource: https://registry.terraform.io/providers/grafana/grafana/latest/docs/resources/service_account_token
- Grafana Terraform Provider — `grafana_organization` resource: https://registry.terraform.io/providers/grafana/grafana/latest/docs/resources/organization
- HCL2 syntax reference: https://github.com/hashicorp/hcl/blob/main/hclsyntax/spec.md

## Issues Found
1. **Invalid HCL syntax in variable declaration.** The original `variable "grafana_auth" { type = string; sensitive = true }` used `;` as a statement separator, which is not valid HCL2 syntax. Arguments inside a block body must be newline-separated. Rewrote both `grafana_url` and `grafana_auth` variable blocks using the standard multi-line argument format.
2. **Non-existent resource `grafana_team_members`.** The Grafana Terraform provider does not expose a separate `grafana_team_members` resource — team membership is managed via the `members` attribute on the `grafana_team` resource itself. Removed the standalone `grafana_team_members "platform"` resource and moved the members list into the `grafana_team "platform"` block, which matches the official provider documentation.

## Review Notes
- The `permissions` block syntax used for both `grafana_folder_permission` and `grafana_dashboard_permission` (with `team_id` + `permission`) is correct per the provider docs; `permission` accepts `View`, `Edit`, or `Admin`.
- `parent_folder_uid` on `grafana_folder` is correct for nested folders. Note (not a fix): the Grafana instance must have the `nestedFolders` feature flag enabled, and the post does not call this out — could be added as a future improvement, but it's not a technical error.
- `grafana_folder_permission` is a "set" resource: any permissions not listed are removed on apply. The post's comment for the dashboard-level override ("No other teams get access — overrides folder permissions") correctly reflects this behavior.
- The post references `grafana_dashboard.sensitive.uid` without showing the dashboard resource definition. This is acceptable in a focused tutorial snippet.
- `grafana_organization` requires basic-auth provider configuration and is not supported on Grafana Cloud — worth noting in a future revision, but not a technical inaccuracy.
- Provider version pin `~> 2.0` is reasonable; v3.x of the provider also supports all resources used here.
