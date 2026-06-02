# Validation Summary: How to Migrate from Self-Hosted Kafka to Amazon MSK

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Amazon Managed Streaming for Apache Kafka (Amazon MSK)
- Apache Kafka
- Kafka MirrorMaker 2
- AWS SDK for Python (boto3)
- Kafka command-line tools
- kafka-python
- AWS networking
- Amazon CloudWatch and Prometheus monitoring

## Sources Consulted
- Amazon MSK boto3 `create_cluster` API documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/kafka/client/create_cluster.html
- Amazon MSK boto3 `update_broker_storage` API documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/kafka/client/update_broker_storage.html
- Amazon MSK encryption documentation: https://docs.aws.amazon.com/msk/latest/developerguide/msk-encryption.html
- Amazon MSK custom configuration properties: https://docs.aws.amazon.com/msk/latest/developerguide/msk-configuration-properties.html
- Amazon MSK manual broker storage scaling documentation: https://docs.aws.amazon.com/msk/latest/developerguide/manually-expand-storage.html
- Amazon MSK auto-scaling policy documentation: https://docs.aws.amazon.com/msk/latest/developerguide/msk-autoexpand-details.html
- Amazon MSK supported Kafka versions: https://docs.aws.amazon.com/msk/latest/developerguide/supported-kafka-versions.html
- Apache Kafka MirrorMaker configuration reference: https://kafka.apache.org/38/configuration/mirrormaker-configs/
- Apache Kafka geo-replication / MirrorMaker 2 operations guide: https://kafka.apache.org/35/operations/geo-replication-cross-cluster-data-mirroring/
- Apache Kafka MirrorMaker 2 source README: https://apache.googlesource.com/kafka/+/b86c307b0e514cae4be5bed3e74cfca65d08c673/connect/mirror/README.md
- Apache Kafka KIP-382 MirrorMaker 2.0 design: https://cwiki.apache.org/confluence/display/KAFKA/KIP-382%3A%2BMirrorMaker%2B2.0

## Issues Found
- The post claimed existing clients work without code changes and only need bootstrap server updates. I narrowed this to client library compatibility and noted that bootstrap servers and security settings often need updates, because MSK TLS, SASL/SCRAM, IAM, or mTLS choices affect client configuration.
- The custom MSK configuration was shown after the cluster creation sample even though `ConfigurationInfo` requires an existing configuration ARN and revision. I added a note that the configuration must be created before attaching it during cluster creation.
- The MirrorMaker 2 sample used invalid `emit.consumer.offsets.*` properties and omitted `sync.group.offsets.enabled`, which is required to periodically write translated offsets into the target cluster's `__consumer_offsets`. I removed the invalid properties and added `sync.group.offsets.enabled=true` with an interval.
- The replication monitoring command attempted to inspect a made-up MirrorMaker consumer group on the target cluster. I replaced it with guidance to monitor MirrorMaker 2 JMX/Prometheus metrics such as `record-age-ms`, `replication-latency-ms`, and `checkpoint-latency-ms`.
- The post stated that consumers are idempotent. Consumers are not inherently idempotent, and reprocessing may be unsafe depending on application behavior. I changed the cutover guidance to mention controlled batches, duplicate tolerance, or pausing consumers.
- The producer sample used `json.dumps` without importing `json`. I added the missing import.
- The MSK-specific features sample implied `update_broker_storage` enables MSK Serverless and targeted broker ID `1`. MSK Serverless is a separate cluster type, and MSK Standard storage scaling applies to all brokers. I clarified the comment and changed `KafkaBrokerNodeId` to `All`.

## Review Notes
- Amazon MSK still supports Kafka 3.5.1, but the official supported-versions page currently recommends newer 3.9.x releases. The sample remains valid as a version-specific example, but future updates could use a newer recommended Kafka version.
