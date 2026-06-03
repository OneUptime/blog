# Validation Summary: How to Configure CloudWatch Dashboards with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon CloudWatch Dashboards
- Amazon CloudWatch dashboard widgets
- Amazon CloudWatch Logs Insights dashboard widgets
- Amazon CloudWatch metric math
- Terraform
- HashiCorp AWS Provider

## Sources Consulted
- AWS CloudWatch Dashboard Body Structure and Syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Dashboard-Body-Structure.html
- AWS CloudWatch dashboard variables documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch_dashboard_variables.html
- AWS CloudWatch dashboard widgets documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/add_remove_line_dashboard.html
- Terraform AWS Provider `aws_cloudwatch_dashboard` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_dashboard
- Terraform AWS Provider source documentation for `aws_cloudwatch_dashboard`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudwatch_dashboard.html.markdown
- Terraform `jsonencode` function documentation: https://developer.hashicorp.com/terraform/language/functions/jsonencode
- Referenced OneUptime Metrics Math post: https://oneuptime.com/blog/post/2026-02-12-cloudwatch-metrics-math-expressions/view
- Referenced OneUptime CloudWatch alarms post: https://oneuptime.com/blog/post/2026-02-12-cloudwatch-alarms-terraform/view

## Issues Found
- The post said "CloudWatch supports several widget types. Here's each one in Terraform," but the official dashboard body schema also supports the `explorer` widget type. Changed this to "Here are common ones in Terraform" so the covered examples are not presented as exhaustive.
- The post said CloudWatch does not have template variables like Grafana. CloudWatch officially supports dashboard variables, including property and pattern variables. Changed the section heading and introductory sentence to distinguish CloudWatch dashboard variables from Terraform variables used to generate dashboard definitions.

## Review Notes
The dashboard JSON structure, widget layout fields, metric/text/log/alarm widget examples, metric math expressions, and Terraform `jsonencode` usage match the official documentation. Terraform is not installed in the workspace, so syntax was reviewed against documentation rather than with `terraform validate`.
