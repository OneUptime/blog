# Validation Summary: How to Monitor DynamoDB Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon DynamoDB (NoSQL database)
- Amazon CloudWatch (metrics, alarms, dashboards)
- AWS CLI (`aws cloudwatch get-metric-statistics`, `aws dynamodb update-contributor-insights`)
- Python with boto3 SDK
- AWS SNS (notifications)
- AWS CloudFormation (YAML template)
- Mermaid diagrams
- DynamoDB Global Secondary Indexes (GSI)
- DynamoDB Contributor Insights

## Sources Consulted
- AWS DynamoDB CloudWatch metrics reference: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/metrics-dimensions.html
- AWS CloudWatch `get-metric-statistics` CLI reference: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/get-metric-statistics.html
- boto3 CloudWatch client documentation: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/cloudwatch.html
- boto3 DynamoDB client/resource documentation: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/dynamodb.html
- AWS DynamoDB read/write capacity units documentation (RCU = 4KB strongly consistent read, WCU = 1KB write): https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadWriteCapacityMode.html
- AWS DynamoDB error handling and exponential backoff: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Programming.Errors.html
- AWS CloudFormation `AWS::CloudWatch::Alarm` and `AWS::CloudWatch::Dashboard` resource types
- AWS DynamoDB Contributor Insights documentation

## Issues Found
1. **Mermaid latency-metrics diagram listed non-existent CloudWatch metric names.** The "Latency Metrics" subgraph showed `GetLatency`, `PutLatency`, and `QueryLatency` as independent CloudWatch metrics. DynamoDB does not publish these as standalone metrics — it exposes `SuccessfulRequestLatency` with an `Operation` dimension (`GetItem`, `PutItem`, `Query`, etc.). Replaced the three labels with `Operation: GetItem`, `Operation: PutItem`, `Operation: Query` to reflect the actual metric structure (which the working Python code, `get_latency_percentiles`, already uses correctly).

## Review Notes
- The Python code uses `datetime.utcnow()`, which is deprecated as of Python 3.12 in favor of `datetime.now(timezone.utc)`. It still works correctly on all current Python versions and was not changed because it is widely used and not technically incorrect.
- The `exponential_backoff_with_jitter` implementation computes `exponential_delay + random.uniform(0, exponential_delay)`, which is an "equal jitter"-style approach rather than AWS's recommended "full jitter" (where the delay is `random.uniform(0, exponential_delay)`). It is a valid backoff strategy and not a bug, but full jitter is the AWS-preferred pattern for thundering-herd prevention.
- The retryable error codes (`ProvisionedThroughputExceededException`, `ThrottlingException`) are correct for DynamoDB throttling.
- The `ReturnConsumedCapacity` parameter value `'TOTAL'` is valid (other valid values: `'INDEXES'`, `'NONE'`).
- The dimension name `GlobalSecondaryIndexName` used for GSI-scoped CloudWatch metrics is correct.
- CloudFormation template resource types (`AWS::SNS::Topic`, `AWS::CloudWatch::Alarm`, `AWS::CloudWatch::Dashboard`) and their properties are accurate.
- The `ThrottledRequests` metric is real and distinct from `ReadThrottleEvents` / `WriteThrottleEvents`; the post correctly distinguishes them.
- Capacity unit definitions in the architecture diagram (`RCU: 4KB strongly consistent read`, `WCU: 1KB write`) are correct. (Eventually-consistent reads consume 0.5 RCU per 4KB, but the post is talking about strongly-consistent reads, which is accurate.)
