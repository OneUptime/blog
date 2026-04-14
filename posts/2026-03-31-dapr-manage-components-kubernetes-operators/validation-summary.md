# Validation Summary: How to Manage Dapr Components with Kubernetes Operators

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (control plane, sidecar architecture)
- Dapr Kubernetes Operator (dapr-operator)
- Dapr Component CRDs
- Dapr Configuration CRD (HotReload feature flag)
- Kubernetes (kubectl, RBAC, ClusterRoles, Deployments)
- Redis (as example state store component)

## Sources Consulted
- Dapr official documentation: Component updates (https://docs.dapr.io/operations/components/component-updates/)
- Dapr official documentation: Configuration overview (https://docs.dapr.io/operations/configuration/configuration-overview/)
- Dapr official documentation: Preview features / HotReload (https://docs.dapr.io/operations/configuration/preview-features/)
- Dapr official documentation: Operator service (https://docs.dapr.io/concepts/dapr-services/operator/)
- Dapr official documentation: Component schema reference (https://docs.dapr.io/reference/resource-specs/component-schema/)
- Dapr official documentation: Redis state store setup (https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/)
- Dapr Helm chart source (charts/dapr/values.yaml, charts/dapr/charts/dapr_operator/templates/)
- Dapr operator source code (pkg/operator/operator.go)

## Issues Found

1. **Incorrect metrics port (8080 -> 9090)**: The post showed `kubectl port-forward svc/dapr-operator -n dapr-system 8080:8080` for accessing metrics. The Dapr operator exposes Prometheus metrics on port **9090**, not 8080. Port 8080 is used for health probes (`/healthz`), not metrics. Fixed the port-forward command to use 9090.

2. **Incorrect service name for metrics (dapr-operator -> dapr-api)**: The post used `svc/dapr-operator` in the port-forward command, but the operator's Kubernetes Service is named **`dapr-api`**, not `dapr-operator`. The Deployment is named `dapr-operator`, but the Service is `dapr-api`. Fixed the service name in the command.

3. **Misleading "Component Versioning" section**: The post claimed "The operator tracks which component version each sidecar has loaded" and framed the section as a "Version 1 to version 2 migration." This is inaccurate. The `version` field in the Component CRD specifies the component API schema version (e.g., `v1` for the state store interface), not an operational version for tracking or migration purposes. The operator does not maintain per-sidecar version tracking. Rewrote the section heading and description to accurately describe it as updating component configuration with the operator, rather than version management.

## Review Notes
- The `HotReload` feature remains a preview feature in Dapr (as of v1.17) requiring explicit opt-in via the feature flag. The post correctly shows how to enable it but does not mention its preview status. This could be noted in a future update.
- The list of CRDs watched by the operator (Component, Configuration, Resiliency, Subscription, HTTPEndpoint) is correct for standard installations but omits the newer MCPServer CRD added in recent Dapr versions. This is a minor omission.
- The `failover` metadata field shown in the Redis component example is valid, though in practice it requires `sentinelMasterName` to also be set for Redis Sentinel configurations.
- The `kubectl logs -l app=dapr-operator` label selector is correct.
- The `dapr-operator-admin` ClusterRole name is correct.
