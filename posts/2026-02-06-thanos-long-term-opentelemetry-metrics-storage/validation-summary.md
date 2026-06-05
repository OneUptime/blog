# Validation Summary: How to Configure Thanos for Long-Term OpenTelemetry Metrics Storage

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- Prometheus Remote Write
- Prometheus TSDB configuration
- Thanos Sidecar
- Thanos Store Gateway
- Thanos Compactor
- Thanos Query
- S3-compatible object storage
- Grafana Prometheus data source provisioning
- PromQL monitoring queries

## Sources Consulted
- OpenTelemetry Collector Contrib Prometheus Remote Write exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusremotewriteexporter/README.md
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus command-line flags: https://prometheus.io/docs/prometheus/latest/command-line/prometheus/
- Prometheus storage documentation: https://prometheus.io/docs/prometheus/latest/storage/
- Thanos Sidecar documentation: https://thanos.io/tip/components/sidecar.md/
- Thanos Store Gateway documentation: https://thanos.io/tip/components/store.md/
- Thanos Compactor documentation: https://thanos.io/tip/components/compact.md/
- Thanos Query documentation: https://thanos.io/tip/components/query.md/
- Thanos object storage configuration documentation: https://thanos.io/tip/thanos/storage.md/
- Grafana provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana Prometheus data source documentation: https://grafana.com/docs/grafana/latest/datasources/prometheus/

## Issues Found
- The OpenTelemetry Collector exporter used the deprecated `prometheusremotewrite` component alias. Changed it to the current `prometheus_remote_write` name and updated the pipeline reference.
- The OpenTelemetry Collector remote write exporter used an HTTP endpoint without explicitly disabling TLS. Added `tls.insecure: true` for the HTTP Prometheus receiver endpoint.
- The architecture diagram showed Thanos Query aggregating directly from Prometheus. Changed it to aggregate from the Thanos Sidecar, which exposes Prometheus data through the StoreAPI.
- The post referred to `thanos query` as the Query frontend. Changed the wording to Thanos Query because Query Frontend is a separate Thanos component.
- The Prometheus config used `remote_write: []` as if it enabled remote write ingestion. Removed it because Prometheus receives remote write through the `--web.enable-remote-write-receiver` flag.
- The Prometheus config placed command-line-only TSDB block duration settings in `prometheus.yml` and used the wrong retention key shape. Replaced it with the current `storage.tsdb.retention.time` YAML structure and kept min/max block duration in the Prometheus command.
- The Thanos S3 config used shell-style environment placeholders for credentials. Removed the literal `access_key` and `secret_key` values and documented that Thanos reads AWS credential environment variables when the config keys are omitted.
- The post claimed downsampling itself creates significant storage savings and used an incorrect 15-second to 5-minute sample ratio. Reworded this to match Thanos documentation: downsampling is primarily for faster long-range queries, while storage reduction comes from retaining coarser data after deleting older raw blocks.
- The Thanos Query command used `--store` flags, which are not current Thanos Query flags. Replaced them with an endpoint discovery config file and `--endpoint.sd-config-file`.
- The Grafana provisioning example used a numeric `timeout` value. Changed it to a string value, matching Grafana provisioning documentation.
- The sidecar upload failure PromQL example used a stale metric name. Replaced it with the current object-store operation failure metric filtered to sidecar uploads.

## Review Notes
- The Store Gateway `--index-cache-size` flag remains valid, but Thanos also supports more explicit index cache configuration through `--index-cache.config-file` or `--index-cache.config`.
- Thanos documentation currently marks static `--endpoint` flags as deprecated in favor of endpoint discovery configuration. The post now uses endpoint discovery to avoid deprecated flags.
- The compactor retention values are valid, but operators should choose retention periods based on whether they need to zoom into historical raw samples.
