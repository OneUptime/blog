# Validation Summary: Use Data Residency Controls Using OpenTelemetry Collector Routing by Region

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib routing connector
- OpenTelemetry Collector transform processor
- OpenTelemetry resource attributes and semantic conventions
- OpenTelemetry Python SDK and OTLP gRPC exporter
- Kubernetes Deployment
- Kubernetes NetworkPolicy
- Data residency and regional telemetry routing

## Sources Consulted
- OpenTelemetry Collector routing connector documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/routingconnector/README.md
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector connector concepts: https://opentelemetry.io/docs/collector/building/connector/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Python exporter documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry resource documentation: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry deployment semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/

## Issues Found
- The routing connector example used `statement: route() where ...` and mixed trace, log, and metric destination pipelines in a single connector. Updated it to current `context` / `condition` syntax and split it into `routing/traces`, `routing/logs`, and `routing/metrics` so each signal routes to same-signal pipelines.
- The configuration described forwarding anonymized global telemetry but did not wire any global pipelines to `transform/anonymize` or `otlp/global`. Added global trace, log, and metric pipelines and copied data to them before regional routing.
- The transform processor example used older context-specific paths such as `attributes` inside grouped statements. Updated it to current explicit OTTL paths like `span.attributes`, `log.attributes`, and `datapoint.attributes`, and added `error_mode: ignore` plus `IsString(...)` guards for URL path replacement.
- The resource attribute example used deprecated `deployment.environment`. Updated it to `deployment.environment.name`.
- The Python test script referenced `BatchSpanProcessor` and `datetime` without imports. Added the missing imports and switched from `datetime.utcnow()` to a timezone-aware UTC timestamp.
- The Python OTLP gRPC exporter endpoint lacked a scheme. Updated it to `http://otel-collector.observability:4317`, matching the official Python exporter examples.
- The cross-region trace explanation said the configuration routes "per-span, not per-trace" too broadly. Tightened the wording to say the trace routing connector evaluates span data against routes instead of requiring whole traces to stay together.

## Review Notes
- YAML snippets were parsed successfully with PyYAML, and the Python snippet passed AST compilation. The local environment does not have the OpenTelemetry Python packages installed, so the exporter sample was not executed end to end.
- The global pipeline now anonymizes and forwards telemetry. It does not perform metric aggregation inside the Collector, so the article wording was adjusted from "anonymized aggregation" to "anonymized forwarding."
