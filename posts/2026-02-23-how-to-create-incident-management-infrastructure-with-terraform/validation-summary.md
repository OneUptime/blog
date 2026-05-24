# Validation Summary: How to Create Incident Management Infrastructure with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (>= 1.5.0)
- HashiCorp AWS provider (~> 5.0)
- PagerDuty Terraform provider (PagerDuty/pagerduty ~> 3.0)
- PagerDuty (teams, users, escalation policies, schedules, services, service integrations, vendors)
- AWS SNS (topics, subscriptions)
- AWS CloudWatch (metric alarms)
- AWS Lambda (functions, permissions)
- AWS IAM (referenced)

## Sources Consulted
- PagerDuty Terraform provider docs: https://registry.terraform.io/providers/PagerDuty/pagerduty/latest/docs
  - `pagerduty_team`, `pagerduty_team_membership`, `pagerduty_user` (data source)
  - `pagerduty_escalation_policy`, `pagerduty_schedule`
  - `pagerduty_service`, `pagerduty_service_integration`, `pagerduty_vendor` (data source)
- HashiCorp AWS provider docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
  - `aws_sns_topic`, `aws_sns_topic_subscription`
  - `aws_cloudwatch_metric_alarm`
  - `aws_lambda_function`, `aws_lambda_permission`
- AWS API Gateway CloudWatch metrics documentation (for the `5XXError` metric in the `AWS/ApiGateway` namespace)
- AWS Lambda runtime support policy (for python3.x runtime deprecation timelines)
- PagerDuty CloudWatch integration guide (for the SNS-to-PagerDuty endpoint format)

## Issues Found
1. **Inaccurate comment on `acknowledgement_timeout`.** The original comment described the attribute as "Alert creation timeout," which is incorrect. Per the PagerDuty docs, `acknowledgement_timeout` is the time in seconds before an acknowledged incident is re-triggered if not resolved. The `auto_resolve_timeout` comment ("if not acknowledged") was also slightly misleading, since auto-resolve fires when an incident isn't *resolved*, not when it isn't acknowledged. Fixed both comments to reflect the actual behaviour.
2. **Outdated Lambda runtime.** The post used `python3.11`, which is still supported but scheduled for deprecation (June 2027) and runs on the soon-to-be-EOL Amazon Linux 2 base. Updated to `python3.12` (Amazon Linux 2023, supported well beyond the post's likely lifetime).

## Review Notes
- The `pagerduty_service.alert_creation = "create_alerts_and_incidents"` argument still works but the field is marked as deprecated/legacy in current PagerDuty provider docs because all new services use the alerts-and-incidents model by default. The line could be dropped in the future without changing behaviour, but it is not yet an error and was left as-is to preserve the author's intent.
- The SNS HTTPS endpoint `https://events.pagerduty.com/integration/{integration_key}/enqueue` is the legacy Events API v1 URL. PagerDuty still documents this format specifically for SNS-based CloudWatch integrations because SNS wraps the payload in its own envelope that the integration endpoint knows how to unwrap. The newer Events API v2 (`/v2/enqueue` with `routing_key` in the body) expects a different payload format that bare SNS cannot produce, so the v1 URL is intentional here and was left as-is.
- The `data.pagerduty_vendor "Amazon CloudWatch"` lookup uses a fuzzy match in the PagerDuty provider, so the capitalisation works either way. No change needed.
- All other PagerDuty and AWS resource attributes (escalation policy rules, schedule layers, team membership roles, SNS subscription attributes, CloudWatch metric names, Lambda permission fields) were verified against current provider documentation and are accurate.
