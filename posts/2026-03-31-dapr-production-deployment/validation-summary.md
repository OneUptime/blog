# Validation Summary: How to Prepare a Dapr Deployment for Production

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (sidecar architecture, mTLS, resiliency, observability)
- Kubernetes (Helm, NetworkPolicy, annotations, namespaces)
- Redis Sentinel (as Dapr state store)
- OpenTelemetry (OTLP HTTP export)
- Helm (chart installation and configuration)

## Sources Consulted
- Dapr Helm chart README and values.yaml — https://github.com/dapr/dapr/blob/master/charts/dapr/README.md
- Dapr mTLS documentation — https://docs.dapr.io/operations/security/mtls/
- Dapr arguments and annotations overview — https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Component schema — https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr Resiliency policies (retries) — https://docs.dapr.io/operations/resiliency/policies/retries/retries-overview/
- Dapr Resiliency schema — https://docs.dapr.io/reference/resource-specs/resiliency-schema/
- Dapr Configuration overview (tracing/metrics) — https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr Kit retry source code — https://github.com/dapr/kit/blob/main/retry/retry.go

## Issues Found
No technical issues found. All configurations are syntactically correct and would work as described.

## Review Notes
- **`dapr_placement.replicaCount=3`**: While this likely works (standard Helm subchart pattern), the documented approach for HA placement is `global.ha.enabled=true` or `dapr_placement.ha=true`. The blog's approach is functional but not the canonical method shown in official docs.
- **`dapr_dashboard.enabled=false`**: The Dapr dashboard has been removed as a subchart from the main Dapr Helm chart in recent versions (now a separate `dapr/dapr-dashboard` chart). This flag is silently ignored in newer versions and could be removed for clarity.
- **`maxElapsedTime: 2m` in resiliency retry policy**: This field exists in the Dapr Kit retry source code (`dapr/kit/retry/retry.go`) and is functional, but it is not documented in the official Dapr resiliency docs. It will work correctly but readers may not find it in official references.
- **Network policy ports**: The policy opens ports 3500 (HTTP API) and 50001 (gRPC API). Note that port 50001 is the gRPC API port for app-to-sidecar communication, not the internal gRPC port (which is 50002, used for sidecar-to-sidecar communication). The policy is a reasonable simplified example for control-plane ingress, but a complete production network policy would also need to account for inter-sidecar traffic on port 50002.
- **OTEL `endpointAddress` with `http://` prefix**: The inclusion of `http://` in the endpoint address is acceptable when using `protocol: http`, though some Dapr examples show just `host:port`. This depends on the OTEL collector configuration.
