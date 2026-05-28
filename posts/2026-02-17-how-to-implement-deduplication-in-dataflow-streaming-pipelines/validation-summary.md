# Validation Summary: How to Implement Deduplication in Dataflow Streaming Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Dataflow
- Google Cloud Pub/Sub
- Apache Beam Java SDK
- Beam `Deduplicate`
- Beam stateful processing and timers
- Cloud Bigtable Java client
- Guava BloomFilter

## Sources Consulted
- Apache Beam `Deduplicate` Javadoc: https://beam.apache.org/releases/javadoc/current/org/apache/beam/sdk/transforms/Deduplicate.html
- Apache Beam `Deduplicate.Values` Javadoc: https://beam.apache.org/releases/javadoc/current/org/apache/beam/sdk/transforms/Deduplicate.Values.html
- Apache Beam `Deduplicate.KeyedValues` Javadoc: https://beam.apache.org/releases/javadoc/current/org/apache/beam/sdk/transforms/Deduplicate.KeyedValues.html
- Apache Beam `Timer` Javadoc: https://beam.apache.org/releases/javadoc/current/org/apache/beam/sdk/state/Timer.html
- Google Cloud Dataflow Pub/Sub streaming concepts: https://cloud.google.com/dataflow/docs/concepts/streaming-with-cloud-pubsub
- Google Cloud Pub/Sub exactly-once delivery documentation: https://cloud.google.com/pubsub/docs/exactly-once-delivery
- Cloud Bigtable `BigtableDataClient` Java reference: https://cloud.google.com/java/docs/reference/google-cloud-bigtable/latest/com.google.cloud.bigtable.data.v2.BigtableDataClient
- Cloud Bigtable `ConditionalRowMutation` Java reference: https://cloud.google.com/java/docs/reference/google-cloud-bigtable/latest/com.google.cloud.bigtable.data.v2.models.ConditionalRowMutation
- Cloud Bigtable `Row` Java reference: https://cloud.google.com/java/docs/reference/google-cloud-bigtable/latest/com.google.cloud.bigtable.data.v2.models.Row
- Guava `BloomFilter` Javadoc: https://guava.dev/releases/snapshot-jre/api/docs/com/google/common/hash/BloomFilter.html

## Issues Found
- Beam `Deduplicate.keyedValues()` was called with the wrong Java generic form. Changed `Deduplicate.<KV<String, String>>keyedValues()` to `Deduplicate.<String, String>keyedValues()` because the method type parameters are key and value types, not a single `KV` type.
- The post described `withIdAttribute` as Pub/Sub native deduplication. Changed this to Dataflow Pub/SubIO source-level deduplication because official Dataflow documentation says Dataflow uses the attribute value as the record ID and applies the 10-minute publication window.
- Clarified Beam `Deduplicate` semantics as best-effort and based on encoded element values within windows, matching the Beam Javadoc.
- Replaced the Bigtable check-then-write dedup example with an atomic `ConditionalRowMutation` and `checkAndMutateRow` flow. The original pattern could allow duplicates under concurrent processing.
- Updated the Bloom filter snippet to pass the required `Funnel` to `BloomFilter.readFrom`, use `StandardCharsets.UTF_8`, declare `throws IOException`, and serialize with `writeTo`.
- Replaced the vague reference to a specific Dataflow state size metric with a more general recommendation to monitor Dataflow state usage.

## Review Notes
The examples remain illustrative snippets rather than complete standalone Java classes with imports, pipeline options, and full event model definitions. Future improvements could add import blocks or a compact Maven dependency list if the post is intended to be copy-paste runnable.
