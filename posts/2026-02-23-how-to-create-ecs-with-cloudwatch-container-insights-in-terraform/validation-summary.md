# Validation Summary: How to Create ECS with CloudWatch Container Insights in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL, AWS provider)
- AWS ECS (Fargate, task definitions, services, clusters)
- AWS CloudWatch Container Insights
- AWS CloudWatch Logs / Logs Insights
- AWS CloudWatch Metrics / Alarms / Dashboards
- AWS IAM (task roles, execution roles)
- AWS SNS (alerting)
- AWS VPC / Security Groups (data sources)
- CloudWatch Agent (sidecar pattern, StatsD)
- ECS Exec

## Sources Consulted
- Terraform AWS Provider `aws_ecs_cluster` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_cluster
- AWS docs — Amazon ECS Container Insights metrics: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Container-Insights-metrics-ECS.html
- AWS docs — Setting up Container Insights on Amazon ECS: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/deploy-container-insights-ECS-cluster.html
- AWS docs — Send Amazon ECS logs to CloudWatch (awslogs driver): https://docs.aws.amazon.com/AmazonECS/latest/developerguide/using_awslogs.html
- terraform-provider-aws GitHub issue confirming "enhanced" value support: https://github.com/hashicorp/terraform-provider-aws/issues/40445

## Issues Found

1. **Misleading comment about Enhanced Container Insights** — The original code had a comment "Optionally enable enhanced Container Insights for more detailed metrics with shorter collection intervals" placed above the `configuration { execute_command_configuration { ... } }` block. That block actually configures **ECS Exec logging**, not enhanced Container Insights. Enhanced Container Insights is enabled by setting the `setting` block's `value` to `"enhanced"` (not `"enabled"`).
   - **Fix:** Moved the enhanced-Container-Insights note up to the `setting` block (where it actually applies) and clarified that the `configuration` block is for ECS Exec logging.

2. **Invalid Container Insights metric `NetworkTxDropped`** — The "network errors" alarm referenced `NetworkTxDropped` in the `ECS/ContainerInsights` namespace. Dropped-packet fields exist in Container Insights performance log events / enhanced observability, but they are **not first-class published CloudWatch metrics** in the standard `ECS/ContainerInsights` namespace. An alarm on this metric name would never trigger under default Container Insights.
   - **Fix:** Replaced the alarm with one on `NetworkTxBytes` (a standard, published Container Insights metric) with a 1 GB / 5-minute threshold, preserving the spirit of "detect anomalous outbound network activity."

## Review Notes

- `CW_CONFIG_CONTENT` is the correct env var for inline CloudWatch agent config — verified.
- `awslogs-multiline-pattern` is a valid `awslogs` driver option — verified.
- Container Insights metric names used (`CpuUtilized`, `MemoryUtilized`, `CpuReserved`, `MemoryReserved`, `RunningTaskCount`, `DesiredTaskCount`, `NetworkRxBytes`, `NetworkTxBytes`) are all standard published metrics.
- The CPU/memory split between the app (448 CPU / 896 MB) and the cloudwatch-agent sidecar (64 CPU / 128 MB) correctly sums to the task-level totals (512 CPU / 1024 MB) for Fargate.
- IAM trust policy and `cloudwatch:PutMetricData` with `Resource = "*"` are correct (the action does not support resource-level permissions).
- Dashboard URL format (`https://us-east-1.console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=...`) is valid.
- The CloudWatch agent sidecar example uses `essential = false`, which is reasonable for a sidecar but means the app keeps running even if the agent dies — readers should be aware of that trade-off.
