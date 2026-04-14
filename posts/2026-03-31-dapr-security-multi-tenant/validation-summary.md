# Validation Summary: How to Use Dapr Security in Multi-Tenant Environments

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Kubernetes (namespaces, NetworkPolicy, Secrets)
- SPIFFE trust domains and mTLS
- Redis (as example state store)

## Sources Consulted
- Dapr Component Spec: https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr Component Scoping: https://docs.dapr.io/operations/components/component-scopes/
- Dapr Access Control List Configuration: https://docs.dapr.io/operations/configuration/invoke-allowlist/
- Dapr mTLS Setup: https://docs.dapr.io/operations/security/mtls/
- Dapr Configuration Spec: https://docs.dapr.io/reference/resource-specs/configuration-schema/
- Dapr Isolation Concepts: https://docs.dapr.io/concepts/isolation-concept
- Kubernetes NetworkPolicy API: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- **Component scoping YAML structure was incorrect.** The `scopes` field was nested under `spec` in the Component resource YAML. According to the official Dapr Component schema, `scopes` is a root-level field (sibling to `apiVersion`, `kind`, `metadata`, and `spec`), not a child of `spec`. The incorrect nesting would cause scoping to be silently ignored, meaning any app in the namespace could access the component — a security concern in a multi-tenant post. Fixed by moving `scopes` to the root level of the YAML document.

## Review Notes
- The access control policy example omits the `operations` field, which is optional but commonly used in production for granular path-level control. The example is valid as-is since `defaultAction: allow` covers all operations for the specified app.
- mTLS is enabled by default in Dapr Kubernetes deployments, so the explicit `enabled: true` is redundant but not wrong and serves as good documentation.
- The claim about assigning different trust domains per tenant is slightly simplified. The `trustDomain` in the Configuration's `accessControl` section is used for policy matching on the receiving side. The actual trust domain in a service's SPIFFE identity is determined by the Sentry CA configuration, not the per-app Configuration resource. The post's guidance is directionally correct but readers implementing this should consult the Dapr Sentry documentation for the full picture.
- The Kubernetes NetworkPolicy example is correct and follows standard practices for namespace-based ingress isolation.
