# Validation Summary: How to Create On-Call Schedule Infrastructure with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (>= 1.5.0)
- PagerDuty Terraform provider (PagerDuty/pagerduty, ~> 3.0)
- PagerDuty resources: `pagerduty_schedule`, `pagerduty_escalation_policy`, `pagerduty_service`, `pagerduty_team`, `pagerduty_team_membership`
- PagerDuty data source: `pagerduty_user`
- HCL `for_each`, `for`, `flatten`, `slice`, `concat`, `dynamic` block patterns

## Sources Consulted
- PagerDuty Terraform provider schedule resource: https://registry.terraform.io/providers/PagerDuty/pagerduty/latest/docs/resources/schedule
- PagerDuty Terraform provider escalation_policy resource: https://registry.terraform.io/providers/PagerDuty/pagerduty/latest/docs/resources/escalation_policy
- PagerDuty Terraform provider service resource: https://registry.terraform.io/providers/PagerDuty/pagerduty/latest/docs/resources/service
- PagerDuty Terraform provider team_membership resource: https://registry.terraform.io/providers/PagerDuty/pagerduty/latest/docs/resources/team_membership
- PagerDuty Terraform provider user data source: https://registry.terraform.io/providers/PagerDuty/pagerduty/latest/docs/data-sources/user
- PagerDuty Terraform provider source: https://github.com/PagerDuty/terraform-provider-pagerduty

## Issues Found
- **Invalid `start_day_of_week` with `daily_restriction`**: All three `restriction` blocks in the follow-the-sun schedule section (US, EU, and APAC coverage) used `type = "daily_restriction"` while also setting `start_day_of_week = 1`. Per the provider documentation, `start_day_of_week` is only valid (and required) when `type = "weekly_restriction"`; combining it with `daily_restriction` is incorrect usage. Removed the `start_day_of_week` line from all three `daily_restriction` blocks.

## Review Notes
- The `start` timestamps use a fixed `-05:00` offset (EST). This is fine when paired with the schedule's `time_zone = "America/New_York"` because PagerDuty re-interprets the start in the schedule's timezone, but readers should be aware the offset doesn't auto-adjust for DST in the literal string. Not a bug.
- The `incident_urgency_rule` with `type = "constant"` and `urgency = "high"` is valid.
- `alert_creation = "create_alerts_and_incidents"`, `auto_resolve_timeout`, and `acknowledgement_timeout` field names and value formats are correct for the v3.x provider.
- `pagerduty_team_membership` role values support `observer`, `responder`, and `manager`; `responder` as used here is valid.
- Target types `schedule_reference` and `user_reference` in escalation policy rules are valid.
- The follow-the-sun example after the fix provides daily coverage including weekends. If weekday-only coverage is desired, readers would need to use `weekly_restriction` with one restriction per weekday. The post does not claim weekday-only coverage, so no change was made.
