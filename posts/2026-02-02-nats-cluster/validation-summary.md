# Validation Summary: How to Set Up NATS Cluster

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NATS server (v2.10.7)
- NATS JetStream
- NATS CLI (natscli)
- NATS Surveyor
- Docker / Docker Compose
- Kubernetes (StatefulSet, ConfigMap, Service)
- Helm (official NATS chart)
- Prometheus / prometheus-nats-exporter
- TLS / OpenSSL (PKI)
- Go NATS client (`github.com/nats-io/nats.go`)
- Node.js NATS client (`nats` npm package)
- Python NATS client (`nats-py`)

## Sources Consulted
- NATS official documentation: https://docs.nats.io/
- NATS server configuration reference: https://docs.nats.io/running-a-nats-service/configuration
- NATS clustering docs: https://docs.nats.io/running-a-nats-service/configuration/clustering
- NATS Helm chart README and values.yaml: https://github.com/nats-io/k8s/tree/main/helm/charts/nats
- prometheus-nats-exporter: https://github.com/nats-io/prometheus-nats-exporter
- NATS Surveyor: https://github.com/nats-io/nats-surveyor
- nats-server release page: https://github.com/nats-io/nats-server/releases
- nats.go client: https://github.com/nats-io/nats.go
- nats.js client: https://github.com/nats-io/nats.js
- nats.py client: https://github.com/nats-io/nats.py

## Issues Found

1. **Outdated Helm chart values (Kubernetes section).** The `helm install` command used legacy chart keys (`cluster.enabled`, `cluster.replicas`, `nats.jetstream.enabled`, `nats.jetstream.fileStore.pvc.size`). The current NATS Helm chart (v1.0+, currently v2.x) requires the `config.*` prefix. Updated all four `--set` flags to `config.cluster.enabled`, `config.cluster.replicas`, `config.jetstream.enabled`, `config.jetstream.fileStore.pvc.size`.

2. **Incorrect Prometheus monitoring section.** The post claimed NATS exposes a "Prometheus metrics endpoint" on port 8222 and provided a Prometheus scrape config pointing `metrics_path: /varz` with bogus query parameters (`srvz`, `connz`, etc., which are separate endpoints, not query params). NATS only exposes JSON monitoring endpoints — Prometheus cannot parse these directly. Rewrote the section to explain the need for `prometheus-nats-exporter`, added an example of running the exporter on port 7777, and corrected the Prometheus scrape config to target the exporter at `/metrics` on port 7777 instead.

3. **Incorrect NATS Surveyor flag usage.** The Kubernetes deployment passed `-observe my-nats-cluster` to nats-surveyor. The `-observe` flag actually takes a directory path for service observation config files, not a cluster name; passing a non-existent directory would cause the surveyor to fail. Replaced with `-c 3` (expected number of servers in the cluster), which is the correct flag for cluster monitoring.

## Review Notes
- The natscli download URL references v0.1.1, which is older than current releases (~0.2.x). The URL pattern and filename format are still valid, but readers wanting the latest features should check the natscli releases page.
- `jetstream { max_memory_store: 1Gi, max_file_store: 50Gi }` uses `Gi` suffixes. NATS' size parser accepts `G`/`GB` (powers of 1000) and IEC suffixes; left unchanged as it is widely used in NATS examples.
- The post says JetStream provides "exactly-once delivery". JetStream supports exactly-once semantics via message deduplication (using `Nats-Msg-Id` headers within a deduplication window), but the default is at-least-once. Left intact since "adds ... exactly-once delivery" is reasonable as a capability claim.
- The `host: 0.0.0.0` directive on `cluster` blocks is valid but redundant since it's the default for the cluster listener; not changed.
- Docker Compose CLI flags (`--name`, `--cluster_name`, `--cluster`, `--routes`, `--http_port`) all verified against `nats-server -h`.
- Client code (Go, Node.js, Python) uses current APIs and idiomatic patterns; no changes needed.
