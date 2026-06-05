# Validation Summary: How to Build a Telemetry Onboarding Workflow That Auto-Instruments New Services

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Python instrumentation
- OpenTelemetry JavaScript/Node.js instrumentation
- OpenTelemetry Collector
- OpenTelemetry Collector attributes processor
- OpenTelemetry Collector tail sampling processor
- OpenTelemetry Kubernetes Operator
- Kubernetes Deployments
- Prometheus and PromQL
- Python
- Flask
- Node.js
- Express

## Sources Consulted
- OpenTelemetry Python Flask instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/flask/flask.html
- OpenTelemetry Python Requests instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/requests/requests.html
- OpenTelemetry JavaScript Node SDK documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-node.html
- OpenTelemetry Collector attributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/attributesprocessor
- OpenTelemetry Collector tail sampling processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/tailsamplingprocessor
- OpenTelemetry Kubernetes Operator auto-instrumentation documentation: https://opentelemetry.io/docs/platforms/kubernetes/operator/automatic/
- OpenTelemetry HTTP metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry SDK environment variable configuration: https://opentelemetry.io/docs/languages/sdk-configuration/general/
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- Prometheus OpenTelemetry guide: https://prometheus.io/docs/guides/opentelemetry/
- Prometheus histogram_quantile documentation: https://prometheus.io/docs/prometheus/3.4/querying/functions/

## Issues Found
- The service registration snippet used `generate_telemetry_config` and `register_collector_pipeline` without importing them. Added imports so the snippet is internally consistent.
- The Node.js language value was shown as `node`, but the OpenTelemetry Operator annotation suffix is `nodejs`. Updated the metadata comment and template key to use `nodejs`.
- The Collector section claimed to use the routing processor, but the YAML showed attributes and tail sampling processors rather than routing processor configuration. Updated the text to describe attributes and tail sampling processors accurately.
- The tail sampling comment said critical services get lower sampling thresholds, while the configuration retained errors, slow traces, and a higher baseline sample. Reworded the comment to match the policy behavior.
- The dashboard provisioner snippet used `requests.post` without importing `requests`. Added the missing import.
- The PromQL dashboard examples used non-current or ambiguous OpenTelemetry/Prometheus labels. Updated the service filter to `job`, the HTTP status label to `http_response_status_code`, and kept the OpenTelemetry HTTP server duration metric name in Prometheus's default underscore-and-suffix form.
- The p99 latency query did not aggregate classic histogram buckets with the required `le` label. Updated it to use `histogram_quantile(0.99, sum by (le) (rate(..._bucket[5m])))`.
- The Kubernetes section said the Operator injects an instrumentation sidecar automatically. Updated it to explain that most language auto-instrumentation uses an init container, while Go uses a sidecar and requires the target executable path.
- The Kubernetes annotation used `inject-{{ language }}`, which can be wrong for services whose platform language name differs from the Operator suffix. Updated it to `inject-{{ otel_language }}` and documented expected suffix values.
- The Kubernetes example did not mention Go's required target executable annotation. Added `instrumentation.opentelemetry.io/otel-go-auto-target-exe` with a comment that it is required for Go.

## Review Notes
The examples remain platform-scaffold snippets rather than complete runnable applications. The internal wrapper APIs, dashboard backend schema, and service catalog endpoints are intentionally platform-specific, so they were checked for consistency rather than against a public API contract.
