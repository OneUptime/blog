# Validation Summary: How to Create a CloudWatch Alarm with OpenTofu on AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform-compatible HCL
- AWS CloudWatch metric alarms
- AWS CloudWatch composite alarms
- AWS SNS
- Amazon EC2
- Amazon RDS
- Amazon ECS
- AWS Application Auto Scaling

## Sources Consulted
- Amazon CloudWatch concepts: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch_concepts.html
- Create a CloudWatch alarm based on a metric math expression: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Create-alarm-on-metric-math-expression.html
- Composite alarms: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarm-combining.html
- Configuring how CloudWatch alarms treat missing data: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarms-and-missing-data.html
- CloudWatch metrics that are available for your instances: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/viewing_metrics_with_cloudwatch.html
- Amazon ECS CloudWatch metrics: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/available-metrics.html
- Amazon CloudWatch dimensions for Amazon RDS: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/dimensions.html
- Metrics collected by the CloudWatch agent: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/metrics-collected-by-CloudWatch-agent.html
- Manually create or edit the CloudWatch agent configuration file: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Agent-Configuration-File-Details.html
- Step scaling policies for Application Auto Scaling: https://docs.aws.amazon.com/autoscaling/application/userguide/application-auto-scaling-step-scaling-policies.html
- Terraform AWS provider `aws_cloudwatch_metric_alarm`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- Terraform AWS provider `aws_cloudwatch_composite_alarm`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_composite_alarm
- Terraform AWS provider `aws_sns_topic_subscription`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic_subscription
- Terraform AWS provider `aws_appautoscaling_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appautoscaling_policy

## Issues Found
- The introduction said "CloudWatch alarms watch a single metric and take actions when it crosses a threshold." That is too broad because the post also covers composite alarms, and AWS documents metric alarms as monitoring either a single metric or a metric math expression and acting on state changes. I changed this line accordingly.
- The composite example used the CloudWatch Agent `CWAgent` `mem_used_percent` metric with only the `InstanceId` dimension. AWS documents that custom metrics require the exact published dimension set, and CloudWatch Agent commonly publishes additional dimensions such as `ImageId`, `InstanceType`, and sometimes `AutoScalingGroupName`. That made the original snippet unreliable unless the agent had been configured very specifically. I replaced it with the built-in EC2 `StatusCheckFailed` metric and updated the composite rule and description accordingly.
- The Auto Scaling example wires a manually created CloudWatch alarm to `aws_appautoscaling_policy.scale_out.arn`, which corresponds to step scaling. I clarified the inline comment so readers do not confuse this with target tracking, which manages its own alarms.
- The conclusion claimed alarms are "always" co-located with the resources they monitor and said to "always" configure both `alarm_actions` and `ok_actions`. Both claims were too absolute, so I softened them to accurate guidance.

## Review Notes
- The SNS email subscription example is valid, but AWS requires the recipient to confirm the email subscription before notifications are delivered.
- The EC2 CPU example uses `period = 300`, which matches standard 5-minute basic monitoring for EC2. If detailed monitoring is enabled, 60-second periods are also valid.
- The RDS `DatabaseConnections` example is technically correct, but the threshold should be tuned to the engine and instance class rather than treated as a universal default.
- The post was reviewed against current AWS and provider documentation, but the snippets were not executed in this workspace because they depend on AWS provider access and account-specific resources.
