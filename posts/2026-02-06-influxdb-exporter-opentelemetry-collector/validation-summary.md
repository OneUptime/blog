# Validation Summary: How to Configure the InfluxDB Exporter in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- OpenTelemetry Collector InfluxDB exporter
- OpenTelemetry Collector processors: batch, resource, filter, metricstransform, cumulativetodelta, memory_limiter
- OpenTelemetry Collector file_storage extension and exporter sending queues
- InfluxDB 2.x and InfluxDB 3.x v2-compatible write API
- InfluxDB CLI
- Flux
- Grafana InfluxDB data source

## Sources Consulted
- OpenTelemetry Collector Contrib InfluxDB exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/influxdbexporter
- OpenTelemetry Collector InfluxDB exporter config.go: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/influxdbexporter/config.go
- OpenTelemetry Collector exporterhelper queue/retry documentation: https://github.com/open-telemetry/opentelemetry-collector/tree/main/exporter/exporterhelper
- OpenTelemetry Collector filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/filterprocessor
- OpenTelemetry Collector metricstransform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/metricstransformprocessor
- OpenTelemetry Collector cumulativetodelta processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/cumulativetodeltaprocessor
- OpenTelemetry Collector file_storage extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/extension/storage/filestorage
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- InfluxDB OSS v2 installation documentation: https://docs.influxdata.com/influxdb/latest/install/
- InfluxDB CLI documentation: https://docs.influxdata.com/influxdb/v2/reference/cli/influx/
- InfluxDB auth create CLI documentation: https://docs.influxdata.com/influxdb/v2/reference/cli/influx/auth/create/
- InfluxDB delete CLI documentation: https://docs.influxdata.com/influxdb/v2/reference/cli/influx/delete/
- InfluxDB 3 compatibility write APIs documentation: https://docs.influxdata.com/influxdb3/core/write-data/http-api/compatibility-apis/
- InfluxDB checks documentation: https://docs.influxdata.com/influxdb/v2/monitor-alert/checks/

## Issues Found
- The post implied InfluxDB 2.x and 3.x had the same organization/bucket/query behavior. Updated the description and prerequisites to clarify that InfluxDB 3.x use is through the v2-compatible write API and that the exporter bucket maps to the database name.
- The architecture diagram referenced Kapacitor and Chronograf as primary alerting/analysis paths. Updated it to checks/tasks, Explorer, and Grafana to better match InfluxDB 2.x/3.x usage.
- The InfluxDB install example used an older server tarball and assumed the `influx` CLI was bundled with the server. Updated the example to InfluxDB 2.8.0 and installed the separate Influx CLI package.
- The `influx auth create --read-bucket/--write-bucket` examples used bucket names, but the CLI flags require bucket IDs. Added `BUCKET_ID` lookup commands and used the ID in token examples.
- The InfluxDB exporter examples used unsupported `tags` configuration. Removed those blocks and used resource attributes where appropriate.
- The persistent queue examples nested `directory` and `timeout` under `sending_queue.storage`, but current Collector configuration expects `sending_queue.storage` to reference a storage extension. Updated examples to define and enable `file_storage` extensions.
- The filter processor examples used deprecated legacy config paths and unqualified OTTL fields. Updated them to current `metric_conditions` syntax with `metric.` and `datapoint.` paths.
- The cumulativetodelta examples used an invalid top-level `metrics` list. Updated them to the current `include.metrics` and `match_type` structure.
- The metricstransform aggregation example used top-level aggregation fields with `action: update`. Updated it to a valid `aggregate_labels` operation.
- The Flux query section did not distinguish InfluxDB 2.x Flux usage from InfluxDB 3.x query behavior and did not account for `telegraf-prometheus-v2` measurement layout. Added a version/schema note and corrected tag names to use OpenTelemetry dotted attribute names.
- The data retention task used `drop()` as if it deleted points from storage. Replaced it with the supported `influx delete` CLI form for explicit deletes.
- The check creation CLI examples were not valid standalone check definitions. Replaced them with guidance to create checks through the InfluxDB UI or `/api/v2/checks` API.
- The Collector internal telemetry examples used the deprecated/ignored `service.telemetry.metrics.address` field. Updated them to the current `metrics.readers.pull.exporter.prometheus` configuration.
- The InfluxDB 1.x-style `auth-enabled` and `flux-enabled` TOML example did not apply to InfluxDB 2.x/3.x token authentication. Replaced it with token-based authentication guidance.

## Review Notes
The post is now technically valid as a metrics-focused guide. Future improvements could add separate InfluxDB 3.x query examples using SQL or InfluxQL, since the current Flux examples are explicitly scoped to InfluxDB 2.x.
