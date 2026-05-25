# Validation Summary: How to Create Custom Metrics Collection with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- Amazon CloudWatch metrics, metric filters, alarms, composite alarms, and dashboards
- AWS Lambda
- Amazon EventBridge scheduled rules
- AWS IAM and SNS

## Sources Consulted
- Terraform AWS Provider `aws_cloudwatch_log_metric_filter` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_metric_filter
- Terraform AWS Provider `aws_cloudwatch_metric_alarm` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- Terraform AWS Provider `aws_cloudwatch_dashboard` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_dashboard
- Terraform AWS Provider `aws_lambda_function` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- HashiCorp Terraform provider requirements documentation: https://developer.hashicorp.com/terraform/language/providers/requirements
- Amazon CloudWatch Logs metric filter syntax documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntaxForMetricFilters.html
- Amazon CloudWatch Logs metric filter creation documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CreateMetricFilterProcedure.html
- Amazon CloudWatch Logs `PutMetricFilter` API reference: https://docs.aws.amazon.com/AmazonCloudWatchLogs/latest/APIReference/API_PutMetricFilter.html
- Amazon CloudWatch dashboard body syntax documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/CloudWatch-Dashboard-Body-Structure.html
- Amazon CloudWatch composite alarm documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Create_Composite_Alarm.html
- AWS Lambda runtime documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html

## Issues Found
- The CloudWatch log metric filter example configured both `default_value` and `dimensions` in `metric_transformation`. AWS documentation states that metric filters with dimensions cannot specify default values, and the Terraform AWS Provider marks these arguments as conflicting. I removed the metric filter dimensions and also removed matching `Environment` dimensions from the metric alarms and dashboard metrics so the examples refer to the metrics that the filters actually emit.
- The composite alarm comment said it triggered when both error rate and latency were high, but the referenced alarms were API errors and low order rate. I updated the comment to match the actual alarm rule.

## Review Notes
- Terraform CLI is not installed in this environment, so I could not run `terraform validate`. The snippets were reviewed against official Terraform AWS Provider and AWS documentation instead.
- The Lambda function example assumes that `lambda/metric_publisher.zip` exists and contains a `publisher.handler` entry point; that packaging step is outside the scope of the post but is consistent with the Terraform AWS Provider's Lambda resource behavior.
