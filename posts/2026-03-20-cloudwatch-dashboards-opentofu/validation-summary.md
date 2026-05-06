# Validation Summary: How to Set Up CloudWatch Dashboards with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS CloudWatch Dashboards
- Amazon CloudWatch Logs Insights
- AWS Lambda
- Amazon API Gateway
- Amazon RDS
- AWS Billing metrics

## Sources Consulted
- Amazon CloudWatch dashboard body structure and syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/CloudWatch-Dashboard-Body-Structure.html
- Using Amazon CloudWatch dashboards and cross-account observability: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch_crossaccount_dashboard.html
- AWS Lambda metrics reference: https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics-types.html
- Amazon API Gateway metrics and dimensions: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-metrics-and-dimensions.html
- Amazon RDS CloudWatch metrics reference: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-metrics.html
- AWS billing metrics in CloudWatch: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/monitor_estimated_charges_with_cloudwatch.html
- OpenTofu `init` command: https://opentofu.org/docs/cli/init/
- OpenTofu `plan` command: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command: https://opentofu.org/docs/v1.9/cli/commands/apply/
- Terraform Registry `aws_cloudwatch_dashboard` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_dashboard
- Terraform Registry `aws_caller_identity` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/caller_identity

## Issues Found
- The description claimed the post covered ECS metrics, but the post did not include any ECS dashboard example. I changed the description to match the actual resources covered.
- The metric widgets in the service health dashboard omitted the `region` property. I added `region = var.region` because CloudWatch metric widgets require a Region.
- The API Gateway request count metric used `stat = "Sum"`. I changed it to `stat = "SampleCount"` because API Gateway documents `SampleCount` as the request-count statistic for `Count`.
- The alarm widget interpolated `data.aws_caller_identity.current.account_id` without declaring the data source. I added `data "aws_caller_identity" "current" {}` so the example is complete.
- The “cost dashboard” used Lambda `Duration`, which is not a CloudWatch cost metric. I replaced it with the `AWS/Billing` `EstimatedCharges` metric, set the widget Region to `us-east-1`, used the documented `Maximum` statistic, and added the required billing-alert prerequisite.
- The shell example used `${var.project_name}` inside `echo`, which is not valid shell interpolation. I replaced it with shell-safe placeholders.
- The conclusion described cross-account dashboard support as using “account-level dimensions.” I corrected this to the documented `accountId` configuration and tied it to CloudWatch cross-account observability.

## Review Notes
- The API Gateway widget uses the `ApiName` dimension, which is valid for REST API metrics. More granular `ApiName, Method, Resource, Stage` metrics require detailed CloudWatch metrics to be enabled.
- AWS billing metrics are published only in `us-east-1` and update several times per day rather than every minute.
