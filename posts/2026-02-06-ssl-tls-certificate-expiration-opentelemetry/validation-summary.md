# Validation Summary: How to Monitor SSL/TLS Certificate Expiration Across Services with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib `http_check` receiver
- OpenTelemetry Python metrics API and OTLP metric exporter
- Python `ssl` and `socket` modules
- Prometheus alerting rules
- OpenTelemetry Collector Prometheus receiver
- cert-manager Prometheus metrics
- Kubernetes service discovery and Prometheus relabeling

## Sources Consulted
- OpenTelemetry Collector Contrib HTTP Check Receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/httpcheckreceiver
- OpenTelemetry Collector Contrib Prometheus Receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/prometheusreceiver
- OpenTelemetry Python metrics instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- Python `ssl` module documentation: https://docs.python.org/3/library/ssl.html
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- cert-manager Prometheus metrics documentation: https://cert-manager.io/docs/devops-tips/prometheus-metrics/

## Issues Found
- The post used the deprecated Collector receiver type `httpcheck` and did not enable the TLS certificate expiration metric. Updated the configuration to use `http_check/certs` and enable `httpcheck.tls.cert_remaining`, because current OpenTelemetry Collector Contrib documentation says TLS certificate metrics are disabled by default and the `httpcheck` component name is deprecated.
- The introductory explanation claimed certificate metadata required custom processing with `httpcheck`. Updated it to describe the built-in TLS certificate remaining metric accurately.
- The Python example parsed certificate `notAfter` values with `datetime.strptime`. Replaced that with `ssl.cert_time_to_seconds()` plus `datetime.fromtimestamp()`, which is the Python stdlib helper for certificate time strings.
- The Python example reported `server.port` as a string. Changed it to an integer to match OpenTelemetry attribute value conventions and avoid unnecessary type mismatch.
- The cert-manager Prometheus receiver example referenced `[batch]` in the service pipeline but did not define the `batch` processor. Added the missing processor block.
- The cert-manager relabeling example built `__address__` from the metrics port annotation, which would produce an invalid address for common cert-manager pods, and it used `${1}` without escaping `$` in an OpenTelemetry Collector config. Updated it to build `__address__` from `__meta_kubernetes_pod_ip` with `9402` and escaped the replacement as `$${1}:9402`, as required by the Collector Prometheus receiver documentation.
- The cert-manager pod label selector used `__meta_kubernetes_pod_label_app`; updated it to `__meta_kubernetes_pod_label_app_kubernetes_io_name`, matching cert-manager's documented labels.

## Review Notes
The post is technically valid after the fixes. The `http_check` receiver is currently marked alpha in OpenTelemetry Collector Contrib, so production users should pin and test their Collector version before relying on the exact metric set.
