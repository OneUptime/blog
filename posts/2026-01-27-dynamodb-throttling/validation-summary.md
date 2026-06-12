# Validation Summary: How to Handle DynamoDB Throttling

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Amazon DynamoDB
- Amazon CloudWatch metrics and alarms
- CloudWatch Contributor Insights for DynamoDB
- boto3 / botocore
- Python
- OpenTelemetry metrics

## Sources Consulted
- AWS DynamoDB throttling diagnosis workflow: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/throttling-diagnosing-workflow.html
- AWS DynamoDB key range throughput exceeded mitigation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/throttling-key-range-limit-exceeded-mitigation.html
- AWS DynamoDB burst and adaptive capacity: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/burst-adaptive-capacity.html
- AWS DynamoDB CloudWatch throttling metrics: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TroubleshootingThrottling-cloudwatch.html
- AWS CloudWatch recommended alarms for DynamoDB: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Best_Practice_Recommended_Alarms_AWS_Services.html
- AWS DynamoDB Contributor Insights tutorial: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/contributorinsights_tutorial.html
- boto3 DynamoDB conditions reference: https://docs.aws.amazon.com/boto3/latest/reference/customizations/dynamodb.html
- boto3 DynamoDB Query reference: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/dynamodb/table/query.html
- OpenTelemetry Python metrics API: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry metrics SDK and OTLP exporter specs: https://opentelemetry.io/docs/specs/otel/metrics/sdk/ and https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/otlp/

## Issues Found
- The post implied all DynamoDB throttling returns `ProvisionedThroughputExceededException`. Updated the wording and diagram to include `ThrottlingException` and `RequestLimitExceeded`, matching current AWS throttling documentation.
- The partition limit wording used `3,000 RCU / 1,000 WCU` too broadly and described capacity as simply allocated evenly across partitions. Updated the text to mention adaptive capacity and per-partition read/write operation limits.
- The time-series query example used `timedelta` without importing it. Added the missing import.
- The time-series scatter example defaulted to 100 shards while using `timestamp.minute`, which only produces values 0-59. Changed the default scatter factor to 60.
- The query guidance suggested `ParallelScan` for scattered partition keys. Replaced it with parallel queries, which matches the code and avoids unnecessary table scans.
- The CloudWatch alarm and metrics examples used non-existent metric names `ReadThrottledRequests` and `WriteThrottledRequests`. Replaced them with `ReadThrottleEvents` and `WriteThrottleEvents`.
- The high read capacity alarm used `Threshold=0` despite saying it should represent 80% of provisioned capacity. Added a `provisioned_read_capacity` parameter and calculated the threshold from it.
- The Contributor Insights example guessed a `DynamoDBContributorInsights-PKC-{table}` rule for throttled keys. Updated it to discover the generated `PKT` throttled-key rule from `describe_contributor_insights` and query that rule.
- The OpenTelemetry example declared a retry counter and documented retry capture but did not record retries. Removed the unused counter and corrected the description.

## Review Notes
- The Python fenced code blocks were parsed with `python3 ast.parse`; all seven compile syntactically.
- Several examples remain illustrative and require real AWS credentials, table schemas, IAM permissions, enabled Contributor Insights, and placeholder application functions such as `queue_for_retry`.
