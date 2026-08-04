# Validation Summary: `external_labels` for Cluster Identity Without Series Collisions

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Prometheus
- Prometheus Remote Write
- Prometheus external labels
- PromQL
- Prometheus federation
- Alertmanager
- High-availability metrics ingestion and deduplication

## Sources Consulted

- [Prometheus configuration reference](https://prometheus.io/docs/prometheus/latest/configuration/configuration/)
- [Prometheus Remote Write 1.0 specification](https://prometheus.io/docs/specs/prw/remote_write_spec/)
- [Prometheus data model](https://prometheus.io/docs/concepts/data_model/)
- [Prometheus querying basics](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Prometheus HTTP API: runtime configuration](https://prometheus.io/docs/prometheus/latest/querying/api/#config)
- [Prometheus federation](https://prometheus.io/docs/prometheus/latest/federation/)
- [Prometheus 3.0 migration guide](https://prometheus.io/docs/prometheus/latest/migration/#prometheus-30)
- [Prometheus Alertmanager high availability](https://prometheus.io/docs/alerting/latest/alertmanager/#high-availability)
- [Prometheus configuration loading source](https://github.com/prometheus/prometheus/blob/2c398106f846b7310570f4ba4979bead1db69171/config/config.go)
- [Prometheus Remote Write external-label merge source](https://github.com/prometheus/prometheus/blob/2c398106f846b7310570f4ba4979bead1db69171/storage/remote/queue_manager.go)

## Issues Found

- The opening collision explanation did not account for receiver tenancy. Identical label sets in different tenants remain isolated, so the text now scopes the collision to samples written into the same receiver tenant.
- The Remote Write behavior was stated without acknowledging later write relabeling. The text now notes that the receiver sees external labels unless `write_relabel_configs` removes them.
- Two external-label examples omitted the required `global` parent key. Both snippets now show valid Prometheus configuration structure.
- Environment-variable expansion was described only as behavior of “current Prometheus.” The text now identifies it as default behavior in Prometheus 3.0 and later, matching the 3.0 migration guide.

## Review Notes

- The PromQL matcher `prometheus_cluster=""` correctly matches both an explicitly empty label and a missing label.
- HA ingestion deduplication remains backend-specific, as the post states; the configured cluster and replica label names must match the selected receiver's settings.
- The configuration endpoint returns JSON whose `data.yaml` field contains the currently loaded, rendered configuration.
