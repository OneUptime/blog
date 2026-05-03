# Validation Summary: How to Create PagerDuty Services and Escalation Policies with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- PagerDuty Terraform Provider (`PagerDuty/pagerduty` v3.x)
- PagerDuty resources: `pagerduty_schedule`, `pagerduty_escalation_policy`, `pagerduty_service`, `pagerduty_service_integration`, `pagerduty_response_play`
- PagerDuty data sources: `pagerduty_user`, `pagerduty_vendor`

## Sources Consulted
- PagerDuty Terraform provider source repository: https://github.com/PagerDuty/terraform-provider-pagerduty (cloned at tag v3.32.4)
  - `pagerduty/resource_pagerduty_service.go` — verified schema for `escalation_policy`, `auto_resolve_timeout`, `acknowledgement_timeout`, `incident_urgency_rule`, `alert_creation` and confirmed valid values `create_alerts_and_incidents` / `create_incidents`.
  - `pagerduty/resource_pagerduty_schedule.go` — verified `layer` block fields (`name`, `start`, `rotation_virtual_start`, `rotation_turn_length_seconds`, `users`, `restriction`) and validation ranges (`rotation_turn_length_seconds` 3600..365d; `restriction.duration_seconds` 1..604799; `start_day_of_week` 0..7; restriction `type` allowed values `daily_restriction` / `weekly_restriction`).
  - `pagerduty/resource_pagerduty_escalation_policy.go` — verified `num_loops`, `rule.escalation_delay_in_minutes`, `target.type` allowed values `user_reference` / `schedule_reference`.
  - `pagerduty/resource_pagerduty_service_integration.go` — verified `name`, `service`, `vendor` attributes.
  - `pagerduty/resource_pagerduty_response_play.go` and its `_test.go` — confirmed `from`, `responder`, `subscriber`, `conference_number`, `conference_url`, and that `escalation_policy_reference` is a documented responder type.
  - `pagerdutyplugin/data_source_pagerduty_user.go` — verified `email` is the required lookup attribute.
  - `pagerdutyplugin/data_source_pagerduty_vendor.go` — verified `name` is the required lookup attribute.
- Terraform Registry: https://registry.terraform.io/providers/PagerDuty/pagerduty/latest

## Issues Found
No technical issues found.

## Review Notes
- Provider version constraint `~> 3.0` is correct; the latest published release at review time is v3.32.4, well within that range.
- HCL integer literals (e.g., `auto_resolve_timeout = 14400`) work even though the underlying schema declares `auto_resolve_timeout` and `acknowledgement_timeout` as `TypeString`; Terraform/OpenTofu performs the int-to-string conversion automatically. No change needed.
- `start_day_of_week = 1` correctly maps to Monday (PagerDuty follows ISO 8601: 1 = Monday … 7 = Sunday).
- The `start` and `rotation_virtual_start` timestamps in the schedule example use RFC 3339 format with timezone offset, matching the provider's `validateRFC3339` requirement.
- The deprecated `alert_grouping` / `alert_grouping_timeout` attributes are not used in this post (good); the post sticks to current, non-deprecated arguments.
- Future caveat: `alert_grouping_parameters` is itself now deprecated in favor of the standalone `pagerduty_alert_grouping_setting` resource — worth noting if the post is ever expanded to cover alert grouping.
