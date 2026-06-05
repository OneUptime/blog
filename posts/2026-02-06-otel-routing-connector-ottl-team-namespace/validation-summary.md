# Validation Summary: How to Use the Routing Connector with OTTL to Route Telemetry by Team,

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector routing connector
- OpenTelemetry Transformation Language (OTTL)
- Kubernetes attributes processor
- OTLP exporters
- YAML Collector configuration

## Sources Consulted
- OpenTelemetry Collector routing connector README and package docs: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/connector/routingconnector
- OpenTelemetry Collector configuration docs: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector connectors docs: https://opentelemetry.io/docs/collector/components/connector/
- OpenTelemetry OTTL functions docs: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/ottlfuncs
- OpenTelemetry deployment semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- OpenTelemetry Kubernetes Collector components docs: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/

## Issues Found
- The routing connector examples used `resource.attributes["..."]` while relying on the connector's default `resource` OTTL context. In that context, resource attributes are accessed as `attributes["..."]`. Updated the routing statements to use `attributes["team"]`, `attributes["k8s.namespace.name"]`, and related resource attribute paths.
- The environment examples used the deprecated `deployment.environment` resource attribute. Updated the text and snippets to use the current semantic convention, `deployment.environment.name`.
- The Collector environment variable reference used bare `${ONEUPTIME_TOKEN}` syntax. Updated it to the current documented `${env:ONEUPTIME_TOKEN}` syntax.
- The routing-order explanation said "the first matching rule wins" without noting the current `action` behavior. Updated it to explain that this is true for the default `move` action, while keeping the author's guidance to put specific rules first.
- The notes said OTTL is evaluated "per span" only. Updated this to say expressions are evaluated against the configured OTTL context for each routed record, which is accurate for traces, metrics, and logs.

## Review Notes
The routing connector supports traces-to-traces, metrics-to-metrics, and logs-to-logs pipelines and currently has alpha stability. The post's examples use `statement: route() where ...`, which is still supported, though the current routing connector docs also show `condition:` examples for many cases.
