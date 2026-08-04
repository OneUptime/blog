# Validation Summary: Prometheus HA Remote Write: Preventing Duplicate and Out-of-Order Samples

## Status
validated

## Post Type
Technical configuration and troubleshooting guide

## Technologies Covered

- Prometheus
- Prometheus Remote Write 1.0 and 2.0
- Prometheus TSDB
- PromQL
- Grafana Mimir
- Grafana Mimir HA tracker and memberlist KV store

## Sources Consulted

- [Prometheus configuration reference](https://prometheus.io/docs/prometheus/latest/configuration/configuration/)
- [Prometheus Remote Write 1.0 specification](https://prometheus.io/docs/specs/prw/remote_write_spec/)
- [Prometheus Remote Write 2.0 specification](https://prometheus.io/docs/specs/prw/remote_write_spec_2_0/)
- [Prometheus storage and built-in Remote Write receiver documentation](https://prometheus.io/docs/prometheus/latest/storage/)
- [Prometheus HTTP API documentation](https://prometheus.io/docs/prometheus/latest/querying/api/)
- [Prometheus Remote Write queue instrumentation source](https://github.com/prometheus/prometheus/blob/main/storage/remote/queue_manager.go)
- [Grafana Mimir high-availability deduplication documentation](https://grafana.com/docs/mimir/latest/configure/configure-high-availability-deduplication/)
- [Grafana Mimir configuration parameters](https://grafana.com/docs/mimir/latest/configure/configuration-parameters/)
- [Grafana Mimir out-of-order samples ingestion documentation](https://grafana.com/docs/mimir/latest/configure/configure-out-of-order-samples-ingestion/)
- [Grafana Mimir out-of-order error runbook](https://grafana.com/docs/mimir/latest/manage/mimir-runbooks/#err-mimir-sample-out-of-order)

## Issues Found
No technical issues found.

## Review Notes

- The Mimir YAML is correctly presented as a configuration excerpt. A multi-instance deployment must also have working shared memberlist configuration, typically already used by other Mimir components; otherwise it must configure `memberlist.join_members`.
- Mimir's per-series HA deduplication option remains experimental in the current documentation.
- Prometheus Remote Write 2.0 remains marked experimental in the current specification. The post does not depend on a 2.0-only feature, and its ordering statement is correct for both Remote Write 1.0 and 2.0.
