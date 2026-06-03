# Validation Summary: How to Set Up CloudWatch Log Subscriptions

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon CloudWatch Logs subscription filters
- AWS Lambda
- Amazon Kinesis Data Streams
- Amazon Data Firehose
- Amazon OpenSearch Service
- AWS IAM
- AWS CLI
- CloudWatch metrics and alarms

## Sources Consulted
- Amazon CloudWatch Logs User Guide: Log group-level subscription filters: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/SubscriptionFilters.html
- AWS CLI Command Reference: `aws logs put-subscription-filter`: https://docs.aws.amazon.com/cli/latest/reference/logs/put-subscription-filter.html
- Amazon CloudWatch Logs API Reference: `PutSubscriptionFilter`: https://docs.aws.amazon.com/AmazonCloudWatchLogs/latest/APIReference/API_PutSubscriptionFilter.html
- Amazon CloudWatch Logs API Reference: `PutDestination`: https://docs.aws.amazon.com/AmazonCloudWatchLogs/latest/APIReference/API_PutDestination.html
- Amazon CloudWatch Logs User Guide: Cross-account cross-Region subscriptions: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CrossAccountSubscriptions.html
- Amazon CloudWatch Logs User Guide: Filter pattern syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html
- Amazon CloudWatch Logs User Guide: CloudWatch Logs quotas: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/cloudwatch_limits_cwl.html
- Amazon CloudWatch Logs User Guide: Monitoring with CloudWatch metrics: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CloudWatch-Logs-Monitoring-CloudWatch-Metrics.html

## Issues Found
- The Lambda `add-permission` example used a `source-arn` with `/myapp/production/*`, which does not match the documented CloudWatch Logs log group ARN shape for Lambda permissions. Changed it to `arn:aws:logs:us-east-1:123456789012:log-group:/myapp/production/api:*` and added `--source-account` to match AWS's documented confused-deputy mitigation pattern.
- The OpenSearch section showed `aws logs put-subscription-filter` with an OpenSearch domain ARN as `--destination-arn`. Current AWS CLI/API documentation lists Kinesis Data Streams, Firehose, Lambda, and cross-account logical destinations for `put-subscription-filter`; AWS's OpenSearch subscription workflow is documented through the CloudWatch console and provisions Lambda under the hood. Reworded the section to avoid an unsupported CLI command.
- The filter pattern example labeled `{ $.errorStack IS TRUE }` as "field exists." AWS documents `IS TRUE` as matching a field whose value is boolean true, while `EXISTS` is not supported. Changed the label to "Match when a boolean field is true."
- The cross-account section said to create a Kinesis stream or Lambda function in the destination account. AWS cross-account subscription destinations are documented for Kinesis Data Streams and Firehose logical destinations, not Lambda. Changed the wording to Kinesis stream or Firehose delivery stream.
- The `DeliveryThrottling` metric was described as events dropped due to throttling. AWS documents it as events throttled while forwarding, with retry behavior for retryable errors. Updated the description to "events throttled while forwarding to the destination."

## Review Notes
The local environment did not have the AWS CLI installed, so CLI syntax was validated against the current official AWS CLI and API documentation. The post remains a high-level guide; a future improvement could add complete IAM role creation commands for Firehose and OpenSearch workflows.
