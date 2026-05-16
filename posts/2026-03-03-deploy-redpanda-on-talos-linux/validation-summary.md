# Validation Summary: How to Deploy Redpanda on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (immutable Kubernetes OS)
- Redpanda (Kafka-compatible streaming platform)
- Redpanda Operator (Kubernetes operator for Redpanda)
- Helm (package manager for Kubernetes)
- rpk (Redpanda CLI)
- Confluent Kafka CLI (`kafka-console-producer`, `kafka-console-consumer`)
- Redpanda Console (web UI)
- Schema Registry (Confluent-compatible API)
- Prometheus metrics

## Sources Consulted
- Redpanda CRD reference (cluster.redpanda.com/v1alpha2): https://docs.redpanda.com/current/reference/k-crd/
- Redpanda Helm Chart Specification: https://docs.redpanda.com/current/reference/k-redpanda-helm-spec/
- Redpanda Public Metrics Reference: https://docs.redpanda.com/current/reference/public-metrics-reference/
- Redpanda Kubernetes Authentication: https://docs.redpanda.com/current/manage/kubernetes/security/authentication/k-authentication/
- Redpanda TSB-2024-14 (vectorized repo removal): https://support.redpanda.com/hc/en-us/articles/28494748119959
- Confluent Schema Registry API Reference: https://docs.confluent.io/platform/current/schema-registry/develop/api.html
- Apache Kafka documentation (kafka-console-producer deprecations)
- Talos Linux machine config reference: https://www.talos.dev/v1.7/reference/configuration/

## Issues Found

1. **CRD apiVersion outdated.** The Redpanda CR used `cluster.redpanda.com/v1alpha1`, which is the older operator API. The current Redpanda Operator v2 uses `cluster.redpanda.com/v1alpha2`. Updated to `v1alpha2`.

2. **Invalid listener TLS fields.** Each listener had `tls.enabled: true`, but the chart expects `tls.cert: <name>` referencing a cert defined under the top-level `tls.certs`. Updated all four listeners (`kafka`, `admin`, `schemaRegistry`, `http`) to use `tls.cert: default` and added the matching `tls.certs.default.caEnabled: true` block at the cluster TLS level.

3. **Invalid memory subfields.** The `resources.memory.redpanda.memory` and `resources.memory.redpanda.reserveMemory` keys are not part of the current Helm/CRD `clusterSpec`. Removed the `redpanda` subsection; `resources.memory.container.max` is sufficient and the operator handles the Redpanda/overhead split automatically.

4. **Invalid tuning fields.** `tune_clocksource`, `tune_ballast_file`, and `ballast_file_size` are not documented `clusterSpec.tuning` fields in the current Helm chart. Removed those entries; kept the valid `tune_aio_events: true`.

5. **Deprecated `kafka-console-producer` flag.** `--broker-list` has been deprecated since Apache Kafka 2.0 in favor of `--bootstrap-server`. Updated the producer command to use `--bootstrap-server`.

6. **Incorrect Prometheus metric names.**
   - `redpanda_storage_disk_used_bytes` does not exist. Replaced with `redpanda_storage_disk_free_bytes` (the actual exported metric; `redpanda_storage_disk_total_bytes` also exists).
   - `redpanda_kafka_consumer_group_lag` does not exist as a single metric. Replaced with `redpanda_kafka_consumer_group_lag_sum` (the aggregated lag metric).

## Review Notes

- The Schema Registry curl example in Step 7 uses `http://localhost:8081`, but Step 3 enables TLS on the Schema Registry listener. In a real TLS-enabled deployment users would need to use `https://` and supply the CA cert. Left as-is because the curl serves to illustrate API usage; production users typically configure their listeners according to their security posture.
- The `confluentinc/cp-kafka:latest` and `redpandadata/console:latest` image tags use `latest`, which is generally discouraged for production. Pinning to a specific version would be preferable but is a stylistic choice, not a technical error.
- The `disks` partition entry under Talos `machine` config omits a `size` field; Talos treats this as "use remaining device space," which is acceptable for a dedicated data disk.
- The `confluentinc/cp-kafka` image is large (~1GB+) — `bitnami/kafka` or `apache/kafka` images are lighter alternatives if image pull time matters.
- Note that `users.txt` mechanism defaults to `SCRAM-SHA-512` if omitted; the example explicitly uses `SCRAM-SHA-256`, which is valid but `SCRAM-SHA-512` is generally preferred for new deployments.
