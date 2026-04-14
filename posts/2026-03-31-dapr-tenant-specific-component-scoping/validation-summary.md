# Validation Summary: How to Implement Tenant-Specific Component Scoping in Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Component Scoping
- Dapr Pub/Sub topic scoping (`publishingScopes`, `subscriptionScopes`)
- Kubernetes RBAC
- Kubernetes CRDs (Dapr Component, Subscription)
- Redis (state store and pub/sub)

## Sources Consulted
- Dapr Component Scopes documentation: https://docs.dapr.io/operations/components/component-scopes/
- Dapr Component Schema reference: https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr Pub/Sub Scopes documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-scopes/

## Issues Found

### 1. Pub/Sub Scoping Section - Incorrect description and missing examples
**What was wrong:** The section mentioned `publishingScopes` and `subscriptionScopes` as if they were separate YAML fields, but showed a plain pub/sub component without them, followed by a Subscription resource that doesn't demonstrate these features. In reality, `publishingScopes` and `subscriptionScopes` are metadata entries (name/value pairs) inside `spec.metadata` on the component, using a semicolon-separated `appID=topic1,topic2` format.

**What was changed:** Rewrote the section to correctly show `publishingScopes` and `subscriptionScopes` as `spec.metadata` entries with proper syntax and a concrete example demonstrating the semicolon-separated format. Added an explanation of the value format.

### 2. Audit Script - Incorrect field path for `scopes`
**What was wrong:** The Python audit script accessed `item['spec'].get('scopes', ['ALL'])`, but `scopes` is a top-level field on the Dapr Component CRD, not nested inside `spec`. This would always return `['ALL']` even for scoped components.

**What was changed:** Changed to `item.get('scopes', ['ALL'])` to correctly access the top-level `scopes` field.

### 3. "Deny list pattern" - Misleading terminology
**What was wrong:** The section described the `scopes` mechanism as a "deny list pattern," but it is actually an allowlist. Only apps explicitly listed in `scopes` can access the component; all others are implicitly denied.

**What was changed:** Replaced "You can explicitly deny access using a deny list pattern" with "The `scopes` field acts as an allowlist" to accurately describe the mechanism.

## Review Notes
- The basic component scoping YAML correctly places `scopes` as a top-level field (sibling to `apiVersion`, `kind`, `metadata`, `spec`), which matches the official Dapr Component schema.
- The RBAC section is sound and correctly uses the `dapr.io` API group for component resources.
- The post could benefit from mentioning the `allowedTopics` and `protectedTopics` metadata fields for additional pub/sub topic control, but this is not an error.
