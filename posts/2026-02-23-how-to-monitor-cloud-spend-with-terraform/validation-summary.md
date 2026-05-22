# Validation Summary: How to Monitor Cloud Spend with Terraform

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Terraform
- AWS Budgets
- Amazon SNS
- Amazon CloudWatch billing metrics and dashboards
- AWS Cost and Usage Reports
- Amazon Athena
- AWS Glue crawlers
- AWS Lambda
- Amazon EventBridge / CloudWatch Events
- AWS Cost Explorer and Cost Anomaly Detection

## Sources Consulted
- Terraform AWS provider documentation for `aws_budgets_budget`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/budgets_budget
- Terraform AWS provider documentation for `aws_ce_anomaly_subscription`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ce_anomaly_subscription
- Terraform AWS provider documentation for `aws_athena_database`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/athena_database
- Terraform AWS provider documentation for `aws_cur_report_definition`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cur_report_definition
- AWS CloudWatch documentation for estimated charges metrics: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/monitor_estimated_charges_with_cloudwatch.html
- AWS Cost Management documentation for AWS Budgets SNS topic permissions: https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-sns-policy.html
- AWS Cost Management documentation for Cost Anomaly Detection SNS topic permissions: https://docs.aws.amazon.com/cost-management/latest/userguide/ad-SNS.html
- AWS Data Exports documentation for Cost and Usage Report S3 bucket policy: https://docs.aws.amazon.com/cur/latest/userguide/cur-s3.html
- AWS Data Exports documentation for querying CUR with Athena: https://docs.aws.amazon.com/cur/latest/userguide/cur-query-athena.html

## Issues Found
- The introduction claimed Terraform provides real-time visibility into cloud spending. AWS CloudWatch billing metrics are calculated and published several times daily, so I changed this to "ongoing visibility."
- The AWS Budgets examples used `subscriber_sns_topic_arns` but did not grant `budgets.amazonaws.com` permission to publish to the SNS topic. I added an `aws_sns_topic_policy` statement for AWS Budgets and added explicit dependencies from the budget resources.
- The Cost Anomaly Detection example sent alerts to SNS but did not grant `costalerts.amazonaws.com` permission to publish to the topic. I added the required SNS topic policy statement and dependency.
- The Cost and Usage Report bucket policy omitted the documented `aws:SourceArn` and `aws:SourceAccount` conditions used by AWS for CUR delivery. I added those conditions to both CUR S3 policy statements.

## Review Notes
The examples remain partial snippets and assume supporting variables, provider configuration, Lambda package source, and the Glue IAM role exist elsewhere. CloudWatch billing metrics also require billing alerts to be enabled and are stored in `us-east-1`, which the dashboard snippet correctly uses.
