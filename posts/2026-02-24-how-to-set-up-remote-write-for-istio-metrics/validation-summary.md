# Validation Summary: How to Set Up Remote Write for Istio Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio metrics
- Prometheus remote write
- Prometheus Operator
- Prometheus Agent mode
- Grafana Mimir
- Kubernetes Secrets
- PromQL alerting

## Sources Consulted
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus remote write tuning: https://prometheus.io/docs/practices/remote_write/
- Prometheus Agent mode: https://prometheus.io/docs/prometheus/latest/prometheus_agent/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Grafana Mimir HTTP API reference: https://grafana.com/docs/mimir/latest/references/http-api/

## Issues Found
- The targeted Istio histogram filter kept only `_bucket` series for `istio_request_duration_milliseconds`, `istio_request_bytes`, and `istio_response_bytes`. Updated the regex to keep `_bucket`, `_sum`, and `_count` so the remote backend receives complete classic histogram data.
- The remote write health example used `prometheus_remote_storage_pending_samples`, which is not the current Prometheus metric name. Changed it to `prometheus_remote_storage_samples_pending`.
- The Prometheus Operator Agent mode example used `kind: Prometheus` with `spec.mode: Agent`. The Operator exposes agent mode through the `PrometheusAgent` CRD, so the example now uses `apiVersion: monitoring.coreos.com/v1alpha1` and `kind: PrometheusAgent`.

## Review Notes
- The remote write, relabeling, queue, authentication, TLS, external labels, Mimir write/query endpoints, and Istio metric names were otherwise consistent with the official documentation checked.
- The Prometheus `retry_on_http_429` queue option is currently documented as experimental, so users should confirm backend behavior before relying on it operationally.
