# Validation Summary: How to Route OpenTelemetry Data to Different Backends Based on service.name or

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector routing connector
- OpenTelemetry Transformation Language (OTTL)
- Kubernetes attributes processor
- OTLP receiver and exporter configuration
- Kubernetes resource attributes

## Sources Consulted
- OpenTelemetry Collector routing connector README: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/connector/routingconnector
- OpenTelemetry Collector connector documentation: https://opentelemetry.io/docs/collector/components/connector/
- OpenTelemetry Kubernetes Collector components documentation: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- OpenTelemetry Collector k8sattributes processor README: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/k8sattributesprocessor

## Issues Found
- The routing connector examples used `match_once: true`, but `match_once` was deprecated in OpenTelemetry Collector contrib v0.116.0 and removed in v0.120.0. Removed `match_once` from all examples and updated the explanation to describe the current default `move` action.
- The routing connector examples used `statement` with expressions such as `resource.attributes["service.name"] == "payment-service"`. Current routing connector examples use `condition` for routing conditions, and the default `resource` context addresses resource attributes as `attributes[...]`. Updated all routing examples to use `condition: attributes[...]`.
- The Kubernetes namespace section said the k8s attributes processor attaches namespace labels, but the examples route on the `k8s.namespace.name` resource attribute. Changed this to namespace attributes.
- The troubleshooting section said missing Kubernetes RBAC permissions will silently skip enrichment. Official documentation states the processor needs Kubernetes API permissions; the exact failure visibility can vary. Changed this to say missing permissions can prevent enrichment.

## Review Notes
The routing connector is still documented as alpha for traces, metrics, and logs in the OpenTelemetry Collector contrib distribution. The examples now match the current connector configuration model, but users should still test configs against the Collector version they deploy.
