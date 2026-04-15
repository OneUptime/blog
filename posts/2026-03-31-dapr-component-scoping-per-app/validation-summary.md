# Validation Summary: How to Use Dapr Component Scoping per Application

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Component CRD (Custom Resource Definition)
- Dapr state stores (Redis, PostgreSQL)
- Dapr pub/sub (Redis)
- Dapr secret stores (Azure Key Vault)
- Kubernetes namespaces
- kubectl CLI

## Sources Consulted
- Dapr Component Scopes documentation: https://docs.dapr.io/operations/components/component-scopes/
- Dapr Pub/Sub Scopes documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-scopes/
- Dapr Kubernetes Overview (sidecar injection): https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-overview/
- Dapr Redis State Store reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr Redis Pub/Sub reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-redis-pubsub/
- Dapr Azure Key Vault Secret Store reference: https://docs.dapr.io/reference/components-reference/supported-secret-stores/azure-keyvault/
- Dapr PostgreSQL State Store reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-postgresql-v2/
- Dapr GitHub issues #8124 and #2323 (error behavior for out-of-scope components)

## Issues Found
1. **Incorrect namespace labeling for Dapr sidecar injection**: The post used `kubectl label namespace team-a dapr.io/enabled=true` with a comment claiming this enables Dapr sidecar injection at the namespace level. This is incorrect — Dapr sidecar injection is controlled via **pod-level annotations** (`dapr.io/enabled: "true"` and `dapr.io/app-id`), not namespace labels. The namespace label pattern is an Istio convention, not a Dapr one. Fixed the bash code block to use comments explaining the correct pod annotation approach instead of the non-functional label commands.

2. **Incorrect error code for out-of-scope state store access**: The post showed `ERR_COMPONENT_NOT_FOUND` as the error code when a non-scoped app tries to access a restricted state store. Dapr does not use a generic `ERR_COMPONENT_NOT_FOUND` code. For state stores, the actual error code is `ERR_STATE_STORE_NOT_FOUND`. Fixed the error code and message to match actual Dapr behavior.

## Review Notes
- The `scopes` field placement at the root level of the Component CRD (alongside `apiVersion`, `kind`, `metadata`, `spec`) is correct per Dapr documentation.
- All component types (`state.redis`, `pubsub.redis`, `secretstores.azure.keyvault`, `state.postgresql`) are valid and current.
- The pub/sub topic-level scoping metadata fields (`publishingScopes`, `subscriptionScopes`, `allowedTopics`) and their format are correct per Dapr documentation. There is also a `protectedTopics` field not mentioned in the post, but its omission is not an error.
- The `secretKeyRef` syntax for referencing secrets in component metadata is correct.
- Historically, out-of-scope component access could fail silently in some cases (per Dapr GitHub issue #8124). The post's description of receiving an error is the expected modern behavior but readers should be aware that logging/error behavior may vary by Dapr version.
