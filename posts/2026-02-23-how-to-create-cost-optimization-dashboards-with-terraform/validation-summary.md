# Validation Summary: How to Create Cost Optimization Dashboards with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS CloudWatch dashboards and metric alarms
- Amazon EventBridge / CloudWatch Events
- AWS Lambda
- Amazon ECS on AWS Fargate
- Amazon EBS, Amazon RDS, Amazon EC2, and NAT Gateway metrics
- Azure Portal dashboards
- Azure Monitor VM metrics
- Grafana

## Sources Consulted
- Terraform AWS provider `aws_cloudwatch_dashboard`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_dashboard
- AWS CloudWatch dashboard body syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/CloudWatch-Dashboard-Body-Structure.html
- Terraform AWS provider `aws_cloudwatch_event_rule`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_rule
- Terraform AWS provider `aws_cloudwatch_event_target`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_target
- Terraform AWS provider `aws_lambda_permission`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission
- AWS Lambda Python runtime documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-python.html
- Terraform AWS provider `aws_cloudwatch_metric_alarm`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- AWS CloudWatch alarm metric math documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarm-data-queries.html
- AWS billing alarm documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/monitor_estimated_charges_with_cloudwatch.html
- Amazon EBS CloudWatch metrics: https://docs.aws.amazon.com/ebs/latest/userguide/using_cloudwatch_ebs.html
- Amazon VPC NAT Gateway metrics: https://docs.aws.amazon.com/vpc/latest/userguide/metrics-dimensions-nat-gateway.html
- Terraform AzureRM provider `azurerm_portal_dashboard`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/portal_dashboard
- Azure Monitor VM metrics: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-compute-virtualmachines-metrics

## Issues Found
- The introduction described dashboards as showing "real-time spending." AWS billing metrics are updated several times daily rather than in true real time, so the wording was changed to "spending signals."
- The EBS widget title said "Read/Write IOPS" but only included `VolumeReadOps`. Added `VolumeWriteOps` metrics using `concat()` so the widget matches the title.
- The EventBridge target for the Lambda function lacked `aws_lambda_permission`, which is required for EventBridge to invoke Lambda. Added the permission resource scoped to the rule ARN.
- The Azure dashboard snippet used `azurerm_dashboard`, which is not the current AzureRM resource name for shared Azure Portal dashboards. Changed it to `azurerm_portal_dashboard`.
- The savings alarm uses the `AWS/Billing` `EstimatedCharges` metric, which must be alarmed from `us-east-1`. Added a provider alias reference and comment to make the regional requirement explicit.

## Review Notes
- Several snippets remain partial examples and depend on surrounding resources not shown in the post, such as IAM roles, provider aliases, Lambda package data sources, security groups, load balancers, and variables.
- The Grafana ECS example stores the admin password as a container environment variable. This works technically, but a production implementation should use ECS secrets backed by AWS Secrets Manager or SSM Parameter Store.
