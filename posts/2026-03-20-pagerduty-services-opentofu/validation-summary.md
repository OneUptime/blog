# Validation Summary: How to Set Up PagerDuty Services with OpenTofu

## Status
validated

## Post Type
Tutorial / How-To Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- PagerDuty Terraform provider (`PagerDuty/pagerduty`, `~> 3.10`)
- PagerDuty resources: `pagerduty_user` (data), `pagerduty_team`, `pagerduty_team_membership`, `pagerduty_schedule`, `pagerduty_escalation_policy`, `pagerduty_service`, `pagerduty_service_integration`, `pagerduty_vendor` (data)
- Vendor integrations: AWS CloudWatch, Datadog

## Sources Consulted
- PagerDuty Terraform provider source (master branch) — https://github.com/PagerDuty/terraform-provider-pagerduty
- `pagerduty_service` docs — https://github.com/PagerDuty/terraform-provider-pagerduty/blob/master/website/docs/r/service.html.markdown
- `pagerduty_schedule` docs — https://github.com/PagerDuty/terraform-provider-pagerduty/blob/master/website/docs/r/schedule.html.markdown
- `pagerduty_escalation_policy` docs — https://github.com/PagerDuty/terraform-provider-pagerduty/blob/master/website/docs/r/escalation_policy.html.markdown
- `pagerduty_team_membership` docs — https://github.com/PagerDuty/terraform-provider-pagerduty/blob/master/website/docs/r/team_membership.html.markdown
- `pagerduty_service_integration` docs — https://github.com/PagerDuty/terraform-provider-pagerduty/blob/master/website/docs/r/service_integration.html.markdown
- PagerDuty provider releases — https://github.com/PagerDuty/terraform-provider-pagerduty/releases

## Issues Found

1. **`support_hours` block was incorrectly nested inside `incident_urgency_rule`.**
   According to the official `pagerduty_service` docs, `support_hours` is a top-level block of the `pagerduty_service` resource, not a nested block under `incident_urgency_rule`. Moved it to the top level.

2. **Invalid `support_hours.type` value `fixed_time_per_week`.**
   The provider docs only document `fixed_time_per_day` as a valid value. Changed `type = "fixed_time_per_week"` to `type = "fixed_time_per_day"`. The original `days_of_week` list (Mon–Fri) was preserved since `days_of_week` is itself a valid argument under `fixed_time_per_day`.

3. **Missing required `scheduled_actions` block on the database service.**
   The docs state: "A `scheduled_actions` block is required when using `type = "use_support_hours"` in `incident_urgency_rule`." Added a `scheduled_actions` block with `type = "urgency_change"`, `to_urgency = "high"`, and an `at` block referencing `support_hours_start`, matching the canonical example in the upstream docs.

4. **Invalid integration type `datadog_inbound_integration`.**
   This value is not in the provider's documented list of valid `type` values for `pagerduty_service_integration`. The upstream docs explicitly say to use the `pagerduty_vendor` data source for vendor integrations like Datadog. Replaced the resource with the canonical pattern: a `data "pagerduty_vendor" "datadog"` lookup feeding `vendor = data.pagerduty_vendor.datadog.id` on the integration resource.

## Review Notes

- `alert_creation = "create_alerts_and_incidents"` on the API service is technically valid and still appears in the provider's example, but the attribute is marked **deprecated** in the docs ("all services will be migrated to use alerts and incidents... this attribute will be removed in an upcoming version"). Left in place because it is still functional and matches the author's intent, but a future revision could simply remove it.
- The CloudWatch integration was left using `type = "aws_cloudwatch_inbound_integration"`. While the upstream docs recommend the vendor-data-source approach for vendor integrations, `aws_cloudwatch_inbound_integration` is in the provider's documented list of valid generic types and works. To minimize churn, only the broken Datadog example was migrated to the vendor pattern.
- Version pin `~> 3.10` is valid; latest provider version at time of review is around `v3.32.x` and the constraint allows any `>= 3.10, < 4.0`, so the post does not need a version bump.
- `pagerduty_team_membership.role` values used (`manager`, `responder`) are both in the documented allowed set (`observer`, `responder`, `manager`).
- Escalation policy `target.type = "schedule_reference"` is a valid documented value.
- Schedule `layer.name`, `start`, `rotation_virtual_start`, `rotation_turn_length_seconds`, `users`, and top-level `teams` all match the documented schema.
