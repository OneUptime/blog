# Validation Summary: How to Implement Zero Trust Architecture with Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Kubernetes (NetworkPolicy, kubectl)
- Mutual TLS (mTLS)
- Redis (as state store example)
- Python (requests library for Dapr HTTP API calls)
- YAML (Dapr Configuration and Component specs)

## Sources Consulted
- Dapr Configuration spec: https://docs.dapr.io/reference/resource-specs/configuration-schema/
- Dapr mTLS setup: https://docs.dapr.io/operations/security/mtls/
- Dapr access control policies: https://docs.dapr.io/operations/configuration/invoke-allowlist/
- Dapr component scopes: https://docs.dapr.io/operations/components/component-scopes/
- Dapr Secrets API reference: https://docs.dapr.io/reference/api/secrets_api/
- Dapr Service Invocation API reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr Kubernetes annotations: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-overview/

## Issues Found

1. **Component scoping indentation (line ~87)**: The `scopes` field was incorrectly indented under `spec`. In Dapr Component YAML, `scopes` is a top-level field at the same level as `apiVersion`, `kind`, `metadata`, and `spec` — not nested under `spec`. Fixed by moving `scopes` to the correct indentation level.

2. **NetworkPolicy label vs annotation (line ~145)**: The NetworkPolicy used `dapr.io/enabled: "true"` as a pod label in the `podSelector`. However, `dapr.io/enabled` is a Dapr **annotation**, not a label. Kubernetes `podSelector` in NetworkPolicy only matches on labels, so this policy would not match any Dapr-enabled pods. Changed to `dapr-enabled: "true"` as a custom label, which users would need to apply to their pods explicitly.

## Review Notes
- The mTLS configuration, access control policy structure, secrets API URL pattern, and service invocation API URL pattern are all correct per current Dapr documentation.
- The `dapr-trust-bundle` secret name and `dapr-system` namespace reference in the verification commands are accurate.
- The NetworkPolicy section is conceptually sound (restricting traffic to Dapr-enabled pods) but users should be aware they need to apply a custom label to their pods since Dapr does not automatically add labels for NetworkPolicy selection. A brief note in the post explaining this would improve clarity in a future revision.
- The Python code examples correctly demonstrate Dapr HTTP API usage with proper URL patterns and error handling.
