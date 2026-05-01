# Validation Summary: How to Design a Monitoring Module for OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS Provider for Terraform/OpenTofu
- Amazon CloudWatch
- Amazon SNS
- Amazon ECS
- Application Load Balancer

## Sources Consulted
- OpenTofu type constraints documentation: https://opentofu.org/docs/language/expressions/type-constraints/
- OpenTofu configuration syntax documentation: https://opentofu.org/docs/language/syntax/configuration/
- HCL native syntax specification: https://raw.githubusercontent.com/hashicorp/hcl/main/hclsyntax/spec.md
- AWS provider `aws_cloudwatch_metric_alarm` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudwatch_metric_alarm.html.markdown
- AWS provider `aws_cloudwatch_dashboard` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudwatch_dashboard.html.markdown
- AWS provider `aws_sns_topic_subscription` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/sns_topic_subscription.html.markdown
- CloudWatch dashboard body structure and alarm widget syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/CloudWatch-Dashboard-Body-Structure.html
- Amazon ECS CloudWatch metrics: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/available-metrics.html
- Application Load Balancer CloudWatch metrics: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-cloudwatch-metrics.html
- Amazon SNS subscription confirmation: https://docs.aws.amazon.com/sns/latest/dg/SendMessageToHttp.confirm.html

## Issues Found
- The `variables.tf` example used one-line HCL blocks with multiple arguments separated by semicolons. HCL one-line blocks can contain at most one argument, so I rewrote those variable declarations as standard multi-line blocks.
- The dashboard example always emitted an alarm status widget, even when `var.alarms` was empty. CloudWatch requires an alarm widget to contain 1-100 alarm ARNs, so I changed the widget list to become empty when no alarms are defined.
- The `HTTPCode_ELB_5XX_Count` example description said "More than 10 5xx errors in 1 minute," but the alarm evaluates two 60-second periods and that metric counts load-balancer-generated 5xx responses. I corrected the description to match the actual metric and evaluation window.

## Review Notes
- Email subscriptions created with the SNS `email` protocol require recipient confirmation before notifications are delivered.
