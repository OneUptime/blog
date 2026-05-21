# Validation Summary: How to Configure the Istio Telemetry API

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio Telemetry API
- Istio MeshConfig extension providers
- Kubernetes custom resources
- Prometheus metrics
- Envoy access logging
- Zipkin and OpenTelemetry tracing
- CEL access log filters
- istioctl and kubectl commands

## Sources Consulted
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Telemetry API task documentation: https://istio.io/latest/docs/tasks/observability/telemetry/
- Istio metrics customization with Telemetry API: https://istio.io/latest/docs/tasks/observability/metrics/telemetry-api/
- Istio access logs with Telemetry API: https://istio.io/latest/docs/tasks/observability/logs/telemetry-api/
- Istio tracing with Telemetry API: https://istio.io/latest/docs/tasks/observability/distributed-tracing/telemetry-api/
- Istio trace sampling documentation: https://istio.io/latest/docs/tasks/observability/distributed-tracing/sampling/
- Istio MeshConfig extension provider reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio configuration analysis messages: https://istio.io/latest/docs/reference/config/analysis/

## Issues Found
- The mesh-wide Telemetry setup said the resource must be named `default`. Official Istio documentation requires the resource to be in the root configuration namespace without a workload selector; the name does not have to be `default`. Updated the text and examples to use `mesh-default`.
- The root namespace gotcha implied a Telemetry named `default` in another namespace has special namespace-wide behavior. Updated this to explain that selector-less Telemetry resources outside the root namespace are namespace-scoped regardless of name.
- The multiple Telemetry resources gotcha said resources in the same namespace merge by name. Official Istio documentation says only one selector-less Telemetry resource is valid per namespace, and selector-based Telemetry resources must not select the same workload. Updated the guidance accordingly.
- The provider-not-found gotcha overstated that the resource would simply be accepted but have no effect. Updated the wording to the technically accurate point: Istio cannot send telemetry to a backend unless the referenced provider is defined in MeshConfig.

## Review Notes
The post uses the current `telemetry.istio.io/v1` API and the shown fields for metrics, access logging, tracing, custom tags, CEL filters, and MeshConfig extension providers match current Istio documentation. `istioctl` was not installed locally, so command verification used the official Istio command reference.
