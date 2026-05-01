# Validation Summary: How to Configure ECS Container Insights with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- HCL / AWS provider
- Amazon ECS
- Amazon CloudWatch
- ECS Container Insights
- AWS CLI

## Sources Consulted
- Setting up Container Insights on Amazon ECS: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/deploy-container-insights-ECS-cluster.html
- Amazon ECS Container Insights metrics: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Container-Insights-metrics-ECS.html
- Container Insights overview: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/ContainerInsights.html
- Amazon ECS CloudWatch metrics: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/available-metrics.html
- Amazon ECS service utilization metrics: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service_utilization.html
- Create a CloudWatch alarm based on a metric math expression: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Create-alarm-on-metric-math-expression.html
- Dashboard Body Structure and Syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/CloudWatch-Dashboard-Body-Structure.html
- `get-metric-statistics` AWS CLI reference: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/get-metric-statistics.html
- AWS provider `aws_ecs_cluster` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_cluster
- AWS provider `aws_ecs_account_setting_default` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_account_setting_default
- AWS provider `aws_cloudwatch_metric_alarm` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- AWS provider `aws_cloudwatch_dashboard` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_dashboard

## Issues Found
- The original CPU alarm treated `CpuUtilized` as a percentage threshold. AWS documents `CpuUtilized` as CPU units, not percent. I changed the alarm to use CloudWatch metric math: `CpuUtilized / CpuReserved * 100`.
- The original memory alarm treated `MemoryUtilized` as a percentage even though AWS documents it as used memory in MiB. I changed the alarm to use `MemoryUtilized / MemoryReserved * 100` and kept the threshold as an actual percentage.
- The dashboard labels did not match AWS’s documented units. `CpuUtilized` was labeled as "cores" even though the metric is CPU units, and `MemoryUtilized` was labeled as "MB" even though AWS notes the actual unit is MiB. I corrected the labels accordingly.
- The network dashboard widget used `Sum` for `NetworkRxBytes` and `NetworkTxBytes`, while AWS documents these metrics with bytes-per-second units. I changed the widget to use `Average` and updated the labels to `B/s`.
- The introduction and conclusion overstated a few points. I reworded them to distinguish standard `AWS/ECS` service metrics from Container Insights metrics, removed the "only way" claim for task-level visibility, and replaced the hard-coded `$0.30/metric/month` pricing statement with a current-docs-safe CloudWatch pricing note.
- The AWS CLI example generated UTC timestamps without an explicit trailing `Z`. I changed the command to emit ISO 8601 timestamps with `Z` so the time zone is unambiguous.

## Review Notes
- AWS now recommends Container Insights with enhanced observability (`enhanced`) for ECS. This post remains valid because standard Container Insights (`enabled`) is still supported and matches the `ECS/ContainerInsights` metrics used in the examples.
- `NetworkRxBytes` and `NetworkTxBytes` are collected only for tasks using the `awsvpc` or `bridge` network modes.
- Some storage-related metrics have platform constraints. For example, EBS filesystem metrics require Fargate platform version `1.4.0` or later or ECS agent version `1.79.0` or later on EC2, and ephemeral storage metrics are available only on Fargate Linux platform version `1.4.0` or later.
- Runtime verification against local CLIs was not possible because `tofu` and `aws` are not installed in this workspace; the review was completed against current official AWS and provider documentation.
