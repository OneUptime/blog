# Validation Summary: How to Handle AWS Rate Limiting in Dapr Bindings

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Resiliency API, Bindings)
- AWS DynamoDB
- AWS SQS
- AWS S3
- AWS CloudWatch
- Node.js / JavaScript (@dapr/dapr SDK, Bottleneck library)

## Sources Consulted
- Dapr Resiliency policies documentation — https://docs.dapr.io/operations/resiliency/policies/
- AWS SQS Features — https://aws.amazon.com/sqs/features/
- AWS SQS FIFO queue quotas — https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/quotas-fifo.html
- AWS S3 error codes documentation (SlowDown error) — https://docs.aws.amazon.com/AmazonS3/latest/API/ErrorResponses.html
- AWS S3 request rate performance guidelines — https://docs.aws.amazon.com/AmazonS3/latest/userguide/optimizing-performance.html
- AWS CLI `put-metric-alarm` reference — https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html
- AWS CLI `get-metric-statistics` reference — https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/get-metric-statistics.html

## Issues Found

1. **Incorrect S3 throttling error code**: The post stated S3 returns `RequestLimitExceeded` when rate limited. S3 actually returns `SlowDown` (HTTP 503). `RequestLimitExceeded` is an EC2/general AWS API error, not an S3 error code. Changed to `SlowDown`.

2. **Incorrect Dapr retry policy field name**: The post used `initialInterval: 200ms` in the Dapr resiliency retry policy. The correct field name in Dapr's resiliency spec is `duration`, not `initialInterval`. Changed to `duration: 200ms`.

3. **Incorrect SQS throughput claim**: The post stated "SQS supports up to 3,000 messages per second per queue (for standard queues)." AWS SQS standard queues actually support nearly unlimited throughput. The 3,000 figure applies to FIFO queues with batching (300 without batching). Corrected to clarify that standard queues have nearly unlimited throughput and FIFO queues have the 300/3,000 limits.

4. **Missing required `--statistic` parameter in CloudWatch alarm command**: The `aws cloudwatch put-metric-alarm` command was missing the required `--statistic` parameter (required when using `--metric-name`). Added `--statistic Sum`, which is the appropriate statistic for counting throttle events.

## Review Notes
- The `date -v-1H` syntax in the CloudWatch get-metric-statistics command is macOS-specific. On GNU/Linux, the equivalent would be `date -d '1 hour ago'`. This is not incorrect but could cause confusion for Linux users.
- The Bottleneck rate limiter for S3 is configured conservatively (effectively ~1,000 req/s with concurrency) compared to the stated 3,500 PUT/s S3 limit. This is fine as a defensive example but readers should tune for their workload.
- The DynamoDB component configuration is minimal (only table and region). In production, additional metadata like `accessKey`, `secretKey`, or IAM role configuration would typically be needed, though this is acceptable for a focused tutorial.
