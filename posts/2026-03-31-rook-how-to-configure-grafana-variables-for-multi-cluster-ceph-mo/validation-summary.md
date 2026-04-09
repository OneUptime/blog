# Validation Summary: How to Configure Grafana Variables for Multi-Cluster Ceph Monitoring

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- Grafana (dashboard and visualization)
- Prometheus (metrics collection and querying)
- Prometheus Operator (Kubernetes operator for Prometheus)
- PromQL (Prometheus query language)

## Sources Consulted
- Prometheus documentation on `external_labels`: https://prometheus.io/docs/prometheus/latest/configuration/configuration/#configuration-file
- Prometheus Operator API reference for the `Prometheus` CRD (`spec.externalLabels`): https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus Operator API reference for `PrometheusRule` CRD (to confirm it does not support `externalLabels`): https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.PrometheusRule
- Grafana documentation on template variables: https://grafana.com/docs/grafana/latest/dashboards/variables/
- Grafana documentation on `label_values()` function for variable queries: https://grafana.com/docs/grafana/latest/datasources/prometheus/template-variables/
- Ceph documentation on Prometheus metrics exported by the Ceph MGR module: https://docs.ceph.com/en/latest/mgr/prometheus/
- Ceph mixin dashboards repository: https://github.com/ceph/ceph/tree/main/monitoring/ceph-mixin/

## Issues Found
- **Incorrect mention of `PrometheusRule`**: In Step 1, the text stated "update the `PrometheusRule` or the Prometheus custom resource" when describing where to set `externalLabels`. The `PrometheusRule` CRD is used exclusively for defining alerting and recording rules — it does not have an `externalLabels` field. Only the `Prometheus` custom resource supports `spec.externalLabels`. Fixed by removing the `PrometheusRule` mention, changing the text to "update the Prometheus custom resource".

## Review Notes
- All Ceph metric names used (`ceph_health_status`, `ceph_osd_up`, `ceph_osd_stat_bytes`, `ceph_pool_bytes_used`) are valid metrics exported by the Ceph MGR Prometheus module.
- All PromQL expressions are syntactically correct and semantically appropriate for their described purpose.
- The Grafana variable configuration (types, query syntax, `label_values()` usage, `$variable` references, dependent variables, multi-value options) is all correct.
- The dashboard JSON snippet uses a string-based datasource reference (`"federated-prometheus"`), which works but note that Grafana 8+ prefers UID-based references (`{"type": "prometheus", "uid": "..."}`). The string format remains functional for backward compatibility.
- The `refresh: 2` value in the JSON corresponds to "On Time Range Change" in Grafana, which is appropriate for query-based variables.
- The Ceph mixin dashboards GitHub path is a valid reference for finding pre-built Ceph Grafana dashboards.
