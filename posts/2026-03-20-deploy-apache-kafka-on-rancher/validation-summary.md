# Validation Summary: How to Deploy Apache Kafka on Rancher

## Status
validated

## Post Type
Tutorial / Step-by-step deployment guide

## Technologies Covered
- Apache Kafka (KRaft mode, Kafka 4.x via Bitnami chart appVersion)
- Bitnami Kafka Helm chart (v32.x)
- Helm 3
- Kubernetes / Rancher
- Longhorn (StorageClass)
- JMX metrics exporter
- `kafka-topics.sh`, `kafka-console-producer.sh`, `kafka-console-consumer.sh`

## Sources Consulted
- Bitnami Kafka chart values.yaml: https://github.com/bitnami/charts/blob/main/bitnami/kafka/values.yaml
- Bitnami Kafka chart README (upgrade notes for 26.0.0 and 32.0.0): https://github.com/bitnami/charts/tree/main/bitnami/kafka
- Apache Kafka docs (KRaft mode, server.properties): https://kafka.apache.org/documentation/

## Issues Found

The Step 2 `kafka-values.yaml` contained several keys that do not exist in the modern Bitnami Kafka chart (v26.0.0+, with further changes in v32.0.0). As written, Helm would silently ignore them and install Kafka with chart defaults instead of the user's intent. Fixed:

1. **`kraft.enabled: true` removed.** The `kraft` key was removed in chart v32.0.0 (Kafka 4.x) — KRaft is now the only supported mode. Replaced the line with a comment explaining KRaft is the default.
2. **Top-level `replicaCount: 3` → `controller.replicaCount: 3`.** Since chart v26.0.0 the chart uses split `controller` and `broker` StatefulSets. With `controller.controllerOnly: false` (default), the three controllers also run as brokers, matching the post's "three-broker cluster" claim.
3. **Top-level `persistence:` → `controller.persistence:`.** Same v26.0.0 restructure — persistence is configured per StatefulSet.
4. **Top-level `resources:` → `controller.resources:`.** Same reason.
5. **Top-level `config: |` (block string) → `controller.overrideConfiguration:` (YAML map).** No top-level `config` or `extraConfig` key exists in the chart. The chart's `overrideConfiguration` takes a YAML map of key/value pairs (transformed to `key=value` properties internally) and merges them on top of the auto-generated config — which is what the post intends. Using `controller.config` instead would have *replaced* the generated config and broken the cluster.
6. **Added `listeners.client.protocol: PLAINTEXT`.** The chart's default for the 9092 client listener is `SASL_PLAINTEXT`, which means the Step 5/6 admin and producer/consumer commands (`kafka-topics.sh --bootstrap-server localhost:9092 ...`) would fail with auth errors as written. Switching the client listener to `PLAINTEXT` makes the tutorial commands work as shown; controller/interbroker SASL remains in place. Added an inline comment noting the production trade-off.

## Review Notes
- The `kafka-controller-0` pod name in Steps 4 and 5 is correct for the default (`controller.replicaCount: 3`, `broker.replicaCount: 0`) layout where the controller StatefulSet hosts combined controller+broker nodes.
- The internal service DNS `kafka.messaging.svc.cluster.local:9092` in Step 7 is correct — the chart creates a `kafka` Service in the release namespace.
- The chart appVersion is Kafka 4.x; `min.insync.replicas`, `log.retention.hours`, and the other tuning keys used here are still valid `server.properties` keys.
- Bitnami announced changes to its catalog in 2025 (Bitnami Secure Images). The community chart at `https://charts.bitnami.com/bitnami` continues to function but may receive reduced maintenance; readers running production workloads should verify the repository's status before standardizing on it.
- For real production deployments the post should warn against `listeners.client.protocol: PLAINTEXT` outside of a tutorial; the inline comment now flags this.
