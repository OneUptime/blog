# Validation Summary: How to Create Grafana Alert Rules with OpenTofu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- OpenTofu / Terraform
- Grafana Alerting
- Grafana Terraform provider (`grafana/grafana`)
- Slack, PagerDuty, Email notifiers
- Prometheus (as datasource for the example rule)
- Server-side expressions (`__expr__`) — reduce and threshold

## Sources Consulted
- Grafana Terraform provider — `grafana_contact_point` resource docs (https://github.com/grafana/terraform-provider-grafana/blob/main/docs/resources/contact_point.md)
- Grafana Terraform provider — `grafana_notification_policy` resource docs (https://github.com/grafana/terraform-provider-grafana/blob/main/docs/resources/notification_policy.md)
- Grafana Terraform provider — `grafana_rule_group` resource docs (https://github.com/grafana/terraform-provider-grafana/blob/main/docs/resources/rule_group.md)
- Grafana Terraform provider — `grafana_mute_timing` resource docs (https://github.com/grafana/terraform-provider-grafana/blob/main/docs/resources/mute_timing.md)
- Grafana Terraform provider releases (https://github.com/grafana/terraform-provider-grafana/releases)
- Grafana docs — Use Terraform to provision alerting resources (https://grafana.com/docs/grafana/latest/alerting/set-up/provision-alerting-resources/terraform-provisioning/)

## Issues Found
- **Outdated provider version constraint.** The post pinned the Grafana provider to `~> 2.0`. The current major version (as of 2026) is 4.x, and v2 is several years old. Updated the constraint to `~> 3.0` so readers pick up a supported, modern major version that still contains all the resources used in the post (`grafana_contact_point`, `grafana_notification_policy`, `grafana_rule_group`, `grafana_mute_timing`).

## Review Notes
- All resource schemas verified against the upstream provider documentation:
  - `grafana_contact_point` — `slack { url, recipient, title, text }`, `pagerduty { integration_key, severity }`, and `email { addresses, single_email, message, subject }` all match the documented schema.
  - `grafana_notification_policy` — top-level `contact_point` and `group_by`, nested `policy` blocks with `matcher { label, match, value }` and `group_wait` / `group_interval` / `repeat_interval` are correct.
  - `grafana_rule_group` — `rule { name, condition, data, annotations, labels, no_data_state, exec_err_state, for }` with multi-stage `data` blocks (query → reduce → threshold) using `datasource_uid = "__expr__"` for expression stages is a valid, documented pattern.
  - `grafana_mute_timing` — `intervals { weekdays, times { start, end } }` matches the documented schema.
- The post references `grafana_folder.alerts` and `grafana_data_source.prometheus` without showing those resources. They are obviously placeholders for resources defined elsewhere in the user's configuration, which is a reasonable simplification for a tutorial of this length.
- Latest Grafana provider is 4.x. Readers using `~> 3.0` will be on a still-supported major version; if they prefer the very latest, `~> 4.0` is also a valid choice and the resources used here have been stable across both major versions.
