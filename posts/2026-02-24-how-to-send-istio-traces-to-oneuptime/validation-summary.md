# Validation Summary: How to Send Istio Traces to OneUptime

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio distributed tracing
- Istio Telemetry API
- OpenTelemetry Collector
- OTLP over gRPC and HTTP
- OneUptime telemetry ingestion
- Kubernetes Deployments, Services, ConfigMaps, and Secrets
- Python Flask and requests
- Go net/http

## Sources Consulted
- Istio OpenTelemetry tracing task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/opentelemetry/
- Istio trace sampling task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/sampling/
- Istio distributed tracing overview: https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio MeshConfig / extension provider reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/en/telemetry/open-telemetry
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- W3C Trace Context recommendation: https://www.w3.org/TR/trace-context/
- OpenZipkin B3 propagation specification: https://github.com/openzipkin/b3-propagation

## Issues Found
- The post described Istio tracing integrations as "protocols" and listed OpenCensus as a main supported option. Updated the wording to "providers" and aligned the list with current Istio tracing providers: OpenTelemetry, Zipkin, Apache SkyWalking, Datadog, and Stackdriver.
- The Istio `resource_detectors` example used a list value. Updated it to the map shape shown in Istio's current tracing examples: `environment: {}`.
- The OpenTelemetry Collector exporter used `otlp/oneuptime` with `https://otlp.oneuptime.com`, which does not match OneUptime's current documented collector example. Updated it to `otlphttp/oneuptime`, endpoint `https://oneuptime.com/otlp`, JSON encoding, `Content-Type: application/json`, and the `x-oneuptime-token` header.
- The collector environment-variable reference used the older `${ONEUPTIME_TOKEN}` style. Updated it to the current Collector configuration-provider syntax, `${env:ONEUPTIME_TOKEN}`.
- The collector processor order batched before adding the resource attribute. Updated the pipeline to run `memory_limiter`, then `resource`, then `batch`.
- The Go example assigned `resp` and `err` without using them, which would not compile as written. Added basic error handling and `defer resp.Body.Close()` while preserving the example's intent.

## Review Notes
- `kubectl` and `istioctl` were not installed in the local workspace, so CLI syntax was checked against official documentation instead of local `--help` output.
- The collector image uses `latest`; this is valid for an example, but production deployments should pin a tested Collector version.
