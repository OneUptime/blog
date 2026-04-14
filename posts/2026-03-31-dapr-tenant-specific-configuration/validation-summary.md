# Validation Summary: How to Implement Tenant-Specific Configuration with Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Configuration CRD, middleware, feature flags)
- Kubernetes (namespaces, annotations, CRDs)
- Helm (chart deployment, namespace management)
- Zipkin (distributed tracing)

## Sources Consulted
- Dapr Configuration overview: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr Configuration schema reference: https://docs.dapr.io/reference/resource-specs/configuration-schema/
- Dapr annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Configuration building block API: https://docs.dapr.io/reference/api/configuration_api/
- Dapr preview features list: https://docs.dapr.io/operations/support/support-preview-features/
- Dapr middleware reference (rate limit): https://docs.dapr.io/reference/components-reference/supported-middleware/middleware-rate-limit/
- Dapr middleware reference (OAuth2): https://docs.dapr.io/reference/components-reference/supported-middleware/middleware-oauth2/

## Issues Found

1. **`spec.metric.enabled` should be `spec.metrics.enabled` (plural)**: The post used `metric` (singular) in both the Tenant A and Tenant B Configuration YAML examples. The correct Dapr Configuration CRD field is `metrics` (plural). Using the singular form would cause the field to be silently ignored. Fixed both occurrences.

2. **Invalid feature flag name `WorkflowActorScanInterval`**: This is not a valid Dapr preview feature flag. It does not appear in the official preview features documentation. Replaced with `WorkflowsClusteredDeployment`, which is a real Dapr preview feature flag.

3. **Incorrect use of Configuration API endpoint**: The post included a `curl http://localhost:3500/v1.0/configuration/tenant-config` command claiming it queries the active Configuration CRD settings. This is incorrect — the `/v1.0/configuration/{storename}` endpoint is the Configuration **building block** API, which reads key-value pairs from external configuration stores (Redis, Azure App Configuration, etc.). It has nothing to do with the Dapr sidecar's own Configuration CRD runtime settings. There is no HTTP API to query the sidecar's Configuration CRD at runtime. Replaced the curl example with a clarifying note explaining the distinction.

## Review Notes
- The namespace-scoping approach for Configuration CRDs is architecturally sound and follows standard Kubernetes namespace isolation, though the official Dapr documentation does not explicitly document or guarantee this multi-tenant pattern.
- The `HotReload` and `ActorStateTTL` feature flags are valid preview features but their availability may change across Dapr versions as features graduate from preview to stable.
- The Helm deployment pattern shown is a reasonable approach but uses a hypothetical `./tenant-chart` — readers will need to create their own chart template.
