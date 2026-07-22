# Validation Summary: Migrating from Datadog to Groundcover Without Losing Coverage

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered

- Groundcover automated migrations, monitors, dashboards, data sources, and telemetry mapping
- Datadog monitors, dashboards, APM SDKs, DogStatsD, dual shipping, and Observability Pipelines
- Kubernetes and eBPF-based telemetry collection
- OpenTelemetry and Prometheus ingestion
- Trace sampling and custom-metric ingestion

## Sources Consulted

- [Groundcover migrations](https://docs.groundcover.com/getting-started/migrations)
- [Groundcover Datadog SDK ingestion](https://docs.groundcover.com/integrations/data-sources/datadog/sending-directly-from-instrumented-services)
- [Groundcover architecture overview](https://docs.groundcover.com/architecture/overview)
- [Groundcover integrations overview](https://docs.groundcover.com/integrations/overview)
- [Groundcover data sources](https://docs.groundcover.com/integrations/data-sources)
- [Datadog dual shipping](https://docs.datadoghq.com/agent/configuration/dual-shipping/)
- [Datadog dashboard configuration and JSON export](https://docs.datadoghq.com/dashboards/configure/)
- [Datadog dashboard guide](https://docs.datadoghq.com/getting_started/dashboards/)
- [Datadog Dashboards API](https://docs.datadoghq.com/api/latest/dashboards/)

## Issues Found

- The documentation review date in the post was updated from July 21 to July 22, 2026, to match this validation and the corrected current feature descriptions.
- The post gave the older **Settings > Migrations** UI path. The current documentation directs administrators to the migrations page without documenting that menu path, so the text now uses the documented access wording.
- The post attributed older roadmap statements about one-click integration migration, log pipelines, and advanced metric mappings to the current migration page. Those statements are no longer present. The boundary now accurately says that Groundcover detects missing data sources and assists with setup, while the page does not document migration of log pipelines or advanced metric mappings.
- The post said `DD_DOGSTATSD_URL` should point to Groundcover's Vector service. Current Groundcover documentation routes both `DD_TRACE_AGENT_URL` and `DD_DOGSTATSD_URL` to the `groundcover-sensor` service, so the destination was corrected.
- The endpoint-redirection paragraph could imply that changing those SDK environment variables duplicates telemetry to both vendors. Groundcover describes this as redirection away from Datadog, so the post now states that maintaining Datadog coverage requires a separate path.
- The historical-data paragraph said the migration page “brings data,” which could be read as a historical telemetry import guarantee. Current documentation instead describes ensuring that current data flows through metric, label, and query mapping. The wording was narrowed, while retaining the accurate warning that no universal bulk-history import procedure is documented.

## Review Notes

The post contains no standalone code blocks or terminal commands, but it is still a technical guide because it documents concrete configuration fields, environment variables, sampling behavior, migration capabilities, and operational cutover procedures. The inline sampling field `agent.sensor.apmIngestor.dataDog.samplingRatio`, its `0`–`1` range, the 5 percent default for Kubernetes Datadog SDK traces, and Kubernetes-only direct DogStatsD custom-metric support were verified against current Groundcover documentation. All external links in the post returned successful responses during review. Groundcover's migration and ingestion capabilities are version-sensitive and should be rechecked when the post is updated.
