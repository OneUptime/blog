# Validation Summary: How to Configure Access Log Format in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio MeshConfig
- IstioOperator installation configuration
- Envoy access log format strings
- Envoy substitution formatter operators
- Kubernetes ConfigMap configuration
- Kubernetes kubectl commands

## Sources Consulted
- Istio Envoy Access Logs task: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio Global Mesh Options / MeshConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio IstioOperator Options reference: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Envoy access logging documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage.html
- Envoy substitution formatter command reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/advanced/substitution_formatter
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- The quoted Istio default access log format used `%UPSTREAM_CLUSTER%`. Current Istio documentation uses `%UPSTREAM_CLUSTER_RAW%` in the built-in default format so that alternate stat names do not modify the cluster value. Updated the default format block accordingly.
- The quoted Istio default access log format omitted the documented trailing `\n`. Envoy format strings do not add a newline automatically, and the current Istio default includes one. Added the trailing newline escape to the default format block.

## Review Notes
- The `meshConfig.accessLogFile`, `meshConfig.accessLogEncoding`, and `meshConfig.accessLogFormat` fields are current Istio MeshConfig fields, with `TEXT` and `JSON` documented encodings.
- The request, response, timing, and network access log variables used in the examples are supported Envoy substitution formatter operators.
- The `REQ(...)` and `RESP(...)` aliases are documented Envoy shortcuts for request and response headers.
- Istio documentation currently recommends the Telemetry API for enabling and disabling access logging, but MeshConfig remains documented for file path, encoding, and format customization.
