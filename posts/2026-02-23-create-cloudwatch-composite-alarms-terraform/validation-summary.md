# Validation Summary: How to Create CloudWatch Composite Alarms in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- Amazon CloudWatch metric alarms
- Amazon CloudWatch composite alarms
- Amazon SNS
- Application Load Balancer CloudWatch metrics
- Amazon ECS CloudWatch metrics
- Amazon RDS CloudWatch metrics

## Sources Consulted
- Amazon CloudWatch User Guide: Composite alarms - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarm-combining.html
- Amazon CloudWatch User Guide: Alarm suppression - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarm-suppression.html
- Elastic Load Balancing documentation: CloudWatch metrics for Application Load Balancers - https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-cloudwatch-metrics.html
- Amazon ECS Developer Guide: Amazon ECS CloudWatch metrics - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/available-metrics.html
- Terraform Registry: aws_cloudwatch_metric_alarm - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- Terraform Registry: aws_cloudwatch_composite_alarm, AWS provider v5.13.1 - https://registry.terraform.io/providers/hashicorp/aws/5.13.1/docs/resources/cloudwatch_composite_alarm

## Issues Found
- The ALB 5xx metric alarm used `5XXError`, which is not the Application Load Balancer metric name. Changed it to `HTTPCode_Target_5XX_Count`, matching the ALB CloudWatch metrics documentation for target-generated 5xx responses.
- The latency alarm used `statistic = "p99"`. In the HashiCorp AWS provider, percentile statistics for `aws_cloudwatch_metric_alarm` use `extended_statistic`, so this was changed to `extended_statistic = "p99"`.
- The ECS memory alarm described service-level memory utilization but did not include `ClusterName` and `ServiceName` dimensions. Added the dimensions to match ECS service-level metric requirements.
- The `actions_enabled` comment implied it controlled one-time notifications. Reworded it to say it enables actions on composite alarm state changes.
- The action suppression section incorrectly said composite alarms suppress child alarm actions and used a self-referencing suppressor configuration. Rewrote the explanation to state that a suppressor alarm suppresses the composite alarm's own actions, and changed the Terraform example to use an `actions_suppressor { ... }` block with the maintenance-mode metric alarm as the suppressor.
- The action suppression Terraform syntax used flat arguments that are not correct for `hashicorp/aws` provider v5. Replaced them with the provider's documented nested `actions_suppressor` block.

## Review Notes
Terraform was not installed in the local environment, so I could not run `terraform fmt` or `terraform validate`. The snippets were checked manually against official AWS documentation and HashiCorp AWS provider documentation.
