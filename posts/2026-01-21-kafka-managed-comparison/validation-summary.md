# Validation Summary: Confluent Cloud vs AWS MSK vs Self-Hosted Kafka

## Status
validated

## Post Type
Technical comparison guide

## Technologies Covered
- Apache Kafka
- Confluent Cloud
- Amazon MSK
- AWS Glue Schema Registry
- MSK Connect
- MSK Replicator
- Kafka Connect
- ksqlDB
- Apache Flink
- Java Kafka clients
- Confluent Python client
- AWS MSK IAM SASL signer for Python
- MirrorMaker 2
- Confluent CLI

## Sources Consulted
- Apache Kafka documentation: https://kafka.apache.org/documentation/
- Confluent Cloud billing dimensions: https://docs.confluent.io/cloud/current/billing/billing-dimensions.html
- Confluent Cloud billing overview: https://docs.confluent.io/cloud/current/billing/overview.html
- Confluent Cloud cluster types: https://docs.confluent.io/cloud/current/clusters/cluster-types.html
- Confluent Cloud managed connectors overview: https://docs.confluent.io/cloud/current/connectors/overview.html
- Confluent Cloud ksqlDB overview: https://docs.confluent.io/cloud/current/ksqldb/overview.html
- Confluent Cloud client configuration: https://docs.confluent.io/cloud/current/cp-component/clients-cloud-config.html
- Confluent Schema Registry client configuration reference: https://docs.confluent.io/platform/current/schema-registry/sr-client-configs.html
- Confluent CLI `kafka link create` reference: https://docs.confluent.io/confluent-cli/current/command-reference/kafka/link/confluent_kafka_link_create.html
- Confluent CLI `kafka mirror create` reference: https://docs.confluent.io/confluent-cli/current/command-reference/kafka/mirror/confluent_kafka_mirror_create.html
- Amazon MSK Developer Guide: https://docs.aws.amazon.com/msk/latest/developerguide/what-is-msk.html
- Amazon MSK metadata management: https://docs.aws.amazon.com/msk/latest/developerguide/metadata-management.html
- Amazon MSK supported Kafka versions: https://docs.aws.amazon.com/msk/latest/developerguide/supported-kafka-versions.html
- Amazon MSK IAM client configuration: https://docs.aws.amazon.com/msk/latest/developerguide/configure-clients-for-iam-access-control.html
- Amazon MSK port information: https://docs.aws.amazon.com/msk/latest/developerguide/port-info.html
- MSK Connect documentation: https://docs.aws.amazon.com/msk/latest/developerguide/msk-connect.html
- MSK Replicator documentation: https://docs.aws.amazon.com/msk/latest/developerguide/msk-replicator.html
- AWS MSK IAM SASL signer for Python: https://github.com/aws/aws-msk-iam-sasl-signer-python

## Issues Found
- The overview table said AWS MSK requires self-managed Kafka Connect. Updated it to mention MSK Connect or self-managed Connect, because AWS provides MSK Connect as a managed Kafka Connect option.
- The AWS MSK architecture described KRaft only for Serverless. Updated it to managed ZooKeeper or KRaft metadata because MSK Provisioned supports KRaft for supported Kafka versions.
- The AWS MSK feature list only mentioned managed ZooKeeper and omitted MSK Connect and MSK Replicator. Updated the list to include managed metadata, MSK Connect, and MSK Replicator.
- The Confluent Cloud feature list described services as included and listed 200+ managed connectors. Updated it to "available services" and 100+ managed connectors to match Confluent's current documentation.
- The Confluent Cloud ksqlDB claims were too broad. Added "on supported cluster types" and included Flink as the current managed stream processing service.
- The self-hosted Java snippet omitted imports for `ProducerConfig` and `Properties`. Added the missing imports.
- The Python MSK IAM snippet set `OAUTHBEARER` but did not configure an OAuth callback. Added `aws_msk_iam_sasl_signer.MSKAuthTokenProvider` and an `oauth_cb` callback using the expiry format required by `confluent_kafka`.
- The Confluent Cloud pricing section used stale legacy partition-hour and fixed per-GB prices as if they were universal. Replaced those with current billing dimensions and directed readers to the Confluent Cost Estimator for current region-specific pricing.
- The AWS MSK Serverless pricing section incorrectly described `$0.75` as a partition-hour price and used incorrect data in/out numbers. Replaced the exact stale numbers with the correct pricing dimensions: cluster-hour, partition-hour, storage, data in, and data out.
- The AWS MSK pricing section used fixed broker-hour examples without noting regional variation and optional charges. Replaced it with broker-hour, storage, optional throughput, private connectivity, and AWS Pricing Calculator guidance.
- The Confluent Cloud operations section listed backup as automatic. Reworded it to built-in replication and durability, which better matches Kafka managed-service behavior.
- The AWS MSK operations section listed ZooKeeper management only and treated Kafka Connect as entirely user-managed. Updated it to managed metadata and managed MSK Connect workers, while keeping connector plugin and configuration responsibility with the user.
- The Confluent CLI Cluster Linking example used `--source-cluster-id`, but current CLI documentation uses `--source-cluster`. Updated the flag.
- The conclusion claimed AWS MSK provides lower cost. Reworded it to "deep AWS integration" because cost depends on workload, region, and operational assumptions.

## Review Notes
Pricing remains intentionally non-numeric except for self-hosted illustrative infrastructure examples because managed-service rates are region-specific and change over time. The examples are configuration-oriented and still require real cluster endpoints, credentials, dependencies, and network access to run.
