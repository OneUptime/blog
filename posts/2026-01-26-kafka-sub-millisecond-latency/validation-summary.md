# Validation Summary: How to Tune Kafka for Sub-Millisecond Latency

## Status
validated

## Post Type
Technical tuning guide

## Technologies Covered
- Apache Kafka producer, consumer, broker, topic, and performance-test tooling
- Java Kafka client API
- Micrometer metrics
- Linux TCP, filesystem, and process tuning
- JVM garbage collectors: ZGC and G1GC

## Sources Consulted
- Apache Kafka 4.1 Producer Configs: https://kafka.apache.org/41/configuration/producer-configs/
- Apache Kafka 4.1 Consumer Configs: https://kafka.apache.org/41/configuration/consumer-configs/
- Apache Kafka 4.1 Broker Configs: https://kafka.apache.org/41/configuration/broker-configs/
- Apache Kafka 4.1 ProducerRecord Javadocs: https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/producer/ProducerRecord.html
- Confluent Kafka CLI Tools reference for Kafka shell tools: https://docs.confluent.io/kafka/operations-tools/kafka-tools.html
- Micrometer histograms and percentiles documentation: https://docs.micrometer.io/micrometer/reference/concepts/histogram-quantiles.html
- OpenJDK JEP 439, Generational ZGC: https://openjdk.org/jeps/439

## Issues Found
- The producer example set `acks=1` and `enable.idempotence=true`, but Apache Kafka requires `acks=all` when idempotence is explicitly enabled. Changed the low-latency `acks=1` example to set `enable.idempotence=false` and added a comment explaining the constraint.
- The producer batching example used `batch.size=1` as "effectively no batching"; Kafka documents `batch.size=0` as disabling batching. Changed the producer and producer performance-test examples to `batch.size=0`.
- The synchronous-send example subtracted `record.timestamp()` from the current time. A `ProducerRecord` created without an explicit timestamp has a nullable timestamp until the producer stamps it, so this could fail or measure the wrong thing. Changed it to capture `startMs` before sending.
- The latency instrumentation example used `Histogram.builder(...)`, which is not the Micrometer API for timing latency. Replaced it with `Timer.builder(...)` and recorded durations with explicit time units.
- The broker flush comments described forced log flushing as a faster setting and warned of data loss. Forced flushing improves crash durability but can increase latency, so the comment was corrected.
- The shell commands appended to `/etc/sysctl.conf` using `sudo` only on `sysctl -p`; the redirections would fail for a non-root shell. Replaced them with `sudo tee -a` and added `sudo` to the mount command.
- The JVM section did not mention that Generational ZGC requires Java 21 or newer. Added that caveat.
- The Kafka producer performance tool used deprecated `--producer-props`. Updated it to `--command-property`, the current option documented by the Kafka CLI reference.
- The replication section claimed "No data loss" with `acks=all`. Reworded this to Kafka's stronger but conditional guarantee: it depends on `min.insync.replicas` and an in-sync replica remaining alive.
- The latency-component bullets used malformed names like `0-linger.ms` and `0-fetch.max.wait.ms`. Replaced them with the actual configuration names.

## Review Notes
The post remains an aggressive low-latency tuning guide. Some latency numbers are workload- and hardware-dependent estimates, so they should be benchmarked in the target environment rather than treated as guarantees.
