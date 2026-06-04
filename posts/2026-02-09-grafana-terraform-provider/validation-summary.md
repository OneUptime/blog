# Validation Summary: How to implement Grafana as code with Terraform provider

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Grafana
- Terraform
- Grafana Terraform provider
- Grafana dashboards, folders, data sources, alert rules, contact points, notification policies, users, teams, and permissions
- GitHub Actions
- AWS Secrets Manager Terraform data source

## Sources Consulted
- Grafana Terraform provider documentation: https://registry.terraform.io/providers/grafana/grafana/latest/docs
- Grafana provider source documentation: https://github.com/grafana/terraform-provider-grafana
- Grafana provider `grafana_data_source` resource docs: https://registry.terraform.io/providers/grafana/grafana/latest/docs/resources/data_source
- Grafana provider `grafana_dashboard` resource docs: https://registry.terraform.io/providers/grafana/grafana/latest/docs/resources/dashboard
- Grafana provider `grafana_rule_group` resource docs: https://registry.terraform.io/providers/grafana/grafana/latest/docs/resources/rule_group
- Grafana provider `grafana_contact_point` resource docs: https://registry.terraform.io/providers/grafana/grafana/latest/docs/resources/contact_point
- Grafana provider `grafana_notification_policy` resource docs: https://registry.terraform.io/providers/grafana/grafana/latest/docs/resources/notification_policy
- Grafana provider `grafana_user` resource docs: https://registry.terraform.io/providers/grafana/grafana/latest/docs/resources/user
- Grafana provider `grafana_team` resource docs: https://registry.terraform.io/providers/grafana/grafana/latest/docs/resources/team
- Grafana provider `grafana_folder_permission` resource docs: https://registry.terraform.io/providers/grafana/grafana/latest/docs/resources/folder_permission
- Grafana provider `grafana_dashboard_permission` resource docs: https://registry.terraform.io/providers/grafana/grafana/latest/docs/resources/dashboard_permission
- GitHub Actions checkout action: https://github.com/actions/checkout
- GitHub Actions checkout releases: https://github.com/actions/checkout/releases
- HashiCorp setup-terraform action: https://github.com/hashicorp/setup-terraform
- HashiCorp setup-terraform releases: https://github.com/hashicorp/setup-terraform/releases
- Terraform releases: https://github.com/hashicorp/terraform/releases

## Issues Found
- The provider version constraint used `~> 2.0`, which is outdated relative to the current Grafana Terraform provider major version. Updated it to `~> 4.0`.
- The provider example mentioned a `service_account_token` argument, but current provider authentication accepts service account tokens through `auth`. Replaced the commented example with `auth = var.grafana_sa_token`.
- The alert rule used `for_duration`, but the current `grafana_rule_group` schema uses `for`. Updated the attribute name.
- The alert expression stage used `datasource_uid = "__expr__"` and an incomplete classic conditions model. Updated the expression datasource UID to `-100` and added the current `datasource`, `refId`, `operator`, and `reducer` fields shown by provider examples.
- The Prometheus alert query model omitted `datasource` and `refId` fields commonly included in Grafana alert rule models. Added them for a complete model.
- The import example described data source import by numeric ID, but the current provider imports data sources by UID. Updated the text and placeholder.
- The alert rule group import example used a single UID, but the current provider imports rule groups with `folderUID:title` or `orgID:folderUID:title`. Updated the example.
- The user management section omitted the `grafana_user` authentication limitation. Added the official caveat that it requires basic auth on self-hosted Grafana and is not compatible with Grafana Cloud.
- The GitHub Actions workflow used older action versions and a pinned old Terraform CLI version. Updated `actions/checkout` to v6, `hashicorp/setup-terraform` to v4, and set `terraform_version` to `1.15.4`.
- The best-practices section advised tagging all resources, but Grafana provider resources do not expose a generic `tags` argument. Reworded this to recommend consistent names, dashboard UIDs, folder titles, and alert labels.

## Review Notes
Terraform CLI is not installed in the local environment, so I could not run `terraform validate` against extracted snippets. The review was performed against the current official Grafana provider resource documentation and official action metadata.
