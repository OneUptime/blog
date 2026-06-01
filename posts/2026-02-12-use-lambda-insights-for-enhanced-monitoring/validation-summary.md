# Validation Summary: How to Use Lambda Insights for Enhanced Monitoring

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- AWS Lambda
- Amazon CloudWatch Lambda Insights
- Amazon CloudWatch metrics and alarms
- CloudWatch Logs Insights
- AWS CLI
- AWS CloudFormation
- AWS Serverless Application Model (SAM)
- IAM managed policies

## Sources Consulted
- Amazon CloudWatch documentation: Lambda Insights overview, https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Lambda-Insights.html
- Amazon CloudWatch documentation: Use the AWS CLI to enable Lambda Insights, https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Lambda-Insights-Getting-Started-cli.html
- Amazon CloudWatch documentation: Lambda Insights metrics for Lambda functions, https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Lambda-Insights-metrics-lambda-functions.html
- Amazon CloudWatch documentation: x86-64 Lambda Insights extension versions, https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Lambda-Insights-extension-versionsx86-64.html
- Amazon CloudWatch documentation: ARM64 Lambda Insights extension versions, https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Lambda-Insights-extension-versionsARM.html
- Amazon CloudWatch documentation: Viewing Lambda Insights metrics, https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Lambda-Insights-view-metrics.html
- AWS managed policy reference: CloudWatchLambdaInsightsExecutionRolePolicy, https://docs.aws.amazon.com/aws-managed-policy/latest/reference/CloudWatchLambdaInsightsExecutionRolePolicy.html

## Issues Found
- The Lambda Insights layer ARN examples used x86-64 layer version 49 for us-east-1, which is no longer current. Updated the examples to version 64 and clarified that the sample ARN is for x86-64 in us-east-1.
- The CloudFormation and SAM snippets interpolated only the Region while hard-coding the layer publisher account and version, but AWS documents different ARNs by Region and architecture. Changed those snippets to accept the full layer ARN as a parameter.
- The metric table listed `tmp_max` as total `/tmp` capacity and `threads` as a metric. AWS documents `tmp_free` as the CloudWatch metric for available `/tmp` space and `threads_max` as the log field for thread usage. Updated those names and descriptions, and clarified that the table covers both metrics and log fields.
- The `date` examples used BSD/macOS `date -v` syntax. Changed them to GNU `date -d` syntax, which is the expected form in common Linux and AWS CloudShell environments.
- The second `put-metric-alarm` example had an inline comment after a line-continuation backslash, which would break shell parsing. Removed the inline comment from that command line.

## Review Notes
The examples still use an account ID that is valid for many commercial AWS Regions, but AWS documents region-specific account IDs for some Regions and a separate `LambdaInsightsExtension-Arm64` layer name for ARM64 functions. Readers should use the documented ARN for their function's Region and architecture.
