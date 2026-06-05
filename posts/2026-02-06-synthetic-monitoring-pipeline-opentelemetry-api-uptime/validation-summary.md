# Validation Summary: How to Build a Synthetic Monitoring Pipeline with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector HTTP Check receiver
- OpenTelemetry Collector OTLP receiver/exporter
- OpenTelemetry Collector resource, batch, and filter processors
- OpenTelemetry Python Metrics SDK
- PromQL
- Synthetic monitoring and SLA tracking

## Sources Consulted
- OpenTelemetry Collector HTTP Check receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/httpcheckreceiver/README.md
- OpenTelemetry Collector HTTP Check receiver generated metrics documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/httpcheckreceiver/documentation.md
- OpenTelemetry Collector Filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector processors documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector configuration documentation for environment variable substitution: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- Prometheus PromQL functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus PromQL operators documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/

## Issues Found
- The probe collector used the deprecated `httpcheck` receiver type. Updated it to `http_check`, which is the current receiver name; the old alias is still accepted but logs a deprecation warning.
- The central collector filter processor used outdated/incorrect filter syntax and referenced `name` and `value` as if they were valid current OTTL fields. Updated it to the current `metric_conditions` format and used `metric.name`.
- The central collector comment said the resource processor added timestamps. Resource processor attributes enrich resources; they do not add timestamps. Updated the comment.
- The PromQL uptime examples treated `httpcheck_status` sample values as HTTP status codes. The receiver emits `httpcheck.status` as 0/1 status-class series with `http.status_code` and `http.status_class` attributes. Updated the queries to use `http_status_class` label filters and `sum_over_time`.
- The multi-step Python script was described as a custom receiver, but it is an external synthetic-check process exporting OTLP metrics. Updated the wording.
- The Python example hardcoded a placeholder client secret while the post advises storing credentials outside config. Updated it to read `CLIENT_SECRET` from the environment.

## Review Notes
- The `http_check` receiver is currently marked alpha/development for its metrics in the official documentation, so production users should pin collector versions and test upgrades.
- Prometheus label names may vary by backend/export path; the examples assume the common dot-to-underscore label normalization for `http.url`, `http.status_class`, and `probe.location`.
