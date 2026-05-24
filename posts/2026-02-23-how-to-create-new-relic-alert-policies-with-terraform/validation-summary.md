# Validation Summary: How to Create New Relic Alert Policies with Terraform

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Terraform (HCL)
- New Relic Terraform provider (newrelic/newrelic ~> 3.0)
- New Relic Alerts (alert policies, NRQL conditions, baseline/anomaly conditions)
- NRQL (New Relic Query Language)
- New Relic Notifications & Workflows (destinations, channels, workflows)
- New Relic Infrastructure (SystemSample event)

## Sources Consulted
- New Relic Terraform Provider docs: https://registry.terraform.io/providers/newrelic/newrelic/latest/docs
- `newrelic_alert_policy` resource: https://registry.terraform.io/providers/newrelic/newrelic/latest/docs/resources/alert_policy
- `newrelic_nrql_alert_condition` resource: https://registry.terraform.io/providers/newrelic/newrelic/latest/docs/resources/nrql_alert_condition
- `newrelic_notification_destination` resource: https://registry.terraform.io/providers/newrelic/newrelic/latest/docs/resources/notification_destination
- `newrelic_notification_channel` resource: https://registry.terraform.io/providers/newrelic/newrelic/latest/docs/resources/notification_channel
- `newrelic_workflow` resource: https://registry.terraform.io/providers/newrelic/newrelic/latest/docs/resources/workflow
- NRQL syntax reference: https://docs.newrelic.com/docs/nrql/nrql-syntax-clauses-functions/
- New Relic Infrastructure agent SystemSample attributes: https://docs.newrelic.com/attribute-dictionary/?event=SystemSample

## Issues Found
No technical issues found.

Verified items:
- Provider block uses correct `source = "newrelic/newrelic"` and a valid version constraint (`~> 3.0`).
- Provider attributes `account_id`, `api_key`, `region` are correct.
- `newrelic_alert_policy` accepts `name` and `incident_preference`; values `PER_CONDITION_AND_TARGET` and `PER_POLICY` are valid.
- `newrelic_nrql_alert_condition` attributes — `account_id`, `policy_id`, `type`, `name`, `description`, `enabled`, `violation_time_limit_seconds`, `baseline_direction` — are correct. `type` values `static` and `baseline` are valid; `baseline_direction = "upper_only"` is a valid value.
- The `nrql { query = ... }` and `critical`/`warning` nested blocks with `operator`, `threshold`, `threshold_duration`, `threshold_occurrences` match the v3 schema.
- NRQL queries use valid syntax: `percentage(count(*), WHERE ...)`, `percentile(duration, 95)`, `rate(count(*), 1 minute)`, `average(...) FACET hostname`.
- `SystemSample` attributes `cpuPercent` and `diskUsedPercent` are valid infrastructure agent attributes.
- `newrelic_notification_destination` with `type = "EMAIL"` and a `property { key = "email" ... }` block is the correct shape.
- `newrelic_notification_channel` with `product = "IINT"` (Incident Intelligence) and a subject property is correct for the EMAIL channel.
- `newrelic_workflow` block: `muting_rules_handling = "NOTIFY_ALL_ISSUES"`, an `issues_filter` of `type = "FILTER"` with a `predicate` using `attribute = "labels.policyIds"` and `operator = "EXACTLY_MATCHES"` matches the documented schema, and `destination { channel_id = ... }` is correct.

## Review Notes
- The post intentionally simplifies a few real-world concerns (no `terraform_remote_state` wiring, no module structure, no per-environment workspaces); this is appropriate for an introductory how-to but worth noting for readers building production setups.
- `violation_time_limit_seconds` is the current correct attribute (replacing the deprecated `violation_time_limit`). Good.
- The `region = "US"` literal is fine; `EU` is the other supported option for EU-region accounts.
- The `policy_id` argument on `newrelic_nrql_alert_condition` is a string in the v3 provider — `newrelic_alert_policy.application.id` returns a string, so the references are correct.
- The notification `property` block keys (`email`, `subject`) match the EMAIL destination/channel expectations. Other channel types (SLACK, PAGERDUTY_SERVICE_INTEGRATION, WEBHOOK, etc.) have different required properties, which is out of scope for this post.
- Readers should be aware that `newrelic_alert_channel` / `newrelic_alert_policy_channel` are the older notification model; this post correctly uses the newer Workflows/Destinations/Channels model.
