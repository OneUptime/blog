# Validation Summary: How to Use Terraform with Incident Management Tools

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- PagerDuty Terraform provider
- PagerDuty teams, schedules, escalation policies, services, and service integrations
- Opsgenie Terraform provider
- Opsgenie teams, schedules, schedule rotations, and escalations
- Incident management and on-call configuration

## Sources Consulted
- PagerDuty Terraform provider documentation: https://registry.terraform.io/providers/PagerDuty/pagerduty/latest/docs
- PagerDuty `pagerduty_schedule` resource documentation: https://registry.terraform.io/providers/PagerDuty/pagerduty/latest/docs/resources/schedule
- PagerDuty `pagerduty_escalation_policy` resource documentation: https://registry.terraform.io/providers/PagerDuty/pagerduty/latest/docs/resources/escalation_policy
- PagerDuty `pagerduty_service` resource documentation: https://registry.terraform.io/providers/PagerDuty/pagerduty/latest/docs/resources/service
- PagerDuty `pagerduty_service_integration` resource documentation: https://registry.terraform.io/providers/PagerDuty/pagerduty/latest/docs/resources/service_integration
- PagerDuty `pagerduty_team_membership` resource documentation: https://registry.terraform.io/providers/PagerDuty/pagerduty/latest/docs/resources/team_membership
- Opsgenie Terraform provider documentation: https://support.atlassian.com/opsgenie/docs/opsgenie-terraform-provider/
- Opsgenie `opsgenie_team` resource documentation: https://registry.terraform.io/providers/opsgenie/opsgenie/latest/docs/resources/team
- Opsgenie `opsgenie_schedule` resource documentation: https://registry.terraform.io/providers/opsgenie/opsgenie/latest/docs/resources/schedule
- Opsgenie `opsgenie_schedule_rotation` resource documentation: https://registry.terraform.io/providers/opsgenie/opsgenie/latest/docs/resources/schedule_rotation
- Opsgenie `opsgenie_escalation` resource documentation: https://registry.terraform.io/providers/opsgenie/opsgenie/latest/docs/resources/escalation

## Issues Found
- The PagerDuty secondary on-call schedule claimed to offset the same users by one position, but the code shifted the schedule start by one full weekly rotation, which would still put the first user first once the schedule began. Changed the `users` expression to rotate the user list by one position.
- The PagerDuty service using `incident_urgency_rule { type = "use_support_hours" }` omitted the required `scheduled_actions` block. Added a support-hours-start urgency change action matching the provider documentation.
- The Opsgenie schedule example described a weekly on-call rotation but only created an `opsgenie_schedule`; Opsgenie rotations are managed separately with `opsgenie_schedule_rotation`. Added a weekly schedule rotation with participants.
- The Opsgenie escalation example used invalid `notify_type` values of `schedule` and `user`. The provider supports values such as `default`, `next`, `previous`, `users`, `admins`, and `all`, so both rules now use `default`.

## Review Notes
- PagerDuty's latest provider documentation marks `alert_creation` and `alert_grouping_parameters` as deprecated, while `events_api_v2_inbound_integration` still documents a requirement for alert creation to be enabled. The snippets remain workable for the provider series used by the post, but future revisions should consider `pagerduty_alert_grouping_setting` for alert grouping configuration.
