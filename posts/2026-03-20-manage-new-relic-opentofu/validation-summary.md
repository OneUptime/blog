# Validation Summary: How to Manage New Relic Resources with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- New Relic Terraform/OpenTofu provider
- New Relic Alerts and Workflows notifications
- NRQL
- New Relic dashboards
- New Relic Synthetics

## Sources Consulted
- OpenTofu provider requirements: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu provider configuration: https://opentofu.org/docs/language/providers/configuration/
- New Relic provider registry overview: https://registry.terraform.io/providers/newrelic/newrelic/latest
- New Relic provider configuration guide: https://github.com/newrelic/terraform-provider-newrelic/blob/main/website/docs/guides/provider_configuration.html.markdown
- New Relic `newrelic_alert_policy` resource docs: https://github.com/newrelic/terraform-provider-newrelic/blob/main/website/docs/r/alert_policy.html.markdown
- New Relic `newrelic_nrql_alert_condition` resource docs: https://github.com/newrelic/terraform-provider-newrelic/blob/main/website/docs/r/nrql_alert_condition.html.markdown
- New Relic `newrelic_notification_channel` resource docs: https://github.com/newrelic/terraform-provider-newrelic/blob/main/website/docs/r/notification_channel.html.markdown
- New Relic `newrelic_notification_destination` resource docs: https://github.com/newrelic/terraform-provider-newrelic/blob/main/website/docs/r/notification_destination.html.markdown
- New Relic `newrelic_notification_destination` data source docs: https://github.com/newrelic/terraform-provider-newrelic/blob/main/website/docs/d/notification_destination.html.markdown
- New Relic `newrelic_one_dashboard` resource docs: https://github.com/newrelic/terraform-provider-newrelic/blob/main/website/docs/r/one_dashboard.html.markdown
- New Relic `newrelic_synthetics_monitor` resource docs: https://github.com/newrelic/terraform-provider-newrelic/blob/main/website/docs/r/synthetics_monitor.html.markdown
- New Relic workflow variables: https://docs.newrelic.com/docs/alerts/get-notified/custom-variables-alert-event-workflows/
- New Relic APM event data reference: https://docs.newrelic.com/docs/data-apis/understand-data/event-data/events-reported-apm/
- New Relic ping monitor NerdGraph docs: https://docs.newrelic.com/docs/apis/nerdgraph/examples/synthetics-api/ping-monitor/
- New Relic synthetic public locations reference: https://docs.newrelic.com/docs/synthetics/synthetic-monitoring/administration/synthetic-public-minion-ips/

## Issues Found
- The response-time example was labeled as an APM metric condition even though it uses `newrelic_nrql_alert_condition`. I updated the comment to describe it correctly as an NRQL alert condition.
- The PagerDuty notification channel example omitted required channel properties for `PAGERDUTY_ACCOUNT_INTEGRATION`. I added the required `service` and `email` properties so the example matches the provider schema.
- The Slack example attempted to create a Slack destination with `newrelic_notification_destination`. Current provider docs state Slack destinations are OAuth-based and cannot be created with Terraform. I replaced that example with a data source lookup for an existing Slack destination and a `newrelic_notification_channel` resource using the required `channelId` property.
- The synthetic monitor example used `frequency`, which is not the current argument for `newrelic_synthetics_monitor`. I changed it to `period = "EVERY_5_MINUTES"`.
- The synthetic monitor example used public location identifiers with the `AWS_` prefix. Current NerdGraph-based monitor configuration uses location identifiers without that prefix, so I updated them to `US_EAST_1`, `US_WEST_2`, and `EU_WEST_1`.

## Review Notes
- The post’s `version = "~> 3.0"` constraint is still valid for the current v3 provider line. As of 2026-04-29, the latest registry version is 3.84.1.
- No additional technical issues were found after these corrections.
