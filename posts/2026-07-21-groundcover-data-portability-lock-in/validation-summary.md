# Validation Summary: How Hard Is It to Leave Groundcover? Data Formats, Schemas, and Vendor Lock-In

## Status
validated

## Post Type
Technical guide and portability assessment

## Technologies Covered
- Groundcover BYOC
- eBPF telemetry collection
- ClickHouse
- VictoriaMetrics and `vmctl`
- Prometheus, PromQL, and MetricsQL
- OpenTelemetry data models and semantic conventions
- Object storage and volume snapshots
- Terraform-managed observability configuration

## Sources Consulted
- [Groundcover architecture overview](https://docs.groundcover.com/architecture/overview)
- [Groundcover Metrics and Logs API](https://docs.groundcover.com/use-groundcover/remote-access-and-apis/raw-prometheus-and-clickhouse)
- [Groundcover querying data](https://docs.groundcover.com/use-groundcover/querying-your-groundcover-data)
- [Groundcover disaster recovery](https://docs.groundcover.com/architecture/byoc/disaster-recovery)
- [Groundcover Backup & Restore Metrics](https://docs.groundcover.com/use-groundcover/backup-and-restore-metrics)
- [Groundcover ingestion endpoints](https://docs.groundcover.com/architecture/incloud-managed/ingestion-endpoints)
- [Groundcover traces](https://docs.groundcover.com/capabilities/application-performance-monitoring-apm/traces)
- [Groundcover eBPF sampling controls](https://docs.groundcover.com/customization/customize-usage/controlling-the-ebpf-sampling-mechanism)
- [Groundcover Terraform provider](https://docs.groundcover.com/use-groundcover/groundcover-terraform-provider)
- [VictoriaMetrics data export and import](https://docs.victoriametrics.com/victoriametrics/index.html#how-to-export-data-in-json-line-format)
- [VictoriaMetrics `vmctl`](https://docs.victoriametrics.com/victoriametrics/vmctl/)
- [OpenTelemetry semantic conventions](https://opentelemetry.io/docs/specs/semconv/)
- [OpenTelemetry logs data model](https://opentelemetry.io/docs/specs/otel/logs/data-model/)
- [OpenTelemetry metrics data model](https://opentelemetry.io/docs/specs/otel/metrics/data-model/)

## Issues Found
- The post said that Groundcover's disaster-recovery documentation states that metrics do not use object storage. The documentation states more narrowly that object storage is not used for offloading metrics, while Groundcover's metric backup documentation supports object-storage destinations through VictoriaMetrics `vmbackup`. Changed the sentence to say that metrics are not offloaded to object storage.

## Review Notes
- Groundcover documents customer-operated VictoriaMetrics backup and restore with `vmbackup` and `vmrestore`, but this is a recovery workflow rather than documentation that all VictoriaMetrics export endpoints are supported for migration. The post correctly treats query access, backup access, and portable bulk export as distinct capabilities.
- Groundcover's direct ClickHouse SQL API remains documented as a deprecated legacy API. The post correctly advises against building an exit plan around it.
- VictoriaMetrics warns that native export data may be incompatible between releases. The post's recommendation to prefer inspectable formats for cross-system migration is technically sound.
- Groundcover exposes infrastructure as code for several configuration types through its Terraform provider, including monitors, log pipelines, policies, service accounts, and dashboards. Destination compatibility still requires semantic validation.
