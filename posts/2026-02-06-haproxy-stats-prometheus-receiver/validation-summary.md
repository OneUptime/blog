# Validation Summary: How to Collect HAProxy Stats Socket Metrics via the Collector Prometheus

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- HAProxy built-in Prometheus exporter
- HAProxy Runtime API / stats socket
- OpenTelemetry Collector Prometheus receiver
- OpenTelemetry Collector metrics transform, resource, and batch processors
- Prometheus scrape configuration and alerting rules
- Docker Compose
- Python Unix socket scripting
- `curl` and `socat`

## Sources Consulted
- HAProxy Prometheus metrics documentation: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/alerts-and-monitoring/prometheus/
- HAProxy Runtime API `show stat` documentation: https://www.haproxy.com/documentation/haproxy-runtime-api/reference/show-stat/
- OpenTelemetry Collector Prometheus receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/prometheusreceiver/README.md
- OpenTelemetry Collector metrics transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/metricstransformprocessor/README.md
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Docker Compose version/name element documentation: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- Corrected HAProxy backend and server response-time metric names from `haproxy_*_response_time_average` to the documented `haproxy_*_response_time_average_seconds`.
- Corrected the description and alert usage of `haproxy_server_status`. HAProxy exports one status series per `state` label, with the active state set to `1`; it is not a simple `1=UP, 0=DOWN` metric.
- Updated the response-time alert threshold to use seconds (`> 5`) with `haproxy_backend_response_time_average_seconds`.
- Replaced generic alert fields (`condition`, top-level `severity`, and `message`) with Prometheus alert rule fields (`expr`, `labels`, and `annotations`).
- Updated the Collector processor ID from `metricstransform` to the current documented `metrics_transform` ID and updated the pipeline reference.
- Removed the obsolete top-level Docker Compose `version: "3.8"` field.
- Corrected HAProxy backend server ports from `backend1:8080` and `backend2:8080` to `backend1:80` and `backend2:80`, matching the default port exposed by the `nginx:latest` containers in the Compose example.
- Replaced the stats socket enablement command that appended `stats socket` to the end of `haproxy.cfg`; `stats socket` belongs in the `global` section.
- Updated the `socat` Runtime API examples to the documented `socat stdio /path/to/socket` form.

## Review Notes
- The corrected Collector configuration was validated with `otelcol-contrib` v0.153.0 using `otelcol-contrib validate`.
- A representative HAProxy configuration was validated with `haproxy:latest`, which reported HAProxy 3.4.0 with Prometheus exporter support enabled.
- A live HAProxy Prometheus endpoint was queried locally to confirm the exported metric names and the `state` label model for status metrics.
- README YAML and Python blocks were parsed locally with `python3`.
