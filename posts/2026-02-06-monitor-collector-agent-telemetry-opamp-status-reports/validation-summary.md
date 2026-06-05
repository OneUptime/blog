# Validation Summary: How to Monitor Collector Agent Telemetry via OpAMP Status Reports

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector internal telemetry
- OpAMP
- OpAMP Supervisor
- OTLP metrics
- Prometheus metrics endpoint configuration
- Go
- YAML

## Sources Consulted
- OpenTelemetry OpAMP specification: https://opentelemetry.io/docs/specs/opamp/
- OpAMP protobuf definitions: https://github.com/open-telemetry/opamp-spec/blob/main/proto/opamp.proto
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector management and OpAMP Supervisor documentation: https://opentelemetry.io/docs/collector/management/
- OpAMP Supervisor configuration source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/cmd/opampsupervisor/supervisor/config/config.go
- OpAMP Supervisor own telemetry template: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/cmd/opampsupervisor/supervisor/templates/owntelemetry.yaml
- OpAMP Supervisor design and configuration documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/cmd/opampsupervisor/specification/README.md

## Issues Found
- The post incorrectly claimed that agent metrics are sent inside the OpAMP `AgentToServer` message through a `CustomMetrics` field. The OpAMP protobuf has no `CustomMetrics` field on `AgentToServer`. I changed the explanation and Go example to use `ReportsOwnMetrics` plus `ServerToAgent.connection_settings.own_metrics`, which directs the agent to an OTLP/HTTP metrics endpoint.
- The Collector internal telemetry example used `service.telemetry.metrics.address`, which is ignored as of Collector v0.123.0. I replaced it with the current `service.telemetry.metrics.readers` Prometheus pull reader configuration.
- The Collector config snippet referenced `otlp`, `batch`, and `otlp/backend` components without defining them. I added minimal receiver, processor, and exporter definitions so the snippet is structurally valid.
- The supervisor configuration used `agent.storage_dir` and an `own_metrics` scrape block, which are not part of the current supervisor configuration. I changed storage to `storage.directory`, added `$OWN_TELEMETRY_CONFIG` to `agent.config_files`, and removed the unsupported `own_metrics` block.
- The metrics parsing example used `otelcol_process_cpu_seconds_total` and treated CPU as a gauge. Collector internal telemetry documents the OTLP metric as `otelcol_process_cpu_seconds`, a counter. I updated the example to parse it as a sum.
- The threshold map used `otelcol_processor_dropped_spans`, which is not a current documented Collector internal metric. I changed it to `otelcol_receiver_refused_spans`.
- The queue threshold treated `otelcol_exporter_queue_capacity` as a percentage. The documented metric is fixed queue capacity in batches, so I changed the example to use a derived queue usage ratio from queue size and capacity.
- The fleet dashboard example divided by `len(agents)` without handling an empty fleet. I added an empty response guard.

## Review Notes
The Go snippets remain illustrative and depend on application-specific helper functions such as `getSumValue`, `getGaugeValue`, `settingsHash`, `tokenFor`, `metricsStore`, and `alertManager`. Metric names shown are OTLP names; Prometheus-exported names may add suffixes depending on exporter settings.
