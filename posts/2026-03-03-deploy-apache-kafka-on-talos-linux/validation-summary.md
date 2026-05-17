# Validation Summary: How to Deploy Apache Kafka on Talos Linux

## Status
validated

## Post Type
Tutorial / Step-by-step deployment guide

## Technologies Covered
- Apache Kafka 3.7.0 (KRaft mode)
- Talos Linux (machine configuration, sysctls, disks)
- Kubernetes (StatefulSet, Service, ConfigMap, Namespace, PVC)
- kafka-storage.sh / kafka-server-start.sh / kafka-topics.sh / kafka-console-producer.sh / kafka-console-consumer.sh
- danielqsj/kafka-exporter (Prometheus metrics)

## Sources Consulted
- Apache Kafka 3.7 documentation — https://kafka.apache.org/37/documentation.html
- Apache Kafka KRaft configuration reference — https://kafka.apache.org/documentation/#kraft
- Apache Kafka Docker image (apache/kafka) — https://hub.docker.com/r/apache/kafka
- Confluent OS-level tuning guide — https://docs.confluent.io/platform/current/kafka/deployment.html
- Talos Linux machine configuration reference — https://www.talos.dev/v1.7/reference/configuration/v1alpha1/config/
- Kubernetes StatefulSet documentation — https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- danielqsj/kafka-exporter — https://github.com/danielqsj/kafka_exporter

## Issues Found
No technical issues found. All KRaft properties (`process.roles`, `node.id`, `controller.quorum.voters`, `controller.listener.names`, `listener.security.protocol.map`, `inter.broker.listener.name`) are correct for Apache Kafka 3.7. The `kafka-storage.sh format --config ... --cluster-id ... --ignore-formatted` command and flags are valid in 3.7. The `apache/kafka:3.7.0` image is the official Apache-published image and exposes the binaries at `/opt/kafka/bin/` as referenced. CLI examples (`kafka-topics.sh`, console producer/consumer) use the current `--bootstrap-server` flag.

## Review Notes
- `vm.dirty_ratio: "80"` is on the high end (kernel default is 20) but falls within Kafka tuning guidance commonly cited by LinkedIn/Confluent; left as-is.
- The PVC mounts at `/var/lib/kafka` while `log.dirs=/var/lib/kafka/data`. The format step will create the `data` subdirectory; on storage backends that don't honor `fsGroup` (which is not set here), users on certain providers may need to add a `securityContext.fsGroup: 1000` for the apache/kafka image (UID 1000). Local-path provisioner used in the post works without it.
- `controller.quorum.voters` is the correct property for Kafka 3.7. In Kafka 3.9+, `controller.quorum.bootstrap.servers` is the preferred property — this post is pinned to 3.7.0 so the current property is appropriate.
- The Talos `machine.disks` block partitions `/dev/sdb` and mounts it at `/var/lib/kafka-data`, which is decoupled from the PVC path used by the StatefulSet (the PVC uses the `local-path` StorageClass). This is a setup convenience rather than a wired pipeline; readers would need to configure the StorageClass to use that disk for the partitioning to be meaningful.
- `talosctl apply-config --file` applies a full machine config; the snippet shown is a partial config patch. In practice users would either merge it with their existing machine config or use `talosctl patch mc` / config patches. This shorthand is consistent with the conventions used across the rest of this Talos blog series.
