# Validation Summary: How to Create Grafana Alert Rules with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL2 syntax)
- Grafana Alerting (unified alerting model)
- Grafana Terraform Provider (`grafana/grafana`)
- Prometheus (used as the alert data source)
- PromQL (for alert queries)
- Contact point integrations: Email, Slack, PagerDuty

## Sources Consulted
- Grafana Terraform Provider docs: https://registry.terraform.io/providers/grafana/grafana/latest/docs
- `grafana_contact_point` resource: https://registry.terraform.io/providers/grafana/grafana/latest/docs/resources/contact_point
- `grafana_notification_policy` resource: https://registry.terraform.io/providers/grafana/grafana/latest/docs/resources/notification_policy
- `grafana_rule_group` resource: https://registry.terraform.io/providers/grafana/grafana/latest/docs/resources/rule_group
- `grafana_folder` resource: https://registry.terraform.io/providers/grafana/grafana/latest/docs/resources/folder
- `grafana_data_source` data source: https://registry.terraform.io/providers/grafana/grafana/latest/docs/data-sources/data_source
- HCL2 language specification: https://github.com/hashicorp/hcl/blob/main/hclsyntax/spec.md
- Grafana Alerting documentation: https://grafana.com/docs/grafana/latest/alerting/
- Prometheus node_exporter metrics reference

## Issues Found
1. **Invalid HCL semicolon syntax in multiple places.** HCL2 does not support semicolons as attribute separators — attributes inside blocks must be separated by newlines, and one-line blocks are limited to a single attribute. Object expressions inside `jsonencode` use commas or newlines, not semicolons. The following were invalid as written and would fail to parse:
   - `variable "grafana_auth" { type = string; sensitive = true }`
   - `variable "slack_webhook_url" { type = string; sensitive = true }`
   - `variable "pagerduty_integration_key" { type = string; sensitive = true }`
   - `relative_time_range { from = 0; to = 0 }` (used twice in the second rule)
   - Two `jsonencode({ ...; ...; ... })` object literals using semicolons in the second rule
   
   Reformatted each into standard multi-line HCL with newline separators.

2. **Mismatched data source reference.** The Prometheus data source is declared with `data "grafana_data_source" "prometheus"` but the rule blocks referenced it as `grafana_data_source.prometheus.uid` (resource syntax). In Terraform, data source attributes must be accessed via the `data.` prefix. Changed both references to `data.grafana_data_source.prometheus.uid`.

## Review Notes
- The `grafana/grafana` provider version pin `~> 2.0` is becoming dated — by 2026 the provider has progressed to 3.x/4.x. Left unchanged since the resource schemas used in the post are still supported and the author may intentionally be targeting a specific tested baseline.
- The reserved datasource UID `-100` correctly identifies Grafana's expression (server-side) datasource used for `reduce`/`threshold` operations.
- The `no_data_state` and `exec_err_state` values (`NoData`, `Alerting`) are valid choices documented in the provider schema.
- The matcher syntax (`label`, `match = "="`, `value`) in `grafana_notification_policy.policy.matcher` is current and correct.
- The Prometheus PromQL expressions for CPU usage and disk space are standard `node_exporter` patterns and are syntactically correct.
- The `intervalMs` field is included only in the first rule's query model — not strictly required, but harmless. Left as-is to preserve author style.
