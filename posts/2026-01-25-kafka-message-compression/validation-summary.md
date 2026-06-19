# Validation Summary: How to Reduce Storage with Kafka Message Compression

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Apache Kafka producer compression
- Apache Kafka topic and broker compression configuration
- Kafka command-line tools
- Kafka producer and consumer metrics
- Kafka Connect producer overrides
- Java Kafka client
- librdkafka / Confluent Kafka Python client

## Sources Consulted
- Apache Kafka Producer Configs: https://kafka.apache.org/43/configuration/producer-configs/
- Apache Kafka Topic Configs: https://kafka.apache.org/43/configuration/topic-configs/
- Apache Kafka producer metrics documentation: https://kafka.apache.org/32/generated/producer_metrics.html
- Apache Kafka consumer metrics documentation: https://kafka.apache.org/20/generated/consumer_metrics.html
- Confluent librdkafka configuration properties: https://docs.confluent.io/platform/current/clients/librdkafka/html/md_CONFIGURATION.html
- Confluent Kafka Connect worker configuration properties: https://docs.confluent.io/platform/current/connect/references/allconfigs.html
- Confluent Kafka Connect security/client override documentation: https://docs.confluent.io/platform/current/connect/security.html
- Red Hat Streams for Apache Kafka tuning guidance on compression and recompression: https://docs.redhat.com/en/documentation/red_hat_streams_for_apache_kafka/2.9/html/kafka_configuration_tuning/con-config-large-messages-str

## Issues Found
- The post stated that brokers simply store and forward compressed data and that decompression only happens at consumers. This is accurate for the common `compression.type=producer` path, but incomplete when a topic forces a different final compression type. Updated the explanation to note that brokers retain producer compression by default and may recompress batches when topic compression overrides the producer codec.
- The topic-level compression options listed `none`. Apache Kafka topic config uses `uncompressed` for no compression, while producer config uses `none`. Changed the topic-level options to list `uncompressed`.
- The broker-level section described `compression.type` as a general default compression setting. Since Kafka topic docs define it as the final compression type inherited from the broker default, updated the wording to "default final compression type."
- The Zstd section said Kafka supports only levels `1-22`. Current Kafka docs show `compression.zstd.level` defaults to `3` and accepts values through `22`, including advanced negative levels. Updated the wording to avoid implying `1` is the lower bound for Kafka.
- The Kafka Connect example described producer overrides for "sink/source connectors" and used a sink connector. Kafka Connect documents `producer.override.*` for source connectors and `consumer.override.*` for sink connectors, with client overrides controlled by `connector.client.config.override.policy`. Changed the example to a source connector and added the override-policy requirement.

## Review Notes
- The benchmark table is presented as typical illustrative output, not a universal result. Compression ratios and throughput will vary heavily by Kafka version, client settings, broker hardware, data shape, replication, and storage backend.
- The local environment did not include Kafka CLI scripts, so CLI syntax was checked against official documentation and known Kafka tool conventions rather than by running the commands locally.
