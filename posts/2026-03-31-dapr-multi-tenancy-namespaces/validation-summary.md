# Validation Summary: How to Implement Multi-Tenancy with Dapr Namespaces

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar architecture, components, service invocation, mTLS)
- Kubernetes (namespaces, NetworkPolicy, pod annotations)
- Redis (as a state store backend)
- JavaScript / Node.js (fetch API for Dapr HTTP invocation)

## Sources Consulted
- Dapr official docs: Component scoping and namespaces (https://docs.dapr.io/operations/components/component-scopes/)
- Dapr official docs: Service invocation across namespaces (https://docs.dapr.io/developing-applications/building-blocks/service-invocation/howto-invoke-discover-services/)
- Dapr official docs: mTLS configuration (https://docs.dapr.io/operations/security/mtls/)
- Dapr official docs: Sentry and trust domains (https://docs.dapr.io/operations/security/mtls/#sentry-configuration)
- Dapr official docs: Redis state store component (https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/)
- Kubernetes official docs: Network Policies (https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- Kubernetes official docs: Namespace labels (https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/)

## Issues Found

### 1. Incorrect namespace label for Dapr injection
- **What was wrong:** The post used `kubectl label namespace tenant-a dapr-enabled=true` with a comment saying "Label namespaces for Dapr injection." This label is not recognized by Dapr. Dapr sidecar injection is controlled via pod-level annotations (`dapr.io/enabled: "true"` and `dapr.io/app-id`), not namespace labels.
- **What was changed:** Replaced the label with a generic organizational label (`tenant=tenant-a`) and added a note explaining that Dapr injection is controlled via pod annotations.
- **Why:** Readers following this guide would expect the label to enable Dapr injection, but it would have no effect.

### 2. Misleading claim about service invocation namespace scoping
- **What was wrong:** The post stated that "An app in tenant-a can only invoke services in the same namespace without explicit cross-namespace configuration." This implies cross-namespace invocation requires special configuration to enable, which is incorrect. Cross-namespace invocation works out of the box using the `appid.namespace` format. Restricting it requires access control policies.
- **What was changed:** Reworded to clarify that same-namespace is the default target, cross-namespace works by default with the `appid.namespace` format, and restriction (not enablement) requires configuration.
- **Why:** The original wording would mislead readers into thinking they need to enable cross-namespace invocation, when they actually need to restrict it for proper multi-tenant isolation.

### 3. Incorrect claim about per-namespace trust domains
- **What was wrong:** The section title "Configure Namespace-Level Trust Domains" and description claimed to set up "separate mTLS trust domains per tenant namespace." The Configuration resource shown only enables mTLS with cert TTL settings — it does not configure separate trust domains. In a single-cluster Dapr installation, all namespaces share the same Sentry CA and trust domain.
- **What was changed:** Renamed section to "Configure mTLS Per Namespace," updated the description, and added a note clarifying that separate trust domains require separate Dapr control plane installations.
- **Why:** The original section overpromised isolation that the configuration didn't actually deliver.

### 4. Network policy missing DNS and Dapr system egress rules
- **What was wrong:** The NetworkPolicy only allowed egress to the tenant's own namespace. This would block DNS resolution (kube-system) and communication with Dapr control plane services (dapr-system namespace), effectively breaking Dapr functionality.
- **What was changed:** Added egress rules for DNS resolution (kube-system, UDP/TCP port 53) and Dapr control plane communication (dapr-system namespace).
- **Why:** Without these rules, Dapr sidecars cannot reach Sentry (for certificate issuance), the placement service (for actor support), or resolve DNS names — making the setup non-functional.

## Review Notes
- The Redis state store component YAML is correct. The `keyPrefix` field accepts custom string values, so `tenant-a` / `tenant-b` are valid.
- The cross-namespace invocation syntax (`appid.namespace`) in the JavaScript example is correct.
- The Dapr Component API version `dapr.io/v1alpha1` is still the current version.
- For production multi-tenant deployments, the post could benefit from mentioning Dapr access control policies (app-level allow/deny lists) as an additional layer of isolation beyond namespace scoping, but this is a potential enhancement, not an error.
- The `kubernetes.io/metadata.name` label used in the NetworkPolicy is a built-in Kubernetes label (available since K8s 1.21+), which is correct.
