# Validation Summary: How to Choose the Right Partition Key for DynamoDB

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon DynamoDB
- AWS CloudWatch Contributor Insights for DynamoDB
- AWS CLI
- JavaScript
- Python
- Mermaid diagrams

## Sources Consulted
- AWS DynamoDB Developer Guide: Partitions and data distribution in DynamoDB - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.Partitions.html
- AWS DynamoDB Developer Guide: Core components of Amazon DynamoDB - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.CoreComponents.html
- AWS DynamoDB Developer Guide: Best practices for designing and using partition keys effectively - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-design.html
- AWS DynamoDB Developer Guide: Designing partition keys to distribute your workload - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-uniform-load.html
- AWS DynamoDB Developer Guide: Using write sharding to distribute workloads evenly - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-sharding.html
- AWS DynamoDB Developer Guide: Constraints in Amazon DynamoDB - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Constraints.html
- AWS DynamoDB API Reference: Query - https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html
- AWS DynamoDB Developer Guide: Analyzing data access using CloudWatch Contributor Insights for DynamoDB - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/contributorinsights.html
- AWS DynamoDB Developer Guide: Getting started with CloudWatch Contributor Insights for DynamoDB - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/contributorinsights_tutorial.html
- AWS CLI Command Reference: update-contributor-insights - https://awscli.amazonaws.com/v2/documentation/api/latest/reference/dynamodb/update-contributor-insights.html

## Issues Found
- The partition throughput explanation stated that each partition has a hard "3,000 RCUs and 1,000 WCUs" limit. AWS documents these as per-second designed maximums for a physical partition, with RCU behavior depending on read consistency and item size, so the wording was updated to "up to 3,000 read capacity units per second and 1,000 write capacity units per second."
- The traffic distribution example said five distinct partition key values meant each partition handles about 200 WCUs. That mixed logical partition key values with physical partitions. The example now says each key value handles about 200 WCUs under an even workload, and the hot value needs 800 WCUs.
- The sequential ID anti-pattern implied that auto-incrementing partition key values are always concentrated on the latest physical partition range. DynamoDB hashes partition key values, so that claim was too broad. The example was corrected to describe the real risk: monotonically increasing sort keys or IDs under one hot partition key/item collection, and to recommend sharding the partition key value.

## Review Notes
- The JavaScript template literal snippet and Python distribution script were syntax-checked locally.
- The AWS CLI syntax for `aws dynamodb update-contributor-insights --table-name MyTable --contributor-insights-action ENABLE` matches current AWS CLI documentation. AWS documentation states the default Contributor Insights mode is `ACCESSED_AND_THROTTLED_KEYS`, which supports identifying most accessed and throttled keys.
- The Python example imports `hashlib` but does not use it. This is harmless, but it could be removed in a future cleanup.
