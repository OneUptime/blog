# Validation Summary: How to use OpenTelemetry with Jaeger backend for distributed tracing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Python SDK
- OpenTelemetry Protocol (OTLP)
- OpenTelemetry Collector
- Jaeger
- Docker
- Kubernetes

## Sources Consulted
- Jaeger Getting Started documentation: https://www.jaegertracing.io/docs/latest/getting-started/
- Jaeger Storage Backends documentation: https://www.jaegertracing.io/docs/2.16/storage/
- Jaeger Frontend/UI Configuration documentation: https://www.jaegertracing.io/docs/2.0/frontend-ui/
- OpenTelemetry Python OTLP exporters documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector OTLP exporter documentation: https://pkg.go.dev/go.opentelemetry.io/collector/exporter/otlpexporter
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/

## Issues Found
- The Docker command used `jaegertracing/all-in-one:latest` with `COLLECTOR_OTLP_ENABLED=true`. Current Jaeger 2.x documentation uses the unified `cr.jaegertracing.io/jaegertracing/jaeger:2.19.0` image for the all-in-one setup with OTLP ports exposed. Updated the image and removed the legacy environment variable.
- The Kubernetes deployment used the older all-in-one image and OTLP enablement environment variable. Updated it to the current Jaeger 2.19 image and removed the legacy environment variable.
- The Kubernetes section said it deployed Jaeger and the collector, but the manifest only deploys Jaeger. Updated the wording to say it deploys Jaeger in Kubernetes.
- The Jaeger UI search examples used SQL-like `AND` expressions that are not the UI's normal search-field format. Rewrote the examples as service, tag, min duration, and trace ID fields.
- The production storage recommendation only listed Elasticsearch and Cassandra. Jaeger's storage documentation lists OpenSearch as a primary backend and recommends OpenSearch over Cassandra for large-scale production deployments, so OpenSearch was added.

## Review Notes
The Python OTLP exporter example and OpenTelemetry Collector pipeline configuration are consistent with current OpenTelemetry documentation. The Collector exporter uses `tls.insecure: true`, which is valid for local or private-network examples but should not be used for production traffic without evaluating transport security requirements.
