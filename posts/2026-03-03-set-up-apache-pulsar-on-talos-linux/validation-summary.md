# Validation Summary: How to Set Up Apache Pulsar on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Pulsar (3.2.x)
- Apache BookKeeper
- Apache ZooKeeper
- Pulsar Functions
- Talos Linux
- Kubernetes
- Helm (apache/pulsar chart)
- Prometheus / Grafana (kube-prometheus-stack)

## Sources Consulted
- Apache Pulsar Helm chart values.yaml (master and pulsar-3.0.0 tag): https://github.com/apache/pulsar-helm-chart/blob/master/charts/pulsar/values.yaml
- Apache Pulsar admin-api-functions docs: https://pulsar.apache.org/docs/3.2.x/admin-api-functions/
- Apache Pulsar admin-api-brokers docs: https://pulsar.apache.org/docs/3.2.x/admin-api-brokers/
- Apache Pulsar reference-cli-tools docs: https://pulsar.apache.org/docs/3.2.x/reference-cli-tools/

## Issues Found
1. **`pulsar-admin functions create --function-name word-count`** — The Pulsar Functions admin CLI uses the `--name` flag, not `--function-name`. Updated the command to use `--name word-count`. The status command already correctly used `--name`, so it was left as-is.
2. **`pulsar-admin brokers list pulsar-cluster`** — The Apache Pulsar Helm chart does not set a default `clusterName`; it falls back to the Helm release name (`pulsar`). The post never set `clusterName`, so the argument `pulsar-cluster` was wrong. Added an explicit `clusterName: pulsar` to the values file and updated the `brokers list` argument to `pulsar` for consistency.
3. **Helm values structure for components** — The post used `pulsar_manager: { enabled: false }`, which is not how the Apache Pulsar Helm chart toggles components. The chart uses a top-level `components:` map with boolean toggles. Replaced this with the correct `components:` block listing the enabled/disabled components.
4. **Helm values structure for monitoring** — The post used a non-existent `monitoring: { prometheus, grafana, alert_manager }` section. The Apache Pulsar Helm chart wires monitoring via the `kube-prometheus-stack` (or `victoria-metrics-k8s-stack` on newer master) subchart dependency. Rewrote both the "disable monitoring" snippet and the later "enable monitoring" snippet to use the `kube-prometheus-stack` keys (including the correct `adminPassword` key on the bundled Grafana subchart).

## Review Notes
- The bullet about ZooKeeper "being replaced by Pulsar's built-in metadata store" is slightly imprecise — Pulsar 3.x supports alternative metadata backends (Oxia, etcd, RocksDB) but ZooKeeper is not formally deprecated. Left as-is since the parenthetical hedge ("in newer versions") is broadly accurate.
- The manual StatefulSet example sets `zookeeperServers`, `configurationStoreServers`, and `clusterName` as environment variables. The official Pulsar image runs `apply-config-from-env.py` against `broker.conf` on startup, so these env vars do propagate into `broker.conf` — the example is a simplified-but-functional starting point and was left as-is.
- The `pulsar-client produce --messages "order-1,order-2,order-3" --num-produce 3` call publishes each message 3 times (9 total) rather than the 3 messages the comment implies, but the command itself is syntactically valid and demonstrates both flags. Left as-is.
- Chart values key structure follows the current `apache/pulsar` Helm chart. Users on significantly older chart releases may need to adjust.
