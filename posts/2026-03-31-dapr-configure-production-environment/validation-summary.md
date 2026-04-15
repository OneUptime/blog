# Validation Summary: How to Configure Dapr for Production Environment

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Kubernetes (deployment annotations, Helm)
- HashiCorp Vault (secret store integration)
- Azure Cosmos DB (state store)
- OpenTelemetry (tracing configuration)
- mTLS (mutual TLS for service-to-service security)

## Sources Consulted
- Dapr Production Guidelines: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-production/
- Dapr Configuration Overview: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr Resiliency Overview: https://docs.dapr.io/operations/resiliency/resiliency-overview/
- Dapr Resiliency Schema Reference: https://docs.dapr.io/reference/resource-specs/resiliency-schema/
- Dapr Circuit Breaker Policies: https://docs.dapr.io/operations/resiliency/policies/circuit-breakers/
- Dapr Kubernetes Annotations Reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Azure Cosmos DB State Store: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-azure-cosmosdb/
- Dapr HashiCorp Vault Secret Store: https://docs.dapr.io/reference/components-reference/supported-secret-stores/hashicorp-vault/

## Issues Found

1. **Resiliency retry policy field name (`initialInterval` → `duration`)**: The retry policy used `initialInterval: 500ms` but the correct Dapr resiliency schema field for the initial delay between retries is `duration`. Fixed to `duration: 500ms`.

2. **Invalid annotation `dapr.io/enable-metrics`**: The `dapr.io/enable-metrics` annotation does not exist in Dapr. Metrics enablement is controlled via the `metrics` section in the Configuration spec, not via a Kubernetes annotation. Removed this annotation from the deployment example.

3. **Liveness probe delay annotation name (`dapr.io/sidecar-liveness-probe-delay` → `dapr.io/sidecar-liveness-probe-delay-seconds`)**: The annotation was missing the `-seconds` suffix. Fixed to `dapr.io/sidecar-liveness-probe-delay-seconds`.

4. **Readiness probe delay annotation name (`dapr.io/sidecar-readiness-probe-delay` → `dapr.io/sidecar-readiness-probe-delay-seconds`)**: Same issue as above. Fixed to `dapr.io/sidecar-readiness-probe-delay-seconds`.

5. **Vault secret store metadata field name (`tlsCertFile` → `caCert`)**: The `tlsCertFile` metadata field does not exist for the HashiCorp Vault secret store component. The correct field for specifying the path to a CA certificate file is `caCert`. Fixed to `caCert`.

## Review Notes
- The Vault secret store component is missing the required `vaultToken` or `vaultTokenMountPath` authentication field. This is acceptable for a blog post demonstrating configuration patterns, but readers should be aware that one of these fields is required for a working configuration.
- The Helm install command sets both `global.ha.enabled=true` and individual `replicaCount=3` values, which is redundant (HA mode automatically sets 3 replicas), but not incorrect. Being explicit is reasonable for production documentation.
- The `samplingRate: "0.01"` comment says "1% in production" which is mathematically correct (0.01 = 1%).
- All Dapr API versions use `dapr.io/v1alpha1` which is current for Configuration, Component, and Resiliency resources.
