# Validation Summary: How to Create Cost Alerts for Serverless with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS Lambda
- Amazon CloudWatch alarms and composite alarms
- Amazon SNS
- Amazon API Gateway REST API usage plans and API keys
- AWS Budgets
- AWS WAF
- AWS Lambda Power Tuning

## Sources Consulted
- AWS Lambda Developer Guide: Types of metrics for Lambda functions: https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics-types.html
- AWS Lambda Developer Guide: Configuring reserved concurrency: https://docs.aws.amazon.com/lambda/latest/dg/configuration-concurrency.html
- AWS Lambda Developer Guide: Configuring provisioned concurrency: https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html
- Amazon API Gateway Developer Guide: Metrics and dimensions: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-metrics-and-dimensions.html
- Amazon API Gateway Developer Guide: Usage plans and API keys for REST APIs: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-api-usage-plans.html
- AWS Cost Management User Guide: Creating an Amazon SNS topic for budget notifications: https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-sns-policy.html
- Terraform AWS Provider: aws_cloudwatch_metric_alarm: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- Terraform AWS Provider: aws_cloudwatch_composite_alarm: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_composite_alarm
- Terraform AWS Provider: aws_lambda_function: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- Terraform AWS Provider: aws_lambda_provisioned_concurrency_config: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_provisioned_concurrency_config
- Terraform AWS Provider: aws_api_gateway_usage_plan: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_usage_plan
- Terraform AWS Provider: aws_api_gateway_api_key: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_api_key
- Terraform AWS Provider: aws_api_gateway_usage_plan_key: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_usage_plan_key
- Terraform AWS Provider: aws_budgets_budget: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/budgets_budget
- Terraform AWS Provider: aws_iam_policy_document: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document
- Terraform AWS Provider: aws_region data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/region

## Issues Found
- The API Gateway `Count` metric alarm used `statistic = "Sum"`. AWS documents that the `Count` metric is represented by the `SampleCount` statistic, so the example now uses `statistic = "SampleCount"`.
- The API Gateway usage plan text implied usage plans enforce rate limits on all APIs. AWS documents usage plans as API-key-based, best-effort throttling and quota controls. The article now describes them as controls for API-key clients, adds an API key and usage plan key association, and notes that AWS Budgets and AWS WAF are stronger controls for cost and request protection.
- The AWS Budgets examples sent notifications to an SNS topic without granting AWS Budgets permission to publish to that topic. The SNS topic example now includes an `aws_sns_topic_policy` generated from `aws_iam_policy_document` with `budgets.amazonaws.com` publish permission and source conditions.
- Adding an SNS topic policy for Budgets would otherwise risk omitting the CloudWatch alarm publisher. The topic policy now also grants `cloudwatch.amazonaws.com` permission to publish alarm notifications for alarms in the current account and region.
- The provisioned concurrency comment said it is more cost-effective than on-demand at scale. AWS documents provisioned concurrency primarily as a cold-start latency feature that incurs additional charges, so the comment now describes it as useful for predictable workloads needing lower cold-start latency.
- The SNS policy example initially used the deprecated `name` attribute from the `aws_region` data source. It now uses `data.aws_region.current.id`.

## Review Notes
- The Lambda metric names, statistics, and dimensions are consistent with AWS Lambda CloudWatch metric documentation.
- The Terraform resource names and arguments used in the examples are current for the AWS provider documentation consulted.
- The API Gateway usage plan example remains a partial snippet; in a complete REST API configuration, methods that should require API keys must be configured accordingly, and public APIs should not rely on usage plans alone for cost protection.
