# Validation Summary: How to Build a Chaos Engineering Infrastructure with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS Fault Injection Service (AWS FIS)
- AWS Identity and Access Management (IAM)
- Amazon CloudWatch alarms
- Amazon S3 lifecycle configuration and log delivery
- Amazon SNS
- Amazon EventBridge Scheduler
- Amazon ECS, Amazon EC2, Amazon RDS, and Amazon VPC network actions

## Sources Consulted
- HashiCorp Terraform AWS provider documentation for `aws_fis_experiment_template`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/fis_experiment_template
- HashiCorp Terraform AWS provider documentation for `aws_cloudwatch_metric_alarm`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- HashiCorp Terraform AWS provider documentation for `aws_scheduler_schedule`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/scheduler_schedule
- AWS FIS actions reference: https://docs.aws.amazon.com/fis/latest/userguide/fis-actions-reference.html
- AWS FIS targets documentation: https://docs.aws.amazon.com/fis/latest/userguide/targets.html
- AWS FIS experiment logging documentation: https://docs.aws.amazon.com/fis/latest/userguide/monitoring-logging.html
- AWS FIS StartExperiment API reference: https://docs.aws.amazon.com/fis/latest/APIReference/API_StartExperiment.html
- AWS Fault Injection Service IAM service authorization reference: https://docs.aws.amazon.com/service-authorization/latest/reference/list_awsfaultinjectionservice.html
- Amazon RDS IAM tag condition documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAM.SpecifyingCustomTags.html
- EventBridge Scheduler universal target documentation: https://docs.aws.amazon.com/scheduler/latest/UserGuide/managing-targets-universal.html
- EventBridge Scheduler context attributes documentation: https://docs.aws.amazon.com/scheduler/latest/UserGuide/managing-schedule-context-attributes.html

## Issues Found
- Updated the AWS FIS product name from "AWS Fault Injection Simulator" to the current "AWS Fault Injection Service."
- Replaced the invalid Application Load Balancer metric name `5XXError` with `HTTPCode_Target_5XX_Count`.
- Replaced `statistic = "p99"` with `extended_statistic = "p99"` for the CloudWatch percentile alarm, because Terraform uses `extended_statistic` for percentile statistics.
- Adjusted the SNS description so the post no longer implies that the SNS topic alone sends experiment notifications.
- Removed the unsupported `duration` parameter from the `aws:ecs:stop-task` FIS action.
- Added ECS task target parameters for `cluster` and `service`, matching AWS FIS target requirements for ECS task discovery.
- Split IAM permissions so tag-scoped EC2 and RDS write actions are separate from unscoped describe actions used for target resolution.
- Corrected the RDS tag condition key from `rds:db-tag/ChaosEnabled` to `rds:cluster-tag/ChaosEnabled` for DB cluster failover.
- Added required permissions for AWS FIS network disruption actions and tag-based target resolution.
- Corrected FIS logging permissions by separating `logs:CreateLogDelivery`, S3 bucket policy permissions, and S3 object write permissions.
- Added the missing EventBridge Scheduler schedule group and scheduler execution role.
- Corrected the EventBridge Scheduler universal target input for FIS `StartExperiment` to use `experimentTemplateId` and a dynamic `clientToken`.
- Added the required FIS and service-linked-role permissions for the scheduler role to start experiments.

## Review Notes
The post still uses illustrative Terraform snippets rather than a complete standalone module. Variables such as `var.alb_arn_suffix`, `var.ecs_cluster_name`, and `var.ecs_service_name` must be defined by the reader's surrounding Terraform configuration.
