# Validation Summary: How to Compare Kinesis vs Kafka (MSK)

## Status
validated

## Post Type
Technical comparison guide

## Technologies Covered
- Amazon Kinesis Data Streams
- Amazon Managed Streaming for Apache Kafka (Amazon MSK)
- Apache Kafka
- boto3 for Python
- kafka-python
- Amazon Managed Service for Apache Flink

## Sources Consulted
- Amazon Kinesis Data Streams quotas and limits: https://docs.aws.amazon.com/streams/latest/dev/service-sizes-and-limits.html
- Amazon Kinesis Data Streams PutRecords API reference: https://docs.aws.amazon.com/kinesis/latest/APIReference/API_PutRecords.html
- boto3 Kinesis put_records reference: https://docs.aws.amazon.com/boto3/latest/reference/services/kinesis/client/put_records.html
- boto3 Kinesis subscribe_to_shard reference: https://docs.aws.amazon.com/boto3/latest/reference/services/kinesis/client/subscribe_to_shard.html
- Amazon Kinesis Data Streams pricing: https://aws.amazon.com/kinesis/data-streams/pricing/
- Amazon MSK pricing: https://aws.amazon.com/msk/pricing/
- Amazon MSK quotas: https://docs.aws.amazon.com/msk/latest/developerguide/limits.html
- Amazon MSK default configuration: https://docs.aws.amazon.com/msk/latest/developerguide/msk-default-configuration.html
- Apache Kafka producer configuration: https://kafka.apache.org/40/configuration/producer-configs/
- Apache Kafka design documentation for exactly-once semantics: https://kafka.apache.org/42/design/design/
- kafka-python KafkaProducer documentation: https://kafka-python.readthedocs.io/en/2.2.13/apidoc/KafkaProducer.html
- kafka-python KafkaConsumer documentation: https://kafka-python.readthedocs.io/en/2.0.6/apidoc/KafkaConsumer.html
- Amazon Kinesis Data Analytics for SQL Applications discontinuation notice: https://docs.aws.amazon.com/kinesisanalytics/latest/dev/discontinuation.html

## Issues Found
- The Kinesis maximum message size was listed as 1 MB. Current Kinesis Data Streams documentation allows records up to 10 MiB, with sustained shard throughput limits still applying. Updated the feature table.
- The MSK message-size row did not mention MSK Serverless limits. Updated it to distinguish Kafka's approximately 1 MiB default from configurability and the 8 MiB MSK Serverless limit.
- The MSK default retention row stated 7 days as an unconditional MSK default. Updated it to note that retention is configured on MSK, while Apache Kafka defaults are commonly 7 days when unset.
- The multi-region comparison omitted the managed MSK Replicator option. Updated the MSK side to mention MSK Replicator as well as MirrorMaker 2.
- The Kinesis boto3 PutRecords example passed a Python string for `Data`; boto3 documents this field as bytes. Updated the snippet to encode the JSON line as UTF-8 bytes.
- The Kinesis cost example used an incorrect PUT payload-unit calculation and outdated extended-retention shard-hour pricing. Recalculated the PUT payload units and monthly total using the documented 25 KB PUT payload unit and current US East example pricing.
- The MSK storage estimate for 168 hours at 10 MB/sec was too low and did not account for replication factor 3. Updated the storage estimate and total monthly cost accordingly.
- The Kinesis selection guidance recommended Kinesis Data Analytics for SQL-based processing, but that service was discontinued effective January 27, 2026. Updated the recommendation to Amazon Managed Service for Apache Flink.

## Review Notes
The throughput examples are illustrative benchmarks; actual Kafka/MSK throughput and Kinesis results depend on record size, batching, partitioning, broker instance type, network path, compression, client settings, and authentication mode. The cost examples intentionally omit data transfer, enhanced fan-out retrieval, MSK provisioned storage throughput, tiered storage, and serverless pricing variants.
