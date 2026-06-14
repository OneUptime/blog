# Validation Summary: How to Tune Kafka for Million Messages Per Second

## Status
validated

## Post Type
Technical tuning guide

## Technologies Covered
- Apache Kafka producers
- Apache Kafka brokers
- Apache Kafka topics and partitions
- Apache Kafka consumers
- Kafka command-line performance tools
- Java Kafka client APIs
- Linux storage, networking, and file descriptor tuning
- Prometheus/JMX-style Kafka metrics

## Sources Consulted
- Apache Kafka Producer Configuration Reference: https://kafka.apache.org/41/configuration/producer-configs/
- Apache Kafka ProducerConfig Javadoc: https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/producer/ProducerConfig.html
- Apache Kafka KafkaProducer Javadoc: https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/producer/KafkaProducer.html
- Apache Kafka Broker Configuration Reference: https://kafka.apache.org/41/configuration/broker-configs/
- Apache Kafka Topic Configuration Reference: https://kafka.apache.org/41/configuration/topic-configs/
- Apache Kafka Consumer Configuration Reference: https://kafka.apache.org/41/configuration/consumer-configs/
- Apache Kafka Basic Kafka Operations: https://kafka.apache.org/41/operations/basic-kafka-operations/
- Apache Kafka 4.2 Upgrade Notes: https://kafka.apache.org/42/getting-started/upgrade/
- Confluent Kafka CLI Tools Reference: https://docs.confluent.io/kafka/operations-tools/kafka-tools.html
- Confluent Kafka JMX Monitoring Reference: https://docs.confluent.io/platform/current/kafka/monitoring.html

## Issues Found
- The synchronous producer example referenced `record` without creating it inside the loop. Added the `ProducerRecord` construction so the snippet is syntactically coherent.
- The producer section implied multiple producer instances are the default path for extreme throughput. Updated the wording to reflect the official KafkaProducer guidance that the producer is thread-safe and one shared instance is usually faster, while preserving multi-producer sharding as an option after measurement.
- The producer pool used `% producers.size()` with an `AtomicInteger`, which can produce a negative index after integer overflow. Replaced it with `Math.floorMod(...)`.
- The `server.properties` snippet used inline comments after numeric values. Java properties parsing treats those as part of the value, so Kafka could reject the configuration. Moved the annotations to separate comment lines.
- The broker snippet set `log.flush.interval.messages` and `log.flush.interval.ms` while saying the OS should manage flushing for best throughput. Removed those forced-flush settings and left the recommendation to leave them unset.
- The `kafka-configs.sh --add-config` example split one comma-separated argument across indented shell continuation lines, which can introduce whitespace into the config keys. Changed it to one comma-separated argument.
- The consumer tuning example used manual `commitSync()` without disabling auto commit. Added `enable.auto.commit=false`.
- The parallel consumer example caught worker exceptions and still committed offsets, which can acknowledge failed records. Changed it to throw on worker failure before `commitSync()`.
- The performance-test commands used Kafka 4.2-deprecated options: `--producer-props` and `--messages`. Updated them to `--bootstrap-server` / `--command-property` and `--num-records`.

## Review Notes
The Prometheus metric names are exporter-rule dependent; the post presents plausible JMX-exported metric names, but production users should align the PromQL with their actual JMX exporter or metrics reporter configuration. Throughput recommendations such as partition counts, batch sizes, and heap sizes remain workload- and hardware-dependent, which the post notes.
