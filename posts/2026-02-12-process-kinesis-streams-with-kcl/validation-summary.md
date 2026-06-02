# Validation Summary: How to Process Kinesis Streams with KCL (Kinesis Client Library)

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Amazon Kinesis Data Streams
- Kinesis Client Library (KCL) 2.x
- Java
- Python / boto3
- DynamoDB
- CloudWatch
- AWS CLI

## Sources Consulted
- AWS KCL 1.x and 2.x information: https://docs.aws.amazon.com/streams/latest/dev/shared-throughput-kcl-consumers.html
- AWS KCL version lifecycle policy: https://docs.aws.amazon.com/streams/latest/dev/kcl-version-lifecycle-policy.html
- AWS KCL CloudWatch metrics documentation: https://docs.aws.amazon.com/streams/latest/dev/monitoring-with-kcl.html
- AWS KCL non-Java consumer documentation: https://docs.aws.amazon.com/streams/latest/dev/develop-kcl-consumers-non-java.html
- AWS Kinesis enhanced fan-out documentation: https://docs.aws.amazon.com/streams/latest/dev/enhanced-consumers.html
- AWS Kinesis GetRecords API reference: https://docs.aws.amazon.com/kinesis/latest/APIReference/API_GetRecords.html
- boto3 Kinesis ListShards paginator documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/kinesis/paginator/ListShards.html
- boto3 Kinesis get_records documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/kinesis/client/get_records.html
- boto3 Kinesis get_shard_iterator documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/kinesis/client/get_shard_iterator.html
- AWS CLI dynamodb scan command reference: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/scan.html
- KCL 2.5.8 FanOutConfig source: https://github.com/awslabs/amazon-kinesis-client/blob/v2.5.8/amazon-kinesis-client/src/main/java/software/amazon/kinesis/retrieval/fanout/FanOutConfig.java
- KCL 2.5.8 ConfigsBuilder source: https://github.com/awslabs/amazon-kinesis-client/blob/v2.5.8/amazon-kinesis-client/src/main/java/software/amazon/kinesis/common/ConfigsBuilder.java
- KCL 2.5.8 PollingConfig source: https://github.com/awslabs/amazon-kinesis-client/blob/v2.5.8/amazon-kinesis-client/src/main/java/software/amazon/kinesis/retrieval/polling/PollingConfig.java

## Issues Found
- The Java checkpoint helper used `recordsProcessed % 100 == 0`, which can be true before any new records have been processed after startup or after a checkpoint. I changed it to track `recordsSinceLastCheckpoint`, reset it after checkpointing, and only time-checkpoint when there are new records to checkpoint.
- The Python boto3 example iterated shards sequentially even though `process_shard()` loops continuously, so only the first shard would be processed. I changed the sample to start one thread per open shard.
- The Python shard discovery used a single `list_shards()` call and did not handle pagination. I changed it to use the official `list_shards` paginator.
- The Python example used `datetime.utcnow()`, which is deprecated in current Python. I changed it to `datetime.now(timezone.utc).isoformat()`.
- The monitoring section listed `RecordProcessor.processRecords.Count` and `LeasesHeld`, which are not the KCL metric names in AWS documentation. I changed them to `RecordsProcessed` and `CurrentLeases`, and tightened the `MillisBehindLatest` description to match AWS documentation.

## Review Notes
KCL 3.x is the newest major version, but AWS still lists KCL 2.x as generally available. Because the article explicitly targets KCL 2.x and uses KCL 2.5.8 APIs, I kept the article in the KCL 2.x scope rather than converting it to KCL 3.x.
