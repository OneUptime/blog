# Validation Summary: How to Configure New Relic Provider in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- New Relic Terraform provider
- New Relic alert policies and NRQL alert conditions
- New Relic notification destinations, notification channels, and workflows
- New Relic dashboards
- New Relic synthetic monitors
- New Relic service levels

## Sources Consulted
- New Relic Terraform provider configuration documentation: https://registry.terraform.io/providers/newrelic/newrelic/latest/docs/guides/provider_configuration
- New Relic provider documentation and resource list: https://registry.terraform.io/providers/newrelic/newrelic/latest/docs
- `newrelic_alert_policy` official documentation: https://registry.terraform.io/providers/newrelic/newrelic/latest/docs/resources/alert_policy
- `newrelic_nrql_alert_condition` official documentation: https://registry.terraform.io/providers/newrelic/newrelic/latest/docs/resources/nrql_alert_condition
- `newrelic_notification_destination` official documentation: https://registry.terraform.io/providers/newrelic/newrelic/latest/docs/resources/notification_destination
- `newrelic_notification_channel` official documentation: https://registry.terraform.io/providers/newrelic/newrelic/latest/docs/resources/notification_channel
- `newrelic_workflow` official documentation: https://registry.terraform.io/providers/newrelic/newrelic/latest/docs/resources/workflow
- `newrelic_one_dashboard` official documentation: https://registry.terraform.io/providers/newrelic/newrelic/latest/docs/resources/one_dashboard
- `newrelic_synthetics_monitor` official documentation: https://registry.terraform.io/providers/newrelic/newrelic/latest/docs/resources/synthetics_monitor
- `newrelic_synthetics_script_monitor` official documentation: https://registry.terraform.io/providers/newrelic/newrelic/latest/docs/resources/synthetics_script_monitor
- `newrelic_service_level` official documentation: https://registry.terraform.io/providers/newrelic/newrelic/latest/docs/resources/service_level
- `newrelic_entity` official data source documentation: https://registry.terraform.io/providers/newrelic/newrelic/latest/docs/data-sources/entity

## Issues Found
- The provider region list only mentioned US and EU. Updated it to include JP, which is now listed in the official provider configuration documentation.
- The provider version constraint used `~> 3.50`, which can select newer 3.x provider versions while the synthetic scripted monitor example omitted runtime attributes required by current v3 provider documentation. Updated the version constraint to `~> 3.89` and added `script_language`, `runtime_type`, and `runtime_type_version` to the scripted monitor.
- The Slack notification destination example attempted to create a `SLACK` destination directly with Terraform. Official documentation states Slack destinations can only be imported, updated, or destroyed and cannot be created purely with Terraform. Replaced it with a `newrelic_notification_destination` data source that references an existing Slack destination.
- The PagerDuty notification destination used a non-documented `account` property. Updated it to use the documented `two_way_integration` property and `auth_token` block for `PAGERDUTY_ACCOUNT_INTEGRATION`.
- The workflow filter passed the alert policy ID directly in `values`. The workflow documentation defines `values` as a list of strings, so the policy ID is now converted with `tostring(...)`.

## Review Notes
Terraform CLI is not installed in the workspace, so local `terraform fmt` or provider schema validation could not be run. The review was performed against the current official New Relic Terraform provider documentation.
