# Validation Summary: How to Configure Flux CD Metrics Export to InfluxDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Helm
- Telegraf
- InfluxDB v2
- Flux query language
- Prometheus metrics format

## Sources Consulted
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Telegraf Prometheus input plugin documentation: https://docs.influxdata.com/telegraf/v1/input-plugins/prometheus/
- Telegraf InfluxDB v2 output plugin documentation: https://docs.influxdata.com/telegraf/v1/output-plugins/influxdb_v2/
- InfluxDB v2 tasks and downsampling documentation: https://docs.influxdata.com/influxdb/v2/process-data/
- InfluxDB v2 checks and alerting documentation: https://docs.influxdata.com/influxdb/v2/monitor-alert/checks/create/
- InfluxData Helm chart repository / Artifact Hub chart metadata: https://github.com/influxdata/helm-charts and https://artifacthub.io/packages/helm/influxdata/influxdb2

## Issues Found
- The Telegraf configuration used `metric_version = 2`, but the InfluxDB queries filtered Prometheus metric names as `_measurement` values. Telegraf documents that this query shape matches `metric_version = 1`; with `metric_version = 2`, Prometheus metric names become fields under the `prometheus` measurement. Changed the configuration to `metric_version = 1`.
- The dashboard and alert examples used `gotk_reconcile_condition`, which is not listed in current Flux controller metrics documentation. Replaced those examples with current controller metrics, primarily `controller_runtime_reconcile_total` and `gotk_reconcile_duration_seconds`.
- The "Reconciliation success rate" query returned grouped counts rather than a percentage or rate. Renamed the example to "Reconciliation results" so the label matches what the query returns.
- The duration query treated `gotk_reconcile_duration_seconds` as a direct gauge. Flux exposes it as a histogram, so the query now derives average duration from the `sum` and `count` fields.
- The post referred to InfluxDB v2 "retention policies." InfluxDB v2 primarily configures retention on buckets, so the wording was updated to "bucket retention periods."

## Review Notes
The Telegraf deployment and InfluxDB output configuration are syntactically valid for the documented plugins. The post assumes the default Flux namespace and controller service names; installations with customized namespaces, disabled controllers, or Flux Operator-managed layouts may need URL adjustments.
