# Validation Summary: How to Fix DynamoDB 'ProvisionedThroughputExceededException' Errors

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Amazon DynamoDB
- DynamoDB provisioned and on-demand capacity modes
- DynamoDB Global Secondary Indexes
- DynamoDB Accelerator (DAX)
- AWS CLI
- Amazon CloudWatch metrics and alarms
- AWS Application Auto Scaling
- Python boto3 and botocore
- AWS SDK for JavaScript v3

## Sources Consulted
- Amazon DynamoDB constraints: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Constraints.html
- Amazon DynamoDB on-demand capacity mode: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/on-demand-capacity-mode.html
- Amazon DynamoDB service quotas: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ServiceQuotas.html
- Amazon DynamoDB auto scaling: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/AutoScaling.html
- Amazon DynamoDB Global Secondary Indexes: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html
- Amazon DynamoDB hot partition throttling guidance: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/throttling-key-range-limit-exceeded-mitigation.html
- Amazon DynamoDB burst and adaptive capacity: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/burst-adaptive-capacity.html
- Amazon DynamoDB metrics and dimensions: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/metrics-dimensions.html
- AWS CLI `dynamodb update-table` reference: https://awscli.amazonaws.com/v2/documentation/api/latest/reference/dynamodb/update-table.html
- AWS CLI `cloudwatch get-metric-statistics` reference: https://awscli.amazonaws.com/v2/documentation/api/latest/reference/cloudwatch/get-metric-statistics.html
- AWS CLI Application Auto Scaling examples: https://docs.aws.amazon.com/cli/latest/userguide/cli_application-auto-scaling_code_examples.html
- boto3 DynamoDB guide: https://docs.aws.amazon.com/boto3/latest/guide/dynamodb.html
- botocore config reference: https://docs.aws.amazon.com/botocore/latest/reference/config.html
- boto3 retry guide: https://docs.aws.amazon.com/boto3/latest/guide/retries.html
- AWS SDK for JavaScript v3 DynamoDB guide: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/programming-with-javascript.html
- DynamoDB Accelerator (DAX) guide: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.html

## Issues Found
- The post said the capacity check command showed provisioned capacity and consumption, but `describe-table` only returns table settings. Changed the wording to "capacity settings."
- The CloudWatch examples used BSD/macOS `date -v-1H`, which fails on common GNU/Linux environments. Changed the examples to GNU `date -d '1 hour ago'`.
- The post said on-demand mode means you never get throttled within account limits. DynamoDB on-demand can still throttle because of table quotas, configured maximum throughput, hot partitions, or rapid traffic growth beyond double the previous peak within 30 minutes. Reworded the claim.
- The post said switching between on-demand and provisioned capacity is limited to once every 24 hours. Current DynamoDB constraints allow switching from provisioned to on-demand up to four times in a 24-hour rolling window, and switching from on-demand to provisioned at any time. Updated the text.
- The post said provisioned throughput increases take effect immediately and decreases are limited to 4 per day. AWS documents that changes take effect after `UpdateTable` completes, and decrease quotas accrue through the UTC day up to 27 total. Updated the wording.
- The auto scaling timing claim said scale-up can take 1-2 minutes. AWS documents that auto scaling triggers after sustained utilization and can take several minutes to update capacity. Updated the timing language.
- One Python hot-partition helper used `time.time()` without importing `time`. Added the missing import.
- The DAX section implied DAX applies to reads generally. DAX primarily provides microsecond-latency eventually consistent reads from cache. Updated the wording to specify eventually consistent and cacheable reads.

## Review Notes
The AWS CLI and SDK snippets use current command names and configuration fields. The CloudWatch date example now targets GNU/Linux shells; macOS users would need a different `date` invocation or an explicit ISO timestamp.
