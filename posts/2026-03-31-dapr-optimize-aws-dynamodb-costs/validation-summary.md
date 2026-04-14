# Validation Summary: How to Optimize AWS DynamoDB Costs with Dapr

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (state management, DynamoDB state store component)
- AWS DynamoDB (on-demand capacity, provisioned capacity, TTL, partition keys)
- AWS Application Auto Scaling
- AWS CloudWatch (metric statistics, billing alarms)
- Dapr JavaScript SDK
- AWS CLI

## Sources Consulted
- Dapr DynamoDB state store component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-dynamodb/
- Dapr State Management TTL documentation: https://docs.dapr.io/developing-applications/building-blocks/state-management/state-store-ttl/
- Dapr JavaScript SDK documentation: https://docs.dapr.io/developing-applications/sdks/js/js-client/
- Dapr State Management API reference: https://docs.dapr.io/reference/api/state_api/
- AWS CLI `dynamodb update-table` reference: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/update-table.html
- AWS CLI `application-autoscaling register-scalable-target` reference: https://docs.aws.amazon.com/cli/latest/reference/application-autoscaling/register-scalable-target.html
- AWS CLI `dynamodb update-time-to-live` reference: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/update-time-to-live.html
- AWS CLI `cloudwatch put-metric-alarm` reference: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html
- AWS CloudFormation CloudWatch billing alarm template: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/quickref-cloudwatch.html
- AWS Monitor estimated charges with CloudWatch: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/monitor_estimated_charges_with_cloudwatch.html

## Issues Found

1. **Unused `timestamp` variable in TTL code example**: The line `const timestamp = Math.floor(Date.now() / 1000) + 3600;` was computed but never referenced in the code. Dapr's `ttlInSeconds` metadata handles the epoch timestamp conversion internally, making this variable misleading. **Fix:** Removed the unused variable.

2. **Description mentioned "DynamoDB Accelerator" but post had no DAX content**: The post description referenced "DynamoDB Accelerator for read-heavy workloads" but no section in the post discussed DAX. **Fix:** Updated the description to accurately reflect the actual content (CloudWatch monitoring for cost alerts).

3. **Billing alarm missing required `--dimensions` parameter**: The `EstimatedCharges` metric in the `AWS/Billing` namespace requires `--dimensions Name=Currency,Value=USD` to match any metric data. Without this dimension, the alarm remains in `INSUFFICIENT_DATA` state and never triggers. **Fix:** Added `--dimensions Name=Currency,Value=USD` to the command.

4. **Billing alarm missing required `--evaluation-periods` parameter**: The `put-metric-alarm` command requires `--evaluation-periods` to specify how many consecutive periods the threshold must be breached before alarming. **Fix:** Added `--evaluation-periods 1` to the command.

## Review Notes
- The billing alarm uses `--period 86400` (24 hours). AWS billing metrics update approximately every 6 hours, so a period of `21600` (6 hours) would provide faster alerting. The current value is functional but less responsive.
- The SNS ARN `arn:aws:sns:us-east-1:123456789:billing-alerts` uses a 9-digit account ID. Real AWS account IDs are 12 digits (e.g., `123456789012`). This is clearly a placeholder but could be made more realistic.
- AWS billing metrics are only available in `us-east-1`. The billing alarm command does not specify `--region us-east-1`, which means it relies on the user's default AWS CLI region being `us-east-1`. This works but could be made explicit.
- Dapr prefixes state keys with `<app-id>||` by default, so the actual DynamoDB partition key values will be prefixed (e.g., `myapp||user:123:profile`). The post's partition key guidance is still correct since the user-chosen portion of the key still determines distribution.
- The Dapr JS SDK canonical example places `ttlInSeconds` in the third parameter (request-level metadata) rather than per-item metadata. Both approaches work since the SDK translates to the same HTTP/gRPC API, so the blog post's per-item approach is valid.
