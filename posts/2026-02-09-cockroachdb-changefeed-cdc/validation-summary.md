# Validation Summary: How to Implement CockroachDB Changefeed for Real-Time CDC on Kubernetes

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- CockroachDB changefeeds and CDC queries
- Apache Kafka on Kubernetes
- Strimzi Kafka Operator
- Kubernetes CronJob
- Go Kafka consumers
- Avro and Confluent Schema Registry
- Cloud storage changefeed sinks

## Sources Consulted
- CockroachDB CREATE CHANGEFEED documentation: https://www.cockroachlabs.com/docs/stable/create-changefeed
- CockroachDB Create and Configure Changefeeds documentation: https://www.cockroachlabs.com/docs/stable/create-and-configure-changefeeds
- CockroachDB Changefeed Messages documentation: https://www.cockroachlabs.com/docs/stable/changefeed-messages
- CockroachDB Changefeed Sinks documentation: https://www.cockroachlabs.com/docs/stable/changefeed-sinks
- CockroachDB SHOW JOBS documentation: https://www.cockroachlabs.com/docs/stable/show-jobs
- CockroachDB Changefeed Monitoring Guide: https://www.cockroachlabs.com/docs/stable/changefeed-monitoring-guide
- CockroachDB Licensing FAQs: https://www.cockroachlabs.com/docs/stable/licensing-faqs
- Strimzi deployment documentation: https://strimzi.io/docs/operators/latest/deploying
- Strimzi Custom Resource API reference: https://strimzi.io/docs/operators/latest/full/configuring
- Confluent Docker image configuration reference: https://docs.confluent.io/platform/current/installation/docker/config-reference.html
- Go kafka-go package documentation: https://pkg.go.dev/github.com/segmentio/kafka-go

## Issues Found
- The post claimed exactly-once delivery guarantees. CockroachDB documents at-least-once delivery with per-key ordering, so the introduction and conclusion were corrected.
- The post described the retired Core vs Enterprise changefeed split. This was updated to current sinkless and sink-backed changefeed terminology, with licensing caveats for self-hosted and Cloud clusters.
- The Kafka Kubernetes StatefulSet used a deprecated ZooKeeper-mode Confluent image pattern and identical advertised listeners for all replicas. It was replaced with current Strimzi `Kafka` and `KafkaNodePool` custom resources suitable for Kubernetes.
- The Kafka sink URIs and Go consumer bootstrap addresses did not match the Strimzi bootstrap service naming convention. They now use `kafka-kafka-bootstrap.data-streaming:9092`.
- The prerequisites omitted the required `kv.rangefeed.enabled` setting for self-hosted clusters. The SQL setup now includes it.
- The sinkless changefeed example used the old `experimental-stdout:///` sink. It was changed to current sinkless `CREATE CHANGEFEED FOR TABLE ... WITH ...` syntax.
- The filtered and column-specific changefeed examples used invalid `CREATE CHANGEFEED FOR TABLE ... WHERE` and table column-list syntax. They were changed to CDC query syntax using `AS SELECT`.
- The multi-table JSON changefeed incorrectly configured `confluent_schema_registry`, which is required for Avro rather than JSON. The option was removed from that JSON example.
- The cloud storage Avro example omitted the required Confluent Schema Registry option. The schema registry option was added.
- The JSON Kafka consumer used `ReadMessage`, which auto-commits offsets when using a consumer group. It now uses `FetchMessage` and commits after processing.
- The lag queries subtracted `high_water_timestamp` directly from `now()`. They now use `readable_high_water_timestamptz`, which is the timestamp column intended for readable timestamp calculations.
- The Avro Go snippet imported unused packages and variables and would not compile as shown. It now uses the imports and includes a `main` entry point.
- The monitoring CronJob used an old CockroachDB container tag. It was updated to the current stable tag used during validation.

## Review Notes
The Go Avro consumer remains a skeleton and does not implement full Confluent wire-format/schema-registry decoding. That is acceptable because the post labels it as implementation placeholder code, but a future revision should provide a complete decoder if the section is intended to be copy-paste runnable.
