# Validation Summary: How to Configure Distributed Tracing in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Helm
- Grafana Tempo
- OpenTelemetry Collector
- OpenTelemetry JavaScript SDK
- OpenTelemetry Python SDK
- FastAPI
- SQLAlchemy

## Sources Consulted
- Grafana Community Helm Charts README: https://github.com/grafana-community/helm-charts
- Grafana Tempo Helm chart: https://github.com/grafana-community/helm-charts/tree/main/charts/tempo
- Grafana Tempo Helm chart values: https://raw.githubusercontent.com/grafana-community/helm-charts/main/charts/tempo/values.yaml
- OpenTelemetry Collector Helm chart README: https://github.com/open-telemetry/opentelemetry-helm-charts/tree/main/charts/opentelemetry-collector
- OpenTelemetry Collector Helm chart values: https://raw.githubusercontent.com/open-telemetry/opentelemetry-helm-charts/main/charts/opentelemetry-collector/values.yaml
- OpenTelemetry SDK for Node.js README: https://github.com/open-telemetry/opentelemetry-js/tree/main/experimental/packages/opentelemetry-sdk-node
- OTLP trace exporter for Node.js (gRPC) README: https://github.com/open-telemetry/opentelemetry-js/tree/main/experimental/packages/exporter-trace-otlp-grpc
- FastAPI instrumentation docs: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/fastapi/fastapi.html
- SQLAlchemy instrumentation docs: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/sqlalchemy/sqlalchemy.html
- OpenTelemetry Python OTLP exporter docs: https://opentelemetry-python.readthedocs.io/en/latest/exporter/otlp/otlp.html
- OpenTelemetry environment variable specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/

## Issues Found
- The Tempo install command used the old `grafana` Helm repo. I updated it to the current `grafana-community` repo based on the chart repository migration guidance.
- The Tempo install command did not create the `observability` namespace. I added `--create-namespace` so the command works on a fresh cluster.
- The OpenTelemetry Collector install command omitted the current chart's required image and command settings. I added `image.repository=ghcr.io/open-telemetry/opentelemetry-collector-releases/opentelemetry-collector-k8s` and `command.name=otelcol-k8s` to match the official chart installation guidance.
- The Node.js example used `http://otel-collector:4317` as its fallback endpoint, which only works when DNS search paths and namespaces line up a certain way. I changed it to `http://otel-collector.observability.svc.cluster.local:4317` to match the fully qualified in-cluster endpoint used elsewhere in the post.
- The Python example called `FastAPIInstrumentor.instrument()` as if it were a class method. I changed it to `FastAPIInstrumentor().instrument()`, which matches the actual instrumentation API.
- The conclusion implied that Tempo itself handled visualization. I clarified the wording to distinguish the trace backend from the UI layer, using Tempo with Grafana as the example pairing.

## Review Notes
- The Collector values file binds OTLP receivers to `0.0.0.0`. This is functional, but the current chart defaults bind to the pod IP for a narrower security posture.
- The post now validates as technically correct for a Rancher-managed Kubernetes environment, but it still assumes Grafana is available if readers want to visualize Tempo traces.
