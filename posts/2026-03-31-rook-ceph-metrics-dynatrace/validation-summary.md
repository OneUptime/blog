# Validation Summary: How to Set Up Ceph Metrics in Dynatrace

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- Dynatrace (monitoring platform)
- Dynatrace Operator for Kubernetes
- Prometheus metrics scraping
- Dynatrace Metrics API v2
- Dynatrace Config API v1

## Sources Consulted
- Dynatrace Operator GitHub repository (https://github.com/Dynatrace/dynatrace-operator) — DynaKube CRD schema in `pkg/api/latest/dynakube/dynakube_types.go`
- Rook GitHub repository (https://github.com/rook/rook) — MGR service definitions in `pkg/operator/ceph/cluster/mgr/`
- Dynatrace documentation: Monitor Prometheus metrics (https://docs.dynatrace.com/docs/observe/infrastructure-observability/container-platform-monitoring/kubernetes-monitoring/monitor-prometheus-metrics)
- Dynatrace documentation: Metric ingestion protocol (https://docs.dynatrace.com/docs/ingest-from/extend-dynatrace/extend-metrics/reference/metric-ingestion-protocol)
- Dynatrace documentation: Metrics API v2 — POST ingest data points
- Dynatrace documentation: Config API v1 — Anomaly detection metric events
- Dynatrace documentation: Metric selector syntax and metric expressions

## Issues Found

1. **Step 1 — Wrong Prometheus port name in jsonpath filter**: The post used `@.name=="prometheus"` but Rook names the MGR metrics service port `http-metrics`, not `prometheus`. Changed to `@.name=="http-metrics"`.

2. **Step 2 — Obsolete DynaKube apiVersion**: `dynatrace.com/v1beta1` no longer exists in the Dynatrace Operator. Versions v1beta1 through v1beta3 have been removed entirely. Updated to `dynatrace.com/v1beta6` (the current storage version).

3. **Step 2 — Fabricated DynaKube spec fields**: `metricIngestPort` and `prometheusExporter` do not exist in the DynaKube spec. Replaced with the correct configuration: `activeGate.capabilities` (with `kubernetes-monitoring` and `metrics-ingest`) and `extensions.prometheus: {}` to enable Prometheus-based metric collection.

4. **Step 2 — Mixed installation approach**: The post added a Helm repo but then installed via `kubectl apply`, which is inconsistent. Removed the unnecessary Helm repo lines since the actual installation uses the manifest-based approach.

5. **Step 2 — Incorrect token secret name**: Changed `tokens: dynatrace-tokens` to `tokens: dynakube` to match the default convention.

6. **Step 5 — Incorrect metric event JSON structure**: Multiple errors in the Dynatrace Config API v1 metric event payload:
   - Removed invalid top-level `"type": "METRIC_KEY"` field (not part of Config API v1 schema)
   - Changed `"metricKey"` to `"metricId"` (correct field name for Config API v1)
   - Changed `"ext:ceph.health_status"` to `"ceph.health.status"` (metrics ingested via the Metrics API v2 do not get an `ext:` prefix, and the key must match what was ingested in Step 4)
   - Replaced `"conditions"` array with `"monitoringStrategy"` object (the `conditions` array does not exist in this API)
   - Changed `"type": "STATIC"` to `"type": "STATIC_THRESHOLD"` (correct strategy type name)
   - Added required fields `samples`, `violatingSamples`, and `dealertingSamples`
   - Added `description` field
   - Changed code fence from `yaml` to `json` since the content is JSON

7. **Step 6 — Wrong metric selector wildcard syntax**: Changed `metricSelector=ceph:*` to `metricSelector=ceph.*`. The colon separator is used for built-in metrics (e.g., `builtin:host.cpu.*`), while custom/ingested metrics use dots throughout.

8. **Step 6 — Fabricated terminology "Metric Expression Language (MXL)"**: Dynatrace does not have a feature called "MXL". The correct terms are "metric expressions" or "metric selector". Changed to "metric expressions".

## Review Notes
- The Dynatrace Config API v1 endpoint `/api/config/v1/anomalyDetection/metricEvents` used in Step 5 was deprecated in Dynatrace version 1.266. The recommended replacement is the Settings API v2 with schema `builtin:anomaly-detection.metric-events`. The post could be updated to use the newer API in the future.
- The `metrics.dynatrace.com/filter` annotation format (JSON with `mode` and `names` fields) appears to be documented in Dynatrace's Istio deployment guide and is valid.
- The `ceph health --format json` command and jq expression in Step 4 are correct for modern Ceph versions (Nautilus+) which output `{"status":"HEALTH_OK"}`.
- The Dynatrace Metrics Ingest line protocol format used in Step 4 is correct (defaults to gauge type when no type keyword is specified).
