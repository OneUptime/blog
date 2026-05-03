# Validation Summary: How to Create New Relic Alert Policies with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform
- New Relic Terraform provider (`newrelic/newrelic` v3.x)
- New Relic Alerts (alert policies, NRQL alert conditions, alert channels)
- NRQL (New Relic Query Language)
- Notification integrations: Email, Slack, PagerDuty

## Sources Consulted
- [New Relic Terraform Provider Registry](https://registry.terraform.io/providers/newrelic/newrelic/latest/docs)
- [newrelic_alert_policy resource](https://registry.terraform.io/providers/newrelic/newrelic/latest/docs/resources/alert_policy)
- [newrelic_nrql_alert_condition resource](https://registry.terraform.io/providers/newrelic/newrelic/latest/docs/resources/nrql_alert_condition)
- [newrelic_alert_channel resource](https://registry.terraform.io/providers/newrelic/newrelic/latest/docs/resources/alert_channel)
- [newrelic_alert_policy_channel resource](https://registry.terraform.io/providers/newrelic/newrelic/latest/docs/resources/alert_policy_channel)
- [newrelic_notification_destination resource](https://registry.terraform.io/providers/newrelic/newrelic/latest/docs/resources/notification_destination)
- [newrelic_workflow resource](https://registry.terraform.io/providers/newrelic/newrelic/latest/docs/resources/workflow)
- [Choose your aggregation method | New Relic Docs](https://docs.newrelic.com/docs/alerts/create-alert/fine-tune/choose-your-aggregation-method/)
- [Streaming alerts: key terms and concepts | New Relic Docs](https://docs.newrelic.com/docs/alerts/create-alert/fine-tune/streaming-alerts-key-terms-concepts/)
- [terraform-provider-newrelic releases](https://github.com/newrelic/terraform-provider-newrelic/releases)

## Issues Found
No technical issues found. All code samples are syntactically correct and use valid attributes/values for the current `newrelic/newrelic` v3.x provider:

- Provider config: `account_id`, `api_key`, and `region` are correct attribute names; `"US"` and `"EU"` are the valid region values.
- `newrelic_alert_policy.incident_preference` values (`PER_POLICY`, `PER_CONDITION`, `PER_CONDITION_AND_TARGET`) are correct.
- `newrelic_nrql_alert_condition` schema is correct: `type = "static"`, `nrql { query }` block, `critical`/`warning` blocks with `operator`, `threshold`, `threshold_duration`, `threshold_occurrences`, plus `aggregation_window`, `aggregation_method = "event_flow"`, and `aggregation_delay = 120` (within the 1200-second max for `event_flow`).
- NRQL queries (`percentage(count(*), WHERE ...)` and `percentile(duration, 95) FROM Transaction`) use valid NRQL syntax.
- `newrelic_alert_channel` config blocks for `email` (`recipients`, `include_json_attachment`), `slack` (`url`, `channel`), and `pagerduty` (`service_key`) are accurate.
- `newrelic_alert_policy_channel` with `policy_id` + `channel_ids` is correct.
- `for_each` usage with `toset(local.teams)` and `each.key` is idiomatic OpenTofu/Terraform.

## Review Notes
- **Deprecation notice (important caveat):** The `newrelic_alert_channel` and `newrelic_alert_policy_channel` resources used in the "Notification Channels" and "Connecting Channels to Policy" sections are deprecated by the provider. They still function in v3.x but New Relic recommends migrating to the newer `newrelic_notification_destination` + `newrelic_notification_channel` + `newrelic_workflow` resources. The post does not mention this. A future revision should either replace those examples with the workflow-based approach or add a callout pointing readers to the migration path. Code as written remains valid for now and will not error, so the post is not technically incorrect.
- The author wrote `aggregation_window = 60` with a comment "Evaluate every minute, look back 1 minute" — this is consistent with how the aggregation window works (1-minute window in seconds).
- `threshold_occurrences = "ALL"` is accepted by the provider (valid values are `ALL`/`AT_LEAST_ONCE`, case-insensitive).
- `version = "~> 3.0"` is appropriate; the latest v3 release at time of review (April 2026) is v3.84.x.
