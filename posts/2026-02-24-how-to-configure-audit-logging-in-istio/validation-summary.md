# Validation Summary: How to Configure Audit Logging in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio Telemetry API
- Istio AuthorizationPolicy
- Envoy access logs
- OpenTelemetry Collector
- Fluent Bit / Fluentd
- Kubernetes
- Elasticsearch index lifecycle management
- Prometheus

## Sources Consulted
- Istio Envoy Access Logs: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio OpenTelemetry access log provider task: https://istio.io/latest/docs/tasks/observability/logs/otel-provider/
- Istio Global Mesh Options / MeshConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio Authorization Policy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio AuthorizationPolicy dry-run task: https://istio.io/latest/docs/tasks/security/authorization/authz-dry-run/
- Istio Standard Metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Envoy substitution formatter reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/advanced/substitution_formatter
- Envoy RBAC filter reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/rbac_filter
- HHS HIPAA Security Rule summary: https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html
- PCI DSS v4.0 SAQ C, Requirement 10.5.1: https://www.pcisecuritystandards.org/documents/PCI-DSS-v4-0-SAQ-C.pdf

## Issues Found
- The post stated that authorization denials should be identified by the `UAEX` response flag. Envoy documents `UAEX` as an external authorization service denial flag, while native Istio authorization policies use Envoy RBAC and expose `rbac_access_denied_matched_policy[...]` in response code details. Updated the text accordingly.
- The custom access log format used `%DOWNSTREAM_PEER_NAMESPACE%`, which is not a supported Envoy substitution formatter operator. Removed that field while keeping the valid SPIFFE SAN identity fields.
- The post implied default access log entries include source and destination service identity. Istio's default access log format includes addresses, host, and cluster data, but SPIFFE identities require adding the relevant SAN operators. Adjusted the wording.
- The dry-run logging command omitted the need to enable RBAC debug logging before looking for `shadow` decisions. Added the `istioctl proxy-config log ... --level "rbac:debug"` command.
- The compliance retention bullets were too absolute. SOC 2 does not define a universal raw-log retention minimum, HIPAA's 6-year period applies to required Security Rule documentation rather than every raw log, and PCI DSS specifies 12 months with 3 months immediately available. Updated the retention bullets.

## Review Notes
The Istio examples use current `telemetry.istio.io/v1` and `security.istio.io/v1` APIs. The OpenTelemetry access log provider fields match current Istio MeshConfig documentation. The post remains a high-level guide; production deployments should validate exact retention and audit evidence requirements with their compliance scope and assessor.
