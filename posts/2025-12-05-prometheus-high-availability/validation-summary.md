# Validation Summary: How to Configure High Availability for Prometheus

## Status
validated

## Post Type
Guide / Tutorial (production HA architecture patterns with Kubernetes manifests)

## Technologies Covered
- Prometheus (v2.47.0)
- Thanos (v0.32.0) — sidecar, query, store gateway, compactor
- Cortex (v1.15.0) / Grafana Mimir
- Alertmanager (v0.26.0)
- Kubernetes (StatefulSets, Deployments, Services, Secrets, ConfigMaps)
- PromQL

## Sources Consulted
- Prometheus configuration & feature flags: https://prometheus.io/docs/prometheus/latest/configuration/configuration/ and https://prometheus.io/docs/prometheus/2.54/feature_flags/
- Prometheus 3.0 migration guide (expand-external-labels default behavior): https://prometheus.io/docs/prometheus/latest/migration/
- Thanos Query component docs (v0.32): https://thanos.io/v0.32/components/query.md/ and https://github.com/thanos-io/thanos/blob/main/docs/components/query.md
- Thanos sidecar source/metrics (`thanos_sidecar_prometheus_up`): https://github.com/thanos-io/thanos/blob/main/cmd/thanos/sidecar.go and https://thanos.io/tip/components/sidecar.md/
- Thanos objstore bucket operations metric: https://github.com/thanos-io/thanos/blob/main/docs/components/sidecar.md
- Cortex remote_write push API and `-target=all`: https://cortexmetrics.io/docs/

## Issues Found
1. **Wrong Thanos Query store flag (deprecated).** The `thanos query` manifest used `--store=...`. The `--store` flag is deprecated in favor of `--endpoint` as of Thanos v0.32 (the exact version pinned in the post). Updated both occurrences to `--endpoint=...`. The DNS SD prefix (`dnssrv+_grpc._tcp...`) is unchanged and remains valid.

2. **Incorrect environment-variable expansion syntax.** The Cortex-section Prometheus config used `replica: $(POD_NAME)`. Prometheus does not support shell-style `$(VAR)` substitution; its external-label expansion uses `${VAR}` / `$VAR`. Changed to `replica: ${POD_NAME}`. (See Review Notes for the feature-flag caveat that still applies in v2.x.)

3. **Wrong Thanos metric name.** The monitoring section referenced `thanos_store_bucket_operations_total`. The actual object-storage operations counter is `thanos_objstore_bucket_operations_total`. Corrected the metric name.

## Review Notes
- **expand-external-labels caveat (v2.x):** With Prometheus v2.47.0, `${POD_NAME}` expansion in `external_labels` only works when the server is started with `--enable-feature=expand-external-labels`, and `POD_NAME` must be exported into the container's environment (as the basic-HA StatefulSet already does via the downward API). This experimental flag became default behavior in Prometheus 3.0. The post does not show the flag in the Cortex-section launch args; readers on v2.x must add it for the expansion to take effect. The corrected `${POD_NAME}` syntax is the necessary precondition either way.
- `thanos_sidecar_prometheus_up` and the corrected `thanos_objstore_bucket_operations_total` are both confirmed valid Thanos metric names.
- All pinned image tags are real, released versions: `prom/prometheus:v2.47.0`, `prom/alertmanager:v0.26.0`, `quay.io/thanos/thanos:v0.32.0`, `cortexproject/cortex:v1.15.0`.
- Thanos sidecar setup correctly disables local compaction by setting `--storage.tsdb.min-block-duration` and `--storage.tsdb.max-block-duration` both to `2h` with `2h` retention — required for sidecar upload to object storage.
- Thanos compactor `replicas: 1` constraint, Alertmanager `--cluster.*` gossip flags, retention-resolution flags, and the Cortex `/api/v1/push` remote-write endpoint with `-target=all` are all accurate.
- Forward-looking (not changed): in Thanos versions after v0.32, `--endpoint` itself is being superseded by `--endpoint.sd-config`; the `--endpoint` form remains correct and supported for the v0.32 version this post targets.
- Cortex is in maintenance/legacy status relative to Grafana Mimir (its successor), which the post acknowledges by pairing them in the headings; no change needed.
