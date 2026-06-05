# Validation Summary: How to Monitor Log Pipeline Throughput and Detect Log Loss

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector internal telemetry
- Prometheus metrics and alerting rules
- OpenTelemetry Collector filelog receiver
- OpenTelemetry Collector Prometheus receiver
- OTLP exporters
- Bash cron-style canary log generation

## Sources Consulted
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector filelog receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Collector Prometheus receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/prometheusreceiver/README.md
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/2.54/configuration/alerting_rules/
- Prometheus query function documentation for `rate()`: https://prometheus.io/docs/prometheus/2.52/querying/functions/

## Issues Found
- The post used `service.telemetry.metrics.address`, which current OpenTelemetry Collector documentation says is ignored as of Collector v0.123.0. Updated the examples to use `service.telemetry.metrics.readers` with a pull-based Prometheus exporter, including `host`, `port`, `without_type_suffix`, and `without_units`.
- The post mixed short Collector internal metric names with Prometheus `_total`-suffixed names. Updated the PromQL examples to use the short names emitted by the configured Prometheus internal telemetry exporter.
- The processor metric examples used `otelcol_processor_incoming_log_records`, `otelcol_processor_outgoing_log_records`, and `otelcol_processor_dropped_log_records`, which are not the current documented generic processor helper metrics. Replaced them with `otelcol_processor_incoming_items` and `otelcol_processor_outgoing_items`, and clarified how to interpret processor deltas.
- The exporter section implied that send failures and queue pressure directly mean log loss. Updated the wording to reflect the documented behavior: send failures may be retried, queue pressure increases risk, and `otelcol_exporter_enqueue_failed_log_records` is the direct signal that logs failed to enter the sending queue.
- The receiver refusal explanation stated that logs were necessarily being dropped at intake. Updated it to say records could not be accepted into the pipeline and that upstream loss depends on receiver/client retry behavior.
- The canary `filelog` snippet said it generated canary logs. Updated the comment because the `filelog` receiver reads logs; the external cron job generates them.
- The end-to-end loss explanation blamed network issues after the exporter reported success. Updated the wording to focus on backend ingestion, indexing, or routing issues, which better matches what can happen after successful export.

## Review Notes
- Local checks: complete YAML snippets parsed successfully with PyYAML, the Bash canary command passed `bash -n`, and `validation.json` parsed successfully with `jq`. The alert snippets after the first rule are partial YAML fragments by design, so they were reviewed by documentation and syntax inspection rather than parsed as standalone YAML documents.
- `promtool` is not installed in this workspace, so Prometheus rule validation was performed against the official Prometheus documentation and static inspection.
