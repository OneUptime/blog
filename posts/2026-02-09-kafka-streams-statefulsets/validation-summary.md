# Validation Summary: How to Implement Kafka Streams Applications on Kubernetes with StatefulSets

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Apache Kafka Streams
- Apache Kafka command-line tools
- Kubernetes StatefulSets
- Kubernetes PersistentVolumeClaims and StorageClasses
- Amazon EBS CSI Driver
- Prometheus / JMX monitoring
- RocksDB state stores
- Docker

## Sources Consulted
- Apache Kafka Streams configuration documentation: https://kafka.apache.org/39/streams/developer-guide/config-streams/
- Apache Kafka Streams `TimeWindows` Javadoc: https://dlcdn.apache.org/kafka/3.9.1/javadoc/org/apache/kafka/streams/kstream/TimeWindows.html
- Apache Kafka Streams `RocksDBConfigSetter` Javadoc: https://dist.apache.org/repos/dist/dev/kafka/3.9.0-rc4/javadoc/org/apache/kafka/streams/state/RocksDBConfigSetter.html
- Apache Kafka Streams application reset tool documentation: https://kafka.apache.org/33/streams/developer-guide/app-reset-tool/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Amazon EKS StorageClass documentation for EBS CSI parameters: https://docs.aws.amazon.com/eks/latest/userguide/create-storage-class.html
- Prometheus JMX Exporter documentation: https://github.com/prometheus/jmx_exporter

## Issues Found
- The main Kafka Streams Java example used `KeyValue.pair(...)` without importing `org.apache.kafka.streams.KeyValue`. Added the missing import.
- The Java example used deprecated `TimeWindows.of(Duration)`. Replaced it with `TimeWindows.ofSizeWithNoGrace(Duration)` to use the current Kafka Streams API.
- The architecture section implied a StatefulSet identity guarantees the same Kafka Streams data/task assignment after restart. Clarified that StatefulSets preserve storage identity, while Kafka Streams tasks can still rebalance and restore from changelog topics.
- The StatefulSet readiness probe checked for `/var/lib/kafka-streams/.running`, but the application never creates that file. Replaced both liveness and readiness checks with an anchored Java process check matching the Docker entrypoint.
- The StatefulSet included Prometheus scrape annotations on the raw JMX port and `/metrics` path. Removed the incorrect annotations and added a note that Prometheus scraping requires a JMX Exporter endpoint.
- The StorageClass used the deprecated in-tree AWS EBS provisioner `kubernetes.io/aws-ebs` with gp3-style parameters. Updated it to the EBS CSI provisioner `ebs.csi.aws.com` and the CSI filesystem parameter key.
- The monitoring snippet described `client.id` as a custom tag. Corrected the wording to say it sets a client ID for filtering.
- The backup CronJob used `amazon/aws-cli:latest` while the script calls both `aws` and `kubectl`. Updated the image reference to a custom image name that indicates both CLIs must be present.
- The RocksDB configuration example omitted required imports, created a new `BlockBasedTableConfig` instead of reusing the existing one, and did not implement `RocksDBConfigSetter.close(...)`. Added imports, reused `options.tableFormatConfig()`, and implemented `close`.

## Review Notes
- The backup CronJob remains an illustrative example and would still need a Kubernetes ServiceAccount/RBAC permissions setup and production-specific backup consistency decisions.
- The Dockerfile uses an `openjdk:17-slim` style base image. It is technically plausible, but production images may prefer a currently maintained JDK distribution such as Eclipse Temurin.
