# Validation Summary: How to Send Dapr Traces to Splunk Observability

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- Dapr (distributed application runtime)
- Splunk Observability Cloud (APM)
- OpenTelemetry Collector
- SAPM exporter
- OTLP/HTTP exporter
- Kubernetes (k8sattributes processor, resource detection)

## Sources Consulted
- Dapr Configuration spec reference: https://docs.dapr.io/reference/resource-specs/configuration-schema/
- Dapr OpenTelemetry Collector tracing setup: https://docs.dapr.io/operations/observability/tracing/otel-collector/open-telemetry-collector/
- Dapr annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- OpenTelemetry Collector SAPM exporter (v0.115.0): https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.115.0/exporter/sapmexporter/README.md
- OpenTelemetry Collector resourcedetection processor: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourcedetectionprocessor/README.md
- OpenTelemetry Collector k8sattributes processor: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/k8sattributesprocessor/README.md
- Splunk Observability Cloud ingest API: https://dev.splunk.com/observability/reference/api/ingest_data/latest
- Splunk Observability Cloud trace API: https://dev.splunk.com/observability/reference/api/trace_id/latest

## Issues Found

1. **Description mentioned "Splunk HEC"**: The post description referenced "Splunk HEC or OTLP SAPM exporter" but the post uses the SAPM protocol, not HEC (HTTP Event Collector). Fixed to "SAPM or OTLP/HTTP exporter".

2. **Invalid `resourcedetection` detector name**: The `resourcedetection` processor listed `[k8snode, k8sattributes]` as detectors. `k8sattributes` is a separate processor, not a valid detector for `resourcedetection`. Valid Kubernetes-related detectors include `env`, `k8snode`, `eks`, `aks`, etc. Changed to `[env, k8snode]`.

3. **Incorrect Dapr annotation `dapr.io/sidecar-env-vars`**: This annotation does not exist in Dapr. The correct annotation for setting environment variables on the Dapr sidecar is `dapr.io/env`. Fixed accordingly.

4. **Fabricated Splunk trace verification API endpoint**: The curl command used `GET /v2/trace?service=order-service&limit=5`, which is not a real Splunk Observability API endpoint. The actual trace retrieval API requires a specific trace ID and uses endpoints like `GET /v2/apm/trace/{traceId}/latest`. Fixed to use the correct API path.

## Review Notes
- The SAPM exporter has been deprecated in recent versions of the OpenTelemetry Collector contrib repository. The recommended migration path is to use the OTLP/HTTP exporter with the `X-SF-Token` header. The post already covers OTLP/HTTP as an alternative, which is good.
- The `signalfx.com` domain used in endpoint URLs is the legacy domain; Splunk has been migrating to `observability.splunkcloud.com`. Both may still work, but future readers should be aware the domain may change.
- The `dapr.io/env` annotation may have issues parsing `OTEL_RESOURCE_ATTRIBUTES` values containing `=` signs, since `=` is used as the key-value delimiter in the annotation format. This is a known Dapr issue (dapr/dapr#7202).
