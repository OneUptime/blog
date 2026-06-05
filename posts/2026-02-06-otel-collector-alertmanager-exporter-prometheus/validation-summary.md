# Validation Summary: How to Configure OpenTelemetry Collector Alertmanager Exporter for

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Builder
- OpenTelemetry Collector alertmanager exporter
- OpenTelemetry filter, transform, batch, OTLP receiver, and OTLP exporter components
- Prometheus Alertmanager
- PromQL
- Python OpenTelemetry logs API and SDK

## Sources Consulted
- OpenTelemetry Collector contrib alertmanager exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/alertmanagerexporter/README.md
- OpenTelemetry Collector contrib alertmanager exporter source and config schema: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/alertmanagerexporter
- OpenTelemetry Collector contrib alertmanager exporter metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/alertmanagerexporter/metadata.yaml
- OpenTelemetry Collector releases `otelcol-contrib` manifest: https://github.com/open-telemetry/opentelemetry-collector-releases/blob/main/distributions/otelcol-contrib/manifest.yaml
- OpenTelemetry Collector Builder documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/cmd/builder/README.md
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Python logs API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/_logs.html
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus Alertmanager client API documentation: https://prometheus.io/docs/alerting/latest/clients/

## Issues Found
- The post said the alertmanager exporter is available in the standard `otelcol-contrib` distribution. Upstream metadata and the release manifest do not list it in that binary, so I changed the instructions to require a custom Collector.
- The builder manifest used old `v0.96.0` modules and omitted the transform processor used later in the configuration. I updated the manifest to current `v0.153.0` module versions and added `transformprocessor`.
- The exporter configuration used the nonexistent `default_severity` key. I replaced it with the supported `severity` key and added `severity_attribute` and `event_labels` where the examples rely on them.
- The post described arbitrary log attributes as Alertmanager labels. The exporter adds log attributes as annotations and only promotes selected `event_labels` plus `event_name` and `severity` to labels. I corrected the explanation and examples.
- The filter processor example used `severity_number >= 17`, which would drop error logs because the filter processor drops records matching its condition. I changed it to drop records below `SEVERITY_NUMBER_ERROR`.
- The transform processor example created `alertname` and `description` attributes that the exporter does not treat specially. I changed the example to set `service` for promotion via `event_labels`.
- The Python example used standard `logging.Logger.error()` without configuring an OpenTelemetry logging handler, so the shown `extra` fields would not reliably become OpenTelemetry log attributes. I replaced it with direct OpenTelemetry log emission using `logger.emit()`.
- The Alertmanager routing example used deprecated `match`/`match_re` fields and routed on `alertname`, but the exporter emits `event_name`. I changed routes to `matchers`, grouped by `event_name`, and updated Slack templates to use `event_name` and the `Body` annotation.
- The limitations section claimed alert resolution depends on a corresponding resolved log record. The exporter does not set `endsAt`, so I corrected this to Alertmanager resolving alerts after `resolve_timeout` if they are not refreshed.

## Review Notes
- The alertmanager exporter is marked development-stability upstream. That is technically valid to use, but readers should treat its configuration and behavior as more change-prone than stable Collector components.
- Local `amtool`, `promtool`, Go, and the Collector Builder were not installed in the review environment, so command execution and Alertmanager config validation were checked against official documentation and source rather than by running the binaries locally.
