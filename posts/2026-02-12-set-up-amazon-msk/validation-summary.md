# Validation Summary: How to Set Up Amazon MSK (Managed Streaming for Kafka)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon MSK
- AWS CLI
- Apache Kafka
- Kafka broker configuration
- Kafka CLI tools
- kafka-python
- Amazon CloudWatch
- AWS KMS
- Amazon S3 broker logging

## Sources Consulted
- Amazon MSK supported Apache Kafka versions: https://docs.aws.amazon.com/msk/latest/developerguide/supported-kafka-versions.html
- Amazon MSK cluster creation with AWS CLI: https://docs.aws.amazon.com/msk/latest/developerguide/create-cluster-cli.html
- AWS CLI `kafka create-cluster` command reference: https://docs.aws.amazon.com/cli/latest/reference/kafka/create-cluster.html
- AWS CLI `kafka create-configuration` command reference: https://docs.aws.amazon.com/cli/latest/reference/kafka/create-configuration.html
- Amazon MSK provisioned storage throughput requirements: https://docs.aws.amazon.com/msk/latest/developerguide/msk-provision-throughput.html
- AWS CLI `kafka update-broker-storage` command reference: https://docs.aws.amazon.com/cli/latest/reference/kafka/update-broker-storage.html
- AWS CLI `kafka update-broker-count` command reference: https://docs.aws.amazon.com/cli/latest/reference/kafka/update-broker-count.html
- Amazon MSK CloudWatch metrics reference: https://docs.aws.amazon.com/msk/latest/developerguide/metrics-details.html
- Amazon MSK metadata management modes: https://docs.aws.amazon.com/msk/latest/developerguide/metadata-management.html
- Apache Kafka downloads: https://kafka.apache.org/community/downloads/
- kafka-python `KafkaProducer` API docs: https://kafka-python.readthedocs.io/en/master/apidoc/KafkaProducer.html
- kafka-python `KafkaConsumer` API docs: https://kafka-python.readthedocs.io/en/2.2.7/apidoc/KafkaConsumer.html

## Issues Found
- The post used Amazon MSK Kafka version `3.6.0`, which AWS lists with an end-of-support date of 2026-06-01. Updated the MSK cluster and custom configuration examples to use the currently recommended supported MSK version `3.9.x`.
- The Kafka CLI download used `kafka_2.13-3.6.0`. Updated it to `kafka_2.13-3.9.2`, matching the current Apache Kafka 3.9.x release line.
- The `create-cluster` example enabled EBS provisioned throughput on `kafka.m5.large`. AWS documents provisioned storage throughput as available only for brokers sized `kafka.m5.4xlarge` or larger with storage of at least 10 GiB. Removed the provisioned throughput block while keeping the example's `kafka.m5.large` broker type.
- The introduction referred only to ZooKeeper management. Updated it to mention ZooKeeper or KRaft controllers, because current MSK versions support both metadata-management modes.
- The monitoring section said `PER_TOPIC_PER_BROKER` gives the most detail. AWS also supports `PER_TOPIC_PER_PARTITION`, so the wording was corrected to say it provides topic-level broker metrics.
- The CloudWatch `UnderReplicatedPartitions` command used only the `Cluster Name` dimension. AWS documents this metric with `Cluster Name, Broker ID`, so the command now includes `Broker ID`.
- The CloudWatch example used BSD/macOS `date -v-1H`, which fails on common Linux shells. Replaced it with a portable Python timestamp for the start time.
- The `update-broker-storage` example omitted the required `--current-version` parameter and used `KafkaBrokerNodeId` value `All`. Updated the command to include `--current-version` and the documented `KafkaBrokerNodeId=ALL` shorthand syntax.
- The `update-broker-count` example omitted the required `--current-version` parameter. Added the parameter so the command matches the AWS CLI schema.

## Review Notes
The examples remain illustrative and still require real subnet IDs, security group IDs, ARNs, KMS keys, S3 buckets, cluster version strings, and broker hostnames. The AWS CLI was not installed locally, so CLI validation was performed against official AWS CLI command references rather than local `--help` output.
