# Validation Summary: How to Handle DynamoDB Hot Partitions

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon DynamoDB
- DynamoDB partition key design
- DynamoDB Contributor Insights
- Amazon CloudWatch metrics and alarms
- AWS CLI
- Boto3 for CloudWatch
- AWS SDK for JavaScript v3
- DynamoDB Accelerator (DAX)

## Sources Consulted
- AWS DynamoDB Developer Guide: Best practices for designing and using partition keys effectively in DynamoDB - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-design.html
- AWS DynamoDB Developer Guide: DynamoDB burst and adaptive capacity - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/burst-adaptive-capacity.html
- AWS DynamoDB Developer Guide: Partitions and data distribution in DynamoDB - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.Partitions.html
- AWS DynamoDB Developer Guide: CloudWatch Contributor Insights for DynamoDB - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/contributorinsights_HowItWorks.html
- AWS DynamoDB Developer Guide: Getting started with CloudWatch Contributor Insights for DynamoDB - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/contributorinsights_tutorial.html
- AWS CLI Command Reference: dynamodb update-contributor-insights - https://docs.aws.amazon.com/cli/latest/reference/dynamodb/update-contributor-insights.html
- AWS CLI Command Reference: cloudwatch get-insight-rule-report - https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/get-insight-rule-report.html
- AWS DynamoDB Developer Guide: DynamoDB metrics and dimensions - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/metrics-dimensions.html
- Boto3 CloudWatch get_metric_statistics reference - https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/cloudwatch/client/get_metric_statistics.html
- AWS SDK for JavaScript v3 DynamoDB examples - https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_dynamodb_code_examples.html
- AWS SDK for JavaScript v2 end-of-support announcement - https://aws.amazon.com/blogs/developer/announcing-end-of-support-for-aws-sdk-for-javascript-v2/
- AWS DynamoDB Developer Guide: DAX and DynamoDB consistency models - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.consistency.html
- AWS DynamoDB Developer Guide: Migrating to DAX Node.js SDK V3 - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.client.run-application-nodejs-3-migrating.html
- AWS DynamoDB API Reference: BatchWriteItem - https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_BatchWriteItem.html
- AWS DynamoDB Developer Guide: Using write sharding to distribute workloads evenly - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-sharding.html
- AWS DynamoDB Developer Guide: Best practices for handling time series data - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-time-series.html

## Issues Found
- The post implied adaptive capacity can burst beyond per-partition limits. Updated the wording to reflect AWS guidance that throttling can still occur when a partition exceeds 3,000 read units or 1,000 write units per second.
- The Contributor Insights CLI section implied `describe-contributor-insights` shows the hot keys. Corrected it to explain that the command returns status and generated rule names, and added `cloudwatch get-insight-rule-report` for report data.
- The CloudWatch metrics section described partition-level metrics. DynamoDB does not expose physical-partition metrics directly, so the section now uses `WriteKeyRangeThroughputThrottleEvents` and explains the role of Contributor Insights.
- The Boto3 example used timestamp strings. Updated it to pass timezone-aware `datetime` values, matching Boto3 examples and API expectations.
- JavaScript DynamoDB examples used AWS SDK for JavaScript v2 `DocumentClient` and `.promise()` calls. AWS SDK for JavaScript v2 reached end of support on September 8, 2025, so examples were updated to AWS SDK for JavaScript v3 command/client usage.
- The DAX example used the older v2 `amazon-dax-client` pattern. Updated it to the DAX Node.js SDK v3 `DaxDocument` pattern and clarified cache consistency when writes bypass DAX.
- The status-query GSI recommendation could recreate the same hot-key issue on the index. Added a caveat that the GSI also needs a distributed design for heavy status traffic.
- The time-bucketing section overstated that hourly buckets spread writes across 24 partitions per day. Revised it to say bucketing reduces the size and duration of hot time ranges, and that sharding may still be needed for the current bucket.
- The `BatchWriteItem` example ignored `UnprocessedItems` and used a deprecated SDK style. Updated it to AWS SDK v3 and added retry handling with backoff.
- The buffering section implied batching could solve sustained hot writes. Clarified that buffering smooths short bursts but does not remove the per-partition limit for sustained writes to one key.

## Review Notes
The post is technically relevant and useful after correction. The examples remain illustrative rather than complete application code; they assume a configured AWS client, credentials, table schemas matching the shown keys, and production-grade retry/error handling around the simplified snippets.
