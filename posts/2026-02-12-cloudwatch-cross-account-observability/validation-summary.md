# Validation Summary: How to Set Up CloudWatch Cross-Account Observability

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon CloudWatch cross-account observability
- CloudWatch Observability Access Manager (OAM)
- AWS CLI
- AWS CloudFormation and StackSets
- CloudWatch Logs Insights
- CloudWatch dashboards
- CloudWatch alarms
- AWS X-Ray
- AWS Organizations and IAM policy condition keys

## Sources Consulted
- AWS CloudWatch cross-account observability: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Unified-Cross-Account.html
- AWS OAM PutSinkPolicy API reference: https://docs.aws.amazon.com/OAM/latest/APIReference/API_PutSinkPolicy.html
- AWS CLI oam create-link reference: https://docs.aws.amazon.com/cli/latest/reference/oam/create-link.html
- AWS CloudFormation AWS::Oam::Link reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-oam-link.html
- AWS CLI cloudwatch get-metric-data reference: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/get-metric-data.html
- AWS CLI logs start-query reference: https://docs.aws.amazon.com/cli/latest/reference/logs/start-query.html
- CloudWatch dashboard body structure and syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Dashboard-Body-Structure.html
- AWS CLI cloudwatch put-metric-alarm reference: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html
- CloudWatch Logs Insights SOURCE syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax-Source.html
- AWS IAM global condition key aws:PrincipalOrgPaths: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html
- AWS X-Ray cross-account tracing: https://docs.aws.amazon.com/xray/latest/devguide/xray-console-crossaccount.html

## Issues Found
- The introduction said telemetry did not need to be copied or replicated. AWS documents that X-Ray traces are copied to monitoring accounts for cross-account tracing, so the wording was changed to say users do not need to build their own replication pipeline.
- The AWS Organizations sink policy used `ForAnyValue:StringEquals` with an OU path while describing all accounts in an OU. IAM documentation requires `StringLike` when using a wildcard to match an OU and child OUs, so the example now uses `ForAnyValue:StringLike` and a valid example OU path pattern.
- The `create-link` example used a literal `account-name` label while the surrounding text described OAM label variables. The example now uses `$AccountName`.
- The metric query section referred to a `--account-id` CLI parameter. `get-metric-data` uses the `AccountId` field inside each `MetricDataQuery`, so the text was corrected.
- The dashboard log widget omitted the required `region` field and embedded the source account in a log group ARN. CloudWatch dashboard log widgets support a cross-account `accountId` property and require `region`, so the example now uses `accountId`, `region`, and the log group name in `SOURCE`.
- The cross-account alarm example used the single-metric `--namespace` / `--metric-name` form without specifying the source account. The example now uses `--metrics` with a `MetricDataQuery` containing `AccountId`, which is the documented way to identify the account containing the watched metric.
- The cost section said cross-account observability had no separate charge without mentioning trace-copy behavior. It now states that logs and metrics have no separate cross-account observability charge, the first trace copy is free, and additional trace copies to monitoring accounts can be charged to the source account.

## Review Notes
- The local environment did not have the AWS CLI installed, so command validation was performed against the current official AWS CLI and AWS API documentation.
- The post focuses on metrics, logs, and traces. CloudWatch cross-account observability now also supports additional telemetry types such as Application Signals, Application Insights applications, and Internet Monitor, but omitting those is acceptable for this guide's scope.
