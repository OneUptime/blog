# Validation Summary: How to Use Tenant-Aware Observability in a Multi-Team Platform

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Python SDK and propagation APIs
- W3C Trace Context
- W3C Baggage
- OpenTelemetry Collector
- OpenTelemetry Collector routing connector
- OpenTelemetry Collector attributes processor
- Kubernetes environment configuration
- Python Flask and Requests

## Sources Consulted
- OpenTelemetry Python propagation documentation: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry Python baggage API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/baggage.html
- OpenTelemetry resource documentation: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry Collector processor documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector connector documentation: https://opentelemetry.io/docs/collector/components/connector/
- OpenTelemetry Collector routing connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/routingconnector/README.md
- OpenTelemetry Collector routing processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/routingprocessor/README.md
- OpenTelemetry Collector attributes processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md

## Issues Found
- The Python propagation example configured a global propagator but then called `requests.get()` without injecting or passing propagation headers. Updated the example to explicitly inject W3C Trace Context and W3C Baggage headers and pass them to `requests.get()`.
- The Python propagation example used B3 propagation while the text later required W3C Trace Context. Updated the example to use `TraceContextTextMapPropagator` alongside `W3CBaggagePropagator`.
- The shared-service example read baggage from the current context without showing request extraction. Updated it to extract trace context and baggage from incoming request headers before reading `team.name`.
- The Collector routing example used routing-processor style placement under `processors`, but current OpenTelemetry Collector documentation marks the routing processor as deprecated in favor of the routing connector. Updated the YAML to define `connectors.routing` and wire it as an exporter from an input pipeline and as the receiver for routed pipelines.
- The Collector routing example mixed routing connector fields such as `pipelines` and `default_pipelines` into the deprecated routing processor configuration. Updated the routing table to use routing connector OTTL conditions against resource attributes.

## Review Notes
The post intentionally uses custom attributes such as `team.name`, `tenant.id`, and `storage.partition`; these are not OpenTelemetry semantic convention attributes, but custom resource or telemetry attributes are supported. In a production deployment, avoid putting sensitive or untrusted tenant data in baggage because baggage propagates across service boundaries.
