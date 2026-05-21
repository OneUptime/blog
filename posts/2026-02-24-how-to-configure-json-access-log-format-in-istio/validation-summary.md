# Validation Summary: How to Configure JSON Access Log Format in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Envoy access logs
- Istio Telemetry API
- IstioOperator mesh configuration
- Kubernetes kubectl
- jq
- JSON logging

## Sources Consulted
- Istio Envoy Access Logs task: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio MeshConfig global mesh options / EnvoyFileAccessLogProvider reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Envoy access logging documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage.html
- Envoy substitution formatter command reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/advanced/substitution_formatter.html
- Istio 1.30.0 source for default JSON access log fields and sidecar-injected environment variables: https://github.com/istio/istio

## Issues Found
- The post said default JSON encoding includes "all standard Envoy fields." Istio actually uses its own default JSON access log field set when `accessLogEncoding: JSON` is enabled without a custom format. Changed the wording to "Istio's default access log fields."
- The default JSON example used `null` for unset values. Envoy's JSON format renders unset values as `"-"` unless typed JSON or omit-empty behavior is configured. Updated the unset example fields to `"-"`.

## Review Notes
The configuration examples use current Istio APIs (`telemetry.istio.io/v1`, `IstioOperator`, `meshConfig.extensionProviders`, and `envoyFileAccessLog.logFormat.labels`). Envoy formatter commands used in the examples are valid, including request/response header formatters, duration fields, gRPC status, and environment-variable substitution. The sidecar environment variables `POD_NAME`, `POD_NAMESPACE`, and `SERVICE_ACCOUNT` are present in Istio's injection templates.
