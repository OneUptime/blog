# Validation Summary: How to Correlate Kubernetes Network Policy Violations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Cilium Hubble
- OpenTelemetry Collector
- OpenTelemetry Python SDK
- OpenTelemetry semantic conventions
- SQL-style trace/log correlation queries

## Sources Consulted
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Cilium Hubble exporter documentation: https://docs.cilium.io/en/stable/observability/hubble/configuration/export/
- OpenTelemetry Collector filelog receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Collector filter processor documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/filterprocessor
- OpenTelemetry Collector transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Python Resource documentation: https://opentelemetry-python.readthedocs.io/en/stable/sdk/resources.html
- OpenTelemetry Python SpanContext/API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.span.html
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry Kubernetes resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/k8s/

## Issues Found
- The post described a Cilium Hubble API/receiver flow, but the Collector example used the filelog receiver. Updated the wording to describe Cilium Hubble exporter logs and changed the collector comment accordingly.
- The filelog receiver watched `/var/log/cilium/hubble/*.log`, which does not match Cilium's documented default Hubble exporter path. Updated it to `/var/run/cilium/hubble/events*.log`.
- The Collector filter expected `verdict` as a top-level attribute, but Cilium Hubble exporter JSON stores flow details under `flow`. Updated the filter to use OTTL against `attributes["flow"]["verdict"]` and `attributes["flow"]["drop_reason_desc"]`.
- The transform processor extracted source, destination, and port fields from incorrect top-level paths. Updated the paths to match Hubble exporter JSON, including `flow.source`, `flow.destination`, and `flow.l4.TCP.destination_port`.
- The Python resource example created a Resource but did not attach it to a TracerProvider, so the pod metadata would not be added to spans. Added `TracerProvider(resource=resource)` and registered it with `trace.set_tracer_provider`.
- The HTTP client span used older HTTP semantic convention attributes. Updated `http.url` to `url.full` and `http.status_code` to `http.response.status_code`.
- The error handling examples only set custom attributes and did not mark the span status or record exceptions through the OpenTelemetry API. Added `span.record_exception(...)` and `span.set_status(Status(StatusCode.ERROR, ...))`.
- The automated annotation example constructed an invalid/unused `SpanContext` with `span_id=0` and implied the OpenTelemetry API could annotate already exported traces. Replaced that block with a backend-API note, which matches OpenTelemetry's span lifecycle model.

## Review Notes
- The SQL query is intentionally backend-specific pseudocode. Different observability backends use different table names, map access syntax, and status fields, so readers may need to adapt it.
- The example still assumes TCP drops for the extracted destination port. UDP or ICMP drops may require additional transform statements for their Hubble `l4` shape.
