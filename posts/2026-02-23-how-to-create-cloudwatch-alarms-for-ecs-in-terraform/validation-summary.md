# Validation Summary: How to Create CloudWatch Alarms for ECS in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- AWS provider for Terraform
- Amazon ECS
- Amazon CloudWatch alarms and metrics
- Amazon CloudWatch Container Insights
- Amazon EventBridge / CloudWatch Events
- Amazon SNS
- Application Auto Scaling for ECS services

## Sources Consulted
- AWS ECS CloudWatch metrics documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/available-metrics.html
- AWS CloudWatch Container Insights metrics for Amazon ECS: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Container-Insights-metrics-ECS.html
- AWS ECS service deployment state change events: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs_service_deployment_events.html
- AWS ECS service auto scaling step scaling documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-autoscaling-stepscaling.html
- AWS Application Auto Scaling PutScalingPolicy API documentation: https://docs.aws.amazon.com/autoscaling/application/APIReference/API_PutScalingPolicy.html
- AWS EventBridge resource-based policy documentation: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-use-resource-based.html
- AWS EventBridge event pattern comparison operators: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-pattern-operators.html
- Terraform AWS provider `aws_cloudwatch_metric_alarm` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- Terraform AWS provider `aws_cloudwatch_event_rule` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_rule
- Terraform AWS provider `aws_cloudwatch_event_target` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_target
- Terraform AWS provider `aws_appautoscaling_target` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appautoscaling_target
- Terraform AWS provider `aws_appautoscaling_policy` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appautoscaling_policy

## Issues Found
- The EventBridge rules targeted an SNS topic without granting EventBridge permission to publish to that topic. Added an `aws_sns_topic_policy` with an `events.amazonaws.com` principal and `SNS:Publish`, matching AWS EventBridge resource-based policy requirements.
- The stopped-task EventBridge filter used `anything-but` with a literal string, which would only exclude an exact stopped reason. Changed it to `anything-but` with `prefix` so scheduler scaling messages beginning with `Scaling activity initiated by` are excluded correctly.
- The deployment failure rule did not mention that `SERVICE_DEPLOYMENT_FAILED` events are emitted for ECS services with the deployment circuit breaker enabled. Added a short code comment to clarify the requirement.

## Review Notes
- The ECS `CPUUtilization` and `MemoryUtilization` examples use the documented `AWS/ECS` namespace and `ClusterName` / `ServiceName` dimensions.
- The `RunningTaskCount` examples use the documented `ECS/ContainerInsights` namespace and `ClusterName` / `ServiceName` dimensions, but they require Container Insights to be enabled.
- The step scaling examples are technically valid. AWS recommends target tracking for common CPU and request-count scaling cases, but step scaling remains supported.
- Terraform is not installed in this workspace, so local `terraform fmt` / `terraform validate` verification could not be run.
