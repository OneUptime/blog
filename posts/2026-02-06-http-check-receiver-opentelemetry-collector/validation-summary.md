# Validation Summary: How to Configure the HTTP Check Receiver in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib HTTP Check receiver
- OpenTelemetry Collector receiver, processor, exporter, and service pipeline configuration
- OTLP HTTP exporter
- Collector internal telemetry configuration
- HTTP synthetic monitoring and TLS certificate monitoring
- YAML
- curl

## Sources Consulted
- OpenTelemetry Collector Contrib HTTP Check receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/httpcheckreceiver/README.md
- OpenTelemetry Collector Contrib HTTP Check receiver generated metric documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/httpcheckreceiver/documentation.md
- OpenTelemetry Collector Contrib HTTP Check receiver metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/httpcheckreceiver/metadata.yaml
- OpenTelemetry Collector HTTP client configuration documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/confighttp/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector processor registry and metrics transform examples: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- Prometheus UTF-8 metric and label name query syntax: https://prometheus.io/docs/guides/utf8/

## Issues Found
- The post used `httpcheck` as the primary receiver type. The current receiver type is `http_check`; `httpcheck` is a deprecated alias. Updated receiver IDs and pipeline references to `http_check`, including named instances such as `http_check/internal`.
- Several snippets used unsupported target fields: `expected_status_code` and `expected_body_pattern`. The current receiver supports response validation through `validations` entries such as `contains`, `json_path` plus `equals`, size checks, and `regex`. Replaced the unsupported fields with documented validation syntax or removed them where the status-class metric should be used for alerting instead.
- The generated metrics section listed non-existent or incorrectly named metrics, including `httpcheck.success`, `httpcheck.response_size`, and `httpcheck.tls_cert_expiry`. Replaced them with documented metrics: `httpcheck.duration`, `httpcheck.status`, `httpcheck.error`, optional `httpcheck.response.size`, and optional `httpcheck.tls.cert_remaining`.
- The post described `httpcheck.status` as a gauge containing the HTTP status code. The receiver documents it as a cumulative sum whose value is 1 when the returned status code matches the `http.status_class` attribute and 0 otherwise. Updated the description, example output, and alert examples.
- The post described TLS certificate expiry in days. The documented `httpcheck.tls.cert_remaining` metric is emitted in seconds and is disabled by default. Updated metric descriptions, examples, and the 30-day alert threshold to `2592000` seconds.
- The post listed labels such as `endpoint`, `method`, and `status_code`. The receiver metadata documents attributes such as `http.url`, `http.method`, `http.status_code`, and `http.status_class`. Updated the metric-label section and examples.
- Optional response size, TLS certificate, and validation metrics were shown as if they were always emitted. Added `metrics` configuration enabling the optional metrics in examples that rely on them.
- The production snippet used the deprecated `service.telemetry.metrics.address` setting. Current Collector documentation says `service::telemetry::metrics::address` is ignored as of v0.123.0. Replaced it with `service.telemetry.metrics.readers` using a Prometheus pull exporter.
- The synthetic user journey section implied the receiver chains requests. The HTTP Check receiver runs configured targets independently. Updated the wording to clarify that it monitors workflow endpoints but does not provide shared session state or strict step-by-step execution.
- The alert examples used unquoted dotted metric and label names in PromQL-style expressions and Go template label access. Updated them to the Prometheus UTF-8 selector form and `index $labels "http.url"` template access for dotted label names.

## Review Notes
The local environment does not have `otelcol`, `otelcol-contrib`, or `otelcol-k8s` installed, so Collector `--dry-run` validation could not be executed. All YAML code blocks in the post were parsed successfully with PyYAML after the edits.
