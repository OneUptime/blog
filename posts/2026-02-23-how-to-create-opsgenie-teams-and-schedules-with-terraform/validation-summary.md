# Validation Summary: How to Create OpsGenie Teams and Schedules with Terraform

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Terraform (HCL2)
- OpsGenie Terraform Provider (`opsgenie/opsgenie` ~> 0.6)
- OpsGenie (incident management, on-call, escalation, routing, API integrations)

## Sources Consulted
- Terraform Registry — OpsGenie provider docs: https://registry.terraform.io/providers/opsgenie/opsgenie/latest/docs
- `opsgenie_team` resource docs
- `opsgenie_user` data source docs
- `opsgenie_schedule` and `opsgenie_schedule_rotation` resource docs
- `opsgenie_escalation` resource docs
- `opsgenie_team_routing_rule` resource docs
- `opsgenie_api_integration` resource docs
- HashiCorp HCL2 native syntax specification

## Issues Found
- **HCL2 syntax error in variable declaration.** The post originally declared the API key variable as a one-line block with semicolon-separated attributes: `variable "opsgenie_api_key" { type = string; sensitive = true }`. HCL2 native syntax does not support semicolons as attribute separators — multi-attribute one-line blocks are not permitted; only single-attribute compact blocks are. Terraform would fail to parse this. Fixed by expanding to the standard multi-line form with `type` and `sensitive` on separate lines.

## Review Notes
- All other resource schemas verified against the official OpsGenie Terraform provider documentation: `opsgenie_team` (with `member` blocks and `admin`/`user` roles), `opsgenie_user` data source (with `username`), `opsgenie_schedule`, `opsgenie_schedule_rotation` (including `participants` and `time_restriction` with the plural `restrictions` block correctly used for `weekday-and-time-of-day`), `opsgenie_escalation` (with `if-not-acked` condition, `default` notify_type, and `recipient` block), `opsgenie_team_routing_rule` (with `match-all` and `match-all-conditions` criteria types), and `opsgenie_api_integration` (with `AmazonCloudWatch` and `Datadog` types and the computed `api_key` attribute).
- Minor caveat (not a correctness error): the OpsGenie provider only accepts `0` or `30` for `start_min`/`end_min` in the rotation `restrictions` block. The post uses `0`, so this is fine, but readers should be aware.
- The `start_date` values use valid RFC3339 timestamps, which the provider requires.
- The `~> 0.6` provider version constraint matches the current major series of the OpsGenie provider.
