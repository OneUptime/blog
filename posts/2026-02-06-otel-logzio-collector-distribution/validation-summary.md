# Validation Summary: How to Send OpenTelemetry Traces and Metrics to Logz.io with the Logz.io

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- Logz.io OpenTelemetry Collector distribution
- Logz.io Helm charts
- Kubernetes
- Helm
- Python OpenTelemetry SDK
- OTLP/gRPC exporters
- Docker Compose

## Sources Consulted
- Logz.io Kubernetes documentation: https://docs.logz.io/docs/shipping/containers/kubernetes/
- Logz.io Helm chart repository and `logzio-monitoring` chart README: https://github.com/logzio/logzio-helm/tree/master/charts/logzio-monitoring
- Logz.io `logzio-monitoring` chart values: https://github.com/logzio/logzio-helm/blob/master/charts/logzio-monitoring/values.yaml
- Logz.io `logzio-apm-collector` chart values and configuration reference: https://github.com/logzio/logzio-helm/tree/master/charts/logzio-apm-collector
- Logz.io `logzio-telemetry` chart values: https://github.com/logzio/logzio-helm/tree/master/charts/logzio-telemetry
- Logz.io OpenTelemetry Collector distro README and Docker Compose example: https://github.com/logzio/otel-collector-distro
- Logz.io OpenTelemetry Collector distro default configuration: https://github.com/logzio/otel-collector-distro/blob/master/otel-config/default.yml
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/

## Issues Found
- The post used a `logzio-otel-collector` Helm chart name and `secrets.*` values that are not present in the current Logz.io Helm repository. I updated the install command to use the official `logzio-monitoring` chart and current `global.*`, `logs.enabled`, `logzio-k8s-telemetry.metrics.enabled`, and `logzio-apm-collector.enabled` values.
- The custom values example used a parent-level `config` shape with pipelines that omitted required exporters and did not match the Logz.io chart value structure. I replaced it with a valid `logzio-monitoring` values file using the chart-supported keys for logs, metrics, application metrics, Kubernetes object logs, and traces.
- The Python OTLP endpoints pointed to `logzio-otel-collector.default.svc.cluster.local`, which does not match the corrected Helm deployment. I updated the trace endpoint to `logzio-apm-collector.monitoring.svc.cluster.local:4317` and the metrics endpoint to `logzio-monitoring-otel-collector.monitoring.svc.cluster.local:4317`.
- The standalone Docker Compose example used environment variables that do not match the published Logz.io Collector distro Docker quickstart. I updated it to the official tracing quickstart variables, `TRACING_TOKEN` and `LOGZIO_REGION`, and the published ports.
- The verification commands used an obsolete selector and service name. I updated them to target the `monitoring` namespace, the `logzio-monitoring` release label, and the `logzio-monitoring-otel-collector` metrics service.

## Review Notes
The Python OpenTelemetry snippets use current `OTLPSpanExporter`, `OTLPMetricExporter`, `BatchSpanProcessor`, `PeriodicExportingMetricReader`, `TracerProvider`, and `MeterProvider` APIs. The snippets parse as Python, but they are illustrative and depend on application-specific objects/functions such as `cart`, `validate_payment`, and `reserve_inventory`.
