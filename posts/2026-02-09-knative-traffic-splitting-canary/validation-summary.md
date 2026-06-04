# Validation Summary: How to Configure Knative Serving Traffic Splitting

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Knative Serving
- Kubernetes
- Kubernetes Custom Resources
- kubectl
- Prometheus and Prometheus Operator
- Bash
- Python
- Node.js / Express

## Sources Consulted
- Knative Serving traffic management documentation: https://knative.dev/docs/serving/traffic-management/
- Knative traffic splitting getting started guide: https://knative.dev/docs/getting-started/first-traffic-split/
- Knative Serving API reference: https://knative.dev/docs/serving/reference/serving-api/
- Knative revisions documentation: https://knative.dev/docs/serving/revisions/
- Knative Serving metrics reference: https://knative.dev/docs/serving/observability/metrics/serving-metrics/
- Knative metrics collection documentation: https://knative.dev/docs/serving/observability/metrics/collecting-metrics/
- Kubernetes kubectl JSONPath reference: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Prometheus Operator ServiceMonitor documentation: https://prometheus-operator.dev/docs/developer/getting-started/
- Prometheus histogram and `histogram_quantile` documentation: https://prometheus.io/docs/practices/histograms/

## Issues Found
- The post stated that every Knative Service update creates a new immutable Revision. Updated this to specify that changes to the Service configuration template create new Revisions, while traffic-only updates do not. This matches the Knative API reference and revisions documentation.
- The A/B testing section implied that Knative Serving traffic rules route specific users based on request headers. Updated the section to describe Knative percentage splitting and application-level routing for sticky header/user assignment, since the Knative Serving Service traffic spec supports revision/configuration targets, percentages, and tags rather than header-match rules.
- The monitoring examples used generic `http_requests_total` and `http_request_duration_seconds_bucket` metrics as if they were built-in Knative metrics. Updated them to `app_...` example metrics and added a caveat that metric names and labels depend on the application and telemetry pipeline. Current Knative Serving metrics are exported through OpenTelemetry and exporter-dependent Prometheus naming.
- The Prometheus latency alert calculated `histogram_quantile` directly over unsummed bucket series. Updated it to aggregate buckets with `sum by (revision, le)` before calculating the quantile, matching Prometheus guidance for histogram quantiles across multiple instances.
- The ServiceMonitor example did not state its assumption that a matching Kubernetes Service exposes a port named `metrics`. Added that caveat, consistent with Prometheus Operator ServiceMonitor behavior.

## Review Notes
- Local checks: all YAML snippets parsed successfully with PyYAML, the Python snippet compiled, all Bash snippets passed `bash -n`, the JavaScript snippet passed `node --check`, and `validation.json` parsed successfully with `jq`.
- Runtime validation against a live Knative cluster was not possible in this workspace because `kubectl` is not installed and no cluster context is available. The review relied on official Knative, Kubernetes, Prometheus, and Prometheus Operator documentation plus static snippet checks.
