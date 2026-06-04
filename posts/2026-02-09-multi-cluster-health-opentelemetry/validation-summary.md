# Validation Summary: How to Monitor Multi-Cluster Health with Centralized OpenTelemetry Pipelines

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Operator for Kubernetes
- Kubernetes
- Prometheus and Prometheus Operator
- Jaeger Operator
- Grafana Loki
- Go OpenTelemetry SDK
- Python OpenTelemetry SDK

## Sources Consulted
- OpenTelemetry Operator for Kubernetes: https://opentelemetry.io/docs/platforms/kubernetes/operator/
- OpenTelemetry Collector configuration: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector exporters: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector internal telemetry: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry sampling concepts: https://opentelemetry.io/docs/concepts/sampling/
- OpenTelemetry tail sampling example: https://opentelemetry.io/docs/demo/sample-configurations/tail-sampling-service-criticality/
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/
- OpenTelemetry HTTP attributes registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/http/
- OpenTelemetry Go OTLP trace gRPC exporter: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
- OpenTelemetry Go semantic conventions package: https://pkg.go.dev/go.opentelemetry.io/otel/semconv/v1.37.0
- OpenTelemetry Python OTLP exporters: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- Grafana Loki OpenTelemetry Collector ingestion: https://grafana.com/docs/loki/latest/send-data/otel/
- Grafana Loki HTTP API: https://grafana.com/docs/loki/latest/api/
- OpenTelemetry Collector Contrib releases: https://github.com/open-telemetry/opentelemetry-collector-contrib/releases
- OpenTelemetry Operator releases: https://github.com/open-telemetry/opentelemetry-operator/releases

## Issues Found
- The operator install command and collector image were pinned to old v0.92.0-era artifacts. Updated the operator command to the current `releases/latest` URL and updated the Collector Contrib image to v0.153.0, the current release at review time.
- The `OpenTelemetryCollector` manifests used `opentelemetry.io/v1alpha1` and `spec.config` as a block string. Updated them to the current `opentelemetry.io/v1beta1` API and structured `spec.config` format shown in the official operator docs.
- Collector environment variable expansion used the older `${VAR}` form. Updated Collector config references to `${env:VAR}` per current Collector configuration docs.
- The agent config used the deprecated `logging` exporter and `loglevel` setting. Replaced it with the current `debug` exporter and `verbosity` setting.
- The gateway config used the removed/deprecated Loki exporter and Loki push API configuration. Replaced it with `otlphttp/loki` targeting Loki's OTLP endpoint.
- The Go example imported unused metric packages and used deprecated HTTP semantic convention helpers. Removed unused imports, updated the semconv package, and changed span attributes to `http.request.method` and `url.full` via documented semconv keys.
- The Go and Python examples referenced placeholder functions that were not defined. Added minimal `fetchUsers` / `fetch_users` functions so the examples are syntactically complete.
- The Python example used the deprecated `http.method` attribute. Updated it to `http.request.method`.
- The dashboard referenced `otel_traces_active_spans`, which is not a standard Collector internal metric. Replaced it with the documented accepted spans counter query.
- The alert used the OTLP-form `otelcol_receiver_refused_spans` metric name in a Prometheus rule. Updated it to the Prometheus counter form `otelcol_receiver_refused_spans_total`.

## Review Notes
The Kubernetes event receiver and host metrics receiver may require additional RBAC, service account, and host mount details in a production deployment. The post remains a concise guide, so those operational details were not expanded beyond correcting the snippets already present.
