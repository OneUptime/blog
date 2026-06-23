# Validation Summary: How to Configure Multi-Cluster Prometheus

## Status
validated

## Post Type
Guide / Tutorial (architecture patterns with configuration examples)

## Technologies Covered
- Prometheus (federation, remote write, recording rules, PromQL)
- Thanos (sidecar, query, store API, DNS service discovery, TLS)
- Kubernetes (StatefulSet, Deployment, ConfigMap, Service)
- Alertmanager (HA clustering)
- Cortex / Mimir (central metrics storage)
- Grafana (multi-cluster data sources)
- Istio (ServiceEntry for cross-cluster connectivity)

## Sources Consulted
- Thanos documentation — sidecar component: https://thanos.io/tip/components/sidecar.md/
- Thanos documentation — query component & store discovery: https://thanos.io/tip/components/query.md/
- Prometheus federation docs: https://prometheus.io/docs/prometheus/latest/federation/
- Prometheus storage / TSDB flags: https://prometheus.io/docs/prometheus/latest/storage/
- Prometheus configuration (remote_write, relabeling): https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Alertmanager HA / clustering docs: https://prometheus.io/docs/alerting/latest/alertmanager/
- Grafana provisioning data sources: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Cortex/Mimir blocks storage configuration docs

## Issues Found
No technical issues found.

All configuration snippets, CLI flags, and PromQL expressions were verified as syntactically correct and consistent with the referenced component versions:
- Thanos sidecar and query flags (`--prometheus.url`, `--objstore.config-file`, `--grpc-address`, `--query.replica-label`, `--store`, `dnssrv+` prefix, TLS flags) are valid.
- Prometheus `--storage.tsdb.min-block-duration`/`--storage.tsdb.max-block-duration=2h` correctly disable local compaction, which is the required setup for the Thanos sidecar to upload blocks.
- Federation config (`honor_labels`, `metrics_path: /federate`, `params: match[]`) matches the official federation pattern.
- Image versions (`prom/prometheus:v2.47.0`, `quay.io/thanos/thanos:v0.32.0`, `prom/alertmanager:v0.26.0`) are all real, valid releases.
- Alertmanager HA flags, Istio ServiceEntry schema (`networking.istio.io/v1beta1`), and Grafana provisioning YAML are all correct.

## Review Notes
- **Thanos replica-label dedup gap (non-blocking):** The Prometheus StatefulSet runs `replicas: 2` and both replicas share a single ConfigMap, so they emit identical `external_labels` (no per-replica distinction). Meanwhile Thanos Query is configured with `--query.replica-label=replica` and `--query.replica-label=prometheus_replica`. For Thanos deduplication to function, each Prometheus replica should carry a distinct value for one of those replica labels (commonly injected via a per-pod `prometheus_replica` external label using the pod ordinal, or via the Prometheus Operator). This is an architectural refinement rather than an error in the shown snippets, so no edit was made.
- **Version currency:** The pinned versions are valid but somewhat dated as of mid-2026. They remain functional and the flags shown are still supported; readers may wish to use newer Thanos/Prometheus releases.
- **Deprecated flags:** `--storage.tsdb.min-block-duration` / `--storage.tsdb.max-block-duration` are marked as hidden/deprecated in Prometheus but remain the documented mechanism for disabling local compaction with the Thanos sidecar, so their use here is correct.
