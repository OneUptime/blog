# Validation Summary: How to Configure PagerDuty Provider in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- PagerDuty Terraform provider
- PagerDuty REST API keys and Events API integrations
- PagerDuty schedules, teams, escalation policies, services, service integrations, event orchestration, and maintenance windows
- AWS ECS and CloudWatch metric alarms

## Sources Consulted
- PagerDuty Terraform provider overview: https://registry.terraform.io/providers/PagerDuty/pagerduty/latest/docs
- PagerDuty Terraform `pagerduty_service` resource: https://registry.terraform.io/providers/PagerDuty/pagerduty/latest/docs/resources/service
- PagerDuty Terraform `pagerduty_schedule` resource: https://registry.terraform.io/providers/PagerDuty/pagerduty/latest/docs/resources/schedule
- PagerDuty Terraform `pagerduty_team_membership` resource: https://registry.terraform.io/providers/PagerDuty/pagerduty/latest/docs/resources/team_membership
- PagerDuty Terraform `pagerduty_service_integration` resource: https://registry.terraform.io/providers/PagerDuty/pagerduty/latest/docs/resources/service_integration
- PagerDuty Terraform `pagerduty_event_orchestration` resource: https://registry.terraform.io/providers/PagerDuty/pagerduty/latest/docs/resources/event_orchestration
- PagerDuty Terraform `pagerduty_event_orchestration_router` resource: https://registry.terraform.io/providers/PagerDuty/pagerduty/latest/docs/resources/event_orchestration_router
- PagerDuty Terraform provider documentation source: https://github.com/PagerDuty/terraform-provider-pagerduty/tree/master/website/docs
- PagerDuty API Access Keys documentation: https://support.pagerduty.com/main/docs/api-access-keys
- PagerDuty Event Orchestration documentation: https://support.pagerduty.com/main/docs/event-orchestration
- PagerDuty Event Orchestration examples / PCL filter semantics: https://support.pagerduty.com/main/docs/event-orchestration-examples
- AWS Terraform `aws_ecs_service` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- AWS CloudWatch alarm documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-cloudwatch-alarm.html

## Issues Found
- The API key creation step said to select "Read/Write" access. PagerDuty's General Access REST API key flow instead uses a "Read-only API Key" checkbox. Changed the instruction to leave that checkbox unchecked so Terraform can create and update resources.
- The provider source used `PagerDuty/pagerduty`. Updated it to the lowercase provider address `pagerduty/pagerduty`, matching the current provider documentation examples.
- The business-hours schedule was described as overriding the primary schedule. A separate PagerDuty schedule does not override another schedule by itself; it only affects routing if referenced where needed. Changed the comment to call it a separate business-hours schedule.
- The service example described `create_incidents` as grouping alerts into incidents. Current PagerDuty provider docs mark `alert_creation` as deprecated and grouping is handled separately; however, the Events API v2 service integration still requires `alert_creation = "create_alerts_and_incidents"`. Removed the inaccurate comments and kept `alert_creation` only on the service used by the Events API v2 integration.
- The CloudWatch vendor lookup used `Amazon CloudWatch`, but the current provider example uses `Cloudwatch` as the vendor name. Updated the data source lookup.
- The auto-resolve comment said incidents auto-resolve if not acknowledged. PagerDuty's `auto_resolve_timeout` resolves incidents left open for that duration. Updated the comment.
- The support-hours urgency example omitted the required `scheduled_actions` block. Added the default `urgency_change` scheduled action at `support_hours_start`, as required by the provider documentation for `use_support_hours` urgency rules.
- The Event Orchestration PCL examples used `matches 'api-*'`, which is equality matching rather than wildcard matching. Updated these to `matches regex` expressions using RE2-compatible patterns.

## Review Notes
Terraform CLI is not installed in this environment, so I could not run `terraform validate`. The HCL snippets were reviewed manually against the current official provider documentation. The AWS section is intentionally partial and assumes referenced AWS resources such as `aws_ecs_cluster.main`, `aws_ecs_task_definition.api`, and `aws_sns_topic.pagerduty` are defined elsewhere.
