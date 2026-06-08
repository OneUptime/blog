# Validation Summary: How to Deploy NATS on Kubernetes

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- NATS (messaging system, including JetStream)
- Kubernetes (StatefulSets, Services, ConfigMaps, NetworkPolicies, PVCs)
- Helm (NATS official Helm chart)
- Prometheus / Prometheus Operator (ServiceMonitor, PrometheusRule)
- TLS / OpenSSL (certificate generation)
- NATS client libraries: Node.js (nats.js), Python (nats-py), Go (nats.go)
- NATS CLI

## Sources Consulted
- Official NATS Helm chart values.yaml: https://github.com/nats-io/k8s/blob/main/helm/charts/nats/values.yaml
- NATS server configuration docs: https://docs.nats.io/running-a-nats-service/configuration
- NATS JetStream docs: https://docs.nats.io/nats-concepts/jetstream
- NATS Helm chart README: https://github.com/nats-io/k8s/tree/main/helm/charts/nats
- nats.js client docs: https://github.com/nats-io/nats.js
- nats-py docs: https://github.com/nats-io/nats.py
- nats.go docs: https://github.com/nats-io/nats.go
- Kubernetes StatefulSet docs: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Prometheus Operator CRDs (ServiceMonitor, PrometheusRule)
- prometheus-nats-exporter: https://github.com/nats-io/prometheus-nats-exporter

## Issues Found
**1. Outdated Helm chart values structure (`nats-values.yaml`).** The post used the pre-1.0 NATS Helm chart layout (`cluster.enabled`, `jetstream.enabled` with `memStorage`/`fileStorage`, top-level `resources`). The current chart (v1.x+) places these under a `config:` parent and renames the storage keys:
   - `cluster.enabled` / `cluster.replicas` → `config.cluster.enabled` / `config.cluster.replicas`
   - `jetstream.enabled` → `config.jetstream.enabled`
   - `memStorage.size` → `config.jetstream.memoryStore.maxSize`
   - `fileStorage.size` / `fileStorage.storageClassName` → `config.jetstream.fileStore.pvc.size` / `config.jetstream.fileStore.pvc.storageClassName`
   - Top-level `resources` → `container.resources`

   Fixed: rewrote `nats-values.yaml` snippet using the current chart structure. `promExporter` and `podTemplate.topologySpreadConstraints` paths were already correct and left unchanged.

## Review Notes
- NATS configuration syntax in the ConfigMap (cluster routes, JetStream `store_dir`/`max_memory_store`/`max_file_store`, TLS block, `connect_retries`, `verify`, `timeout`) is correct per the NATS server config reference.
- The `/healthz` HTTP monitoring endpoint exists on the NATS server (port 8222) and is the documented endpoint for probes.
- StatefulSet definition, headless Service for stable DNS, `publishNotReadyAddresses`, `podManagementPolicy: Parallel`, and `volumeClaimTemplates` usage are all idiomatic Kubernetes patterns.
- Client library examples (Node.js, Python, Go) use correct, current API names: `connect`, `StringCodec` (still exported in nats.js 2.x), `nats.connect`, `nats.Connect`, `nats.ReconnectWait`, `nats.MaxReconnects`, `nats.Timeout`, `nats.DisconnectErrHandler`, `nats.ReconnectHandler`, `nc.ConnectedUrl()`, `nc.connected_url.netloc`. Note: nats.js has been transitioning away from `StringCodec` in favor of raw bytes / `TextEncoder`/`TextDecoder`, so future revisions may want to update the Node.js example.
- The NATS CLI commands (`nats stream add`, `nats pub`, `nats sub`, `nats stream backup`, `nats stream restore`, `nats server ping`, `nats server info`) use valid flag names (`--subjects`, `--storage`, `--replicas`, `--retention`, `--max-msgs`, `--max-bytes`, `--max-age`, `-s`).
- TLS certificate generation with openssl is correct, including SAN handling for multiple cluster DNS names.
- Prometheus metric names (`gnatsd_connz_total_connections`, `gnatsd_varz_mem`, `gnatsd_routez_num_routes`, `gnatsd_varz_in_msgs`, `gnatsd_varz_out_msgs`, `jetstream_server_total_streams`) follow the prometheus-nats-exporter naming convention; treat as illustrative since exporter versions may rename or add metrics.
- The `kubectl get pods -o custom-columns=...READY:.status.conditions[?(@.type=="Ready")].status` JSONPath is valid kubectl syntax.
- The example NATS image tag `nats:2.10-alpine` is a valid published tag on Docker Hub.
