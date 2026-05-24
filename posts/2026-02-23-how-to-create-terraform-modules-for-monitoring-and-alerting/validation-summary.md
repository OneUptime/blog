# Validation Summary: How to Create Terraform Modules for Monitoring and Alerting

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- AWS CloudWatch (metric alarms, dashboards)
- AWS SNS (topics, subscriptions)
- AWS Lambda (Python 3.11 runtime)
- AWS IAM
- AWS ECS, RDS, ALB (monitored resources)
- PagerDuty (via SNS HTTPS subscription)
- Slack (via webhook + Lambda)

## Sources Consulted
- Terraform AWS provider docs — `aws_sns_topic`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic
- Terraform AWS provider docs — `aws_sns_topic_subscription` (including `endpoint_auto_confirms`): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic_subscription
- Terraform AWS provider docs — `aws_cloudwatch_metric_alarm`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- Terraform AWS provider docs — `aws_cloudwatch_dashboard`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_dashboard
- Terraform AWS provider docs — `aws_lambda_function`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- Terraform AWS provider docs — `aws_region` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/region
- AWS CloudWatch ECS metrics reference: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/cloudwatch-metrics.html
- AWS CloudWatch RDS metrics reference: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-metrics.html
- AWS CloudWatch Application Load Balancer metrics: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-cloudwatch-metrics.html
- AWS CloudWatch dashboard body structure: https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/CloudWatch-Dashboard-Body-Structure.html
- AWS Lambda supported runtimes: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- PagerDuty AWS CloudWatch integration guide (HTTPS endpoint behavior)

## Issues Found
No technical issues found. Verified items include:

- HCL syntax — variables, resources, modules, `count` patterns, ternaries, and `jsonencode` block all parse correctly.
- `aws_sns_topic_subscription.endpoint_auto_confirms` is a real attribute (defaults to false; necessary for PagerDuty HTTPS auto-confirmation).
- CloudWatch metric names and namespaces:
  - `AWS/ECS` → `CPUUtilization`, `MemoryUtilization` with `ClusterName` + `ServiceName` dimensions: correct.
  - `AWS/RDS` → `CPUUtilization`, `FreeStorageSpace`, `DatabaseConnections` with `DBInstanceIdentifier` dimension: correct.
  - `AWS/ApplicationELB` → `HTTPCode_ELB_5XX_Count`, `UnHealthyHostCount` with `LoadBalancer` and `TargetGroup` dimensions: correct (note `UnHealthyHostCount` is intentionally cased that way in CloudWatch).
- Alarm timing math (`period × evaluation_periods`) matches the descriptions in `alarm_description` for every alarm (3 min, 2 min, 15 min).
- `FreeStorageSpace` threshold `5368709120` = 5 × 1024³ bytes = 5 GiB (the comment says "5 GB" — close enough, common shorthand).
- Lambda `python3.11` runtime is currently supported.
- CloudWatch dashboard widget body shape (`type`, `x/y/width/height`, `properties.metrics`, `period`, `stat`, `region`) matches the documented JSON schema.

## Review Notes
- **AWS provider deprecation (non-blocking)**: Starting in AWS provider v6.0 (June 2025), the `name` attribute on the `aws_region` data source was deprecated in favor of `region`. `data.aws_region.current.name` still works as a deprecated alias, but newer code is encouraged to use `data.aws_region.current.region`. The post's code will still apply cleanly; users on provider v6.x will see a deprecation warning.
- The Lambda block in `modules/notifications/main.tf` references `aws_iam_role.slack_lambda[0]` and `data.archive_file.slack_lambda[0]`, which are not shown in the snippet. This is acceptable for a teaching example focused on monitoring patterns, but readers building this end-to-end will need to add the IAM role, trust policy, archive_file data source, and SNS-to-Lambda subscription/permission separately.
- The `unhealthy_hosts` alarm depends on both `var.target_group_arn_suffix` and `var.alb_arn_suffix` (the `LoadBalancer` dimension is required alongside `TargetGroup`), but the resource is only gated on `target_group_arn_suffix != ""`. Not strictly incorrect — users supplying a target group suffix will almost always also supply the ALB suffix — but a stricter gate would be defensive. Not changed since the post's pattern is consistent and works under normal usage.
