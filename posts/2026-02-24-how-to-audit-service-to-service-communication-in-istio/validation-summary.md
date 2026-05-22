# Validation Summary: How to Audit Service-to-Service Communication in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio service mesh
- Envoy access logs
- Istio Telemetry API
- Istio AuthorizationPolicy
- Fluent Bit
- OpenTelemetry Collector
- Elasticsearch
- Prometheus
- Compliance log retention

## Sources Consulted
- Istio Envoy access logs task: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio OpenTelemetry access log provider task: https://istio.io/latest/docs/tasks/observability/logs/otel-provider/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- PCI DSS v4.0 SAQ C, Requirement 10.5.1: https://www.pcisecuritystandards.org/documents/PCI-DSS-v4-0-SAQ-C.pdf
- 45 CFR 164.316 HIPAA Security Rule documentation retention: https://ecfr.io/Title-45/Section-164.316

## Issues Found
- Removed `enableAccessLogForExternalTraffic` from the IstioOperator mesh config example because it is not a documented current `MeshConfig` access logging field.
- Replaced the invalid `meshConfig.defaultConfig.accessLog` custom logging example with a supported `meshConfig.accessLogFormat` example.
- Updated the AuthorizationPolicy section to refer to the `AUDIT` action instead of `CUSTOM`, and clarified that AUDIT marks matching requests but does not itself allow, deny, or emit an audit record without a supporting audit/logging integration.
- Changed the OpenTelemetry access log provider from `opentelemetry` to `envoyOtelAls`, which is the documented provider type for Envoy access logs. The `opentelemetry` provider is used for tracing.
- Added `reporter="destination"` to plaintext-traffic Prometheus examples because Istio documents `connection_security_policy` as meaningful for destination-reported metrics.
- Corrected compliance retention wording: PCI DSS requires at least 12 months of audit log history with the most recent 3 months immediately available; SOC 2 retention is control/auditor-specific rather than a fixed framework mandate; HIPAA's 6-year rule applies to required Security Rule documentation, with audit evidence retention commonly aligned to that period.

## Review Notes
The remaining examples are conceptual and environment-dependent. The Fluent Bit and Elasticsearch snippets may need runtime-specific parser and backend settings in a real cluster, but the post presents them as pipeline examples rather than complete production manifests.
