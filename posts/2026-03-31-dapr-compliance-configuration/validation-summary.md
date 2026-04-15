# Validation Summary: How to Configure Dapr for Compliance Requirements

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Configuration API, mTLS, Access Control, Component Scoping)
- HashiCorp Vault (secret store integration)
- OpenTelemetry (tracing/audit logging)
- Kubernetes (NetworkPolicy)
- Redis (state store example)

## Sources Consulted
- Dapr Configuration spec: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr mTLS documentation: https://docs.dapr.io/operations/security/mtls/
- Dapr Access Control Policies: https://docs.dapr.io/operations/configuration/invoke-allowlist/
- Dapr Secret Store component (HashiCorp Vault): https://docs.dapr.io/reference/components-reference/supported-secret-stores/hashicorp-vault/
- Dapr Observability/Tracing: https://docs.dapr.io/operations/observability/tracing/otel-collector/
- Dapr Component Scoping: https://docs.dapr.io/operations/components/component-scopes/
- Kubernetes NetworkPolicy API: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Cross-reference with 40+ other Dapr blog posts in this repository for field name consistency

## Issues Found
1. **Incorrect field name `httpVerbiage` in access control policies (lines 51 and 58):**
   - **What was wrong:** The field `httpVerbiage` is not a valid Dapr Configuration field. The correct field name is `httpVerb`.
   - **What was changed:** Replaced `httpVerbiage: POST` with `httpVerb: POST` and `httpVerbiage: GET` with `httpVerb: GET` in the access control policy YAML example.
   - **Why:** The Dapr access control spec defines the field as `httpVerb` for specifying allowed HTTP methods on operations. Using `httpVerbiage` would cause the configuration to be silently ignored or rejected by Dapr.

## Review Notes
- The `secretKeyRef` fragment showing `store: vault-secret-store` inline is a non-standard shorthand. In Dapr's component spec, the secret store for a component is typically specified via `auth.secretStore` at the spec level rather than a `store` field inside `secretKeyRef`. The snippet is a partial fragment and conveys the intent, but readers implementing this should use the `auth.secretStore` pattern in their full component YAML.
- The mTLS configuration fields (`enabled`, `workloadCertTTL`, `allowedClockSkew`) are correct per the Dapr Configuration spec.
- The OpenTelemetry tracing configuration (`samplingRate`, `otel.endpointAddress`, `otel.isSecure`, `otel.protocol`) is correct.
- The Kubernetes NetworkPolicy YAML is syntactically correct and follows the `networking.k8s.io/v1` API.
- Component scoping with `spec.scopes` is correctly shown for restricting component access by app ID.
