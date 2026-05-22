# Validation Summary: How to Configure Access Logs with Telemetry API in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio Telemetry API
- IstioOperator and MeshConfig extension providers
- Envoy access logs
- OpenTelemetry access logging
- Kubernetes custom resources and kubectl
- CEL expressions
- istioctl proxy-config

## Sources Consulted
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Configure access logs with Telemetry API task: https://istio.io/latest/docs/tasks/observability/logs/telemetry-api/
- Istio Envoy Access Logs task: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio MeshConfig / ExtensionProvider reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Envoy attributes reference for CEL-accessible request, response, connection, and xDS attributes: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/advanced/attributes
- Envoy access log and substitution formatter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage.html and https://www.envoyproxy.io/docs/envoy/latest/configuration/advanced/substitution_formatter.html

## Issues Found
- The slow-request CEL examples used `response.duration`, but Envoy documents completed request duration as `request.duration`. Updated the slow-request examples and CEL attribute table to use `request.duration`.
- The verification section used `istioctl proxy-config log deploy/my-service --level debug`, which changes Envoy logger levels and does not verify access-log configuration. Replaced it with `istioctl proxy-config listeners deploy/my-service -o json | grep -i access_log`.
- The same-scope precedence note was too broad. Updated it to match Istio's documented constraints: only one selector-less Telemetry resource is valid per namespace, and multiple selector-based Telemetry resources must not select the same workload.

## Review Notes
The post uses `telemetry.istio.io/v1`, which is current for modern Istio releases. Istio's official access-log task still contains some examples using `v1alpha1`, but the reference docs and v1 API promotion notes support the post's use of `v1`. The `response.code` filter examples are valid for HTTP responses, but operators may want to use `has(response.code)` patterns when they need to include failed connections where no HTTP response code exists.
