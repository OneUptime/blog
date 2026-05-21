# Validation Summary: How to Enable Access Logs in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Envoy access logs
- Istio Telemetry API
- Istio MeshConfig and IstioOperator
- Helm
- Kubernetes kubectl

## Sources Consulted
- Istio Envoy Access Logs documentation: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Global Mesh Options reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio Helm installation documentation: https://istio.io/latest/docs/setup/install/helm/

## Issues Found
- The default TEXT access log field table mislabeled the `via_upstream` value as "Mesh routing" and the following `-` value as "Authority". In Istio's documented default format, these fields are `response_code_details` and `connection_termination_details`, followed by `upstream_transport_failure_reason`. Updated the table to match the documented default format and added the remaining default fields that were omitted.
- The JSON example omitted several fields that correspond to Istio's default access log format, including response code details, connection termination details, upstream transport failure reason, upstream cluster, upstream local address, requested server name, route name, start time, and X-Forwarded-For. Updated the example so it better reflects the default structured access log output.

## Review Notes
The Istio Telemetry API examples, MeshConfig fields (`accessLogFile`, `accessLogEncoding`), disabling examples, and Helm `meshConfig` values are consistent with current Istio documentation. The Helm examples assume the Istio Helm repository has already been added and updated.
