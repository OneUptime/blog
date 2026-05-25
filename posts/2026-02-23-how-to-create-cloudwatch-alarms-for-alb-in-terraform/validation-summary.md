# Validation Summary: How to Create CloudWatch Alarms for ALB in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS provider
- Amazon CloudWatch alarms
- Amazon CloudWatch metric math
- AWS Application Load Balancer metrics
- Amazon SNS alarm notifications

## Sources Consulted
- AWS Application Load Balancer CloudWatch metrics documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-cloudwatch-metrics.html
- AWS CloudWatch metric math documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/using-metric-math.html
- Terraform AWS provider `aws_cloudwatch_metric_alarm` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- Terraform AWS provider `aws_sns_topic` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic
- Terraform AWS provider requirements documentation: https://developer.hashicorp.com/terraform/language/providers/requirements

## Issues Found
- The `UnHealthyHostCount` alarm used the `Maximum` statistic. AWS recommends monitoring non-zero `UnHealthyHostCount` with the `Minimum` statistic to detect when targets are considered unhealthy by every load balancer node and Availability Zone. Changed the alarm statistic from `Maximum` to `Minimum`.

## Review Notes
- The ALB metric names, `AWS/ApplicationELB` namespace, load balancer and target group dimension suffix formats, percentile latency statistics, and CloudWatch metric math expression are consistent with AWS documentation.
- The Terraform snippets are syntactically consistent with the AWS provider resource schema, but Terraform CLI is not installed in this environment, so I could not run `terraform fmt` or `terraform validate` locally.
