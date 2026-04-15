# Validation Summary: How to Use Dapr Component CRD for Declarative Configuration

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Kubernetes Custom Resource Definitions (CRDs)
- Dapr Component CRD (`components.dapr.io`)
- Redis (state store)
- Apache Kafka (pub/sub)
- HashiCorp Vault (secret store)
- Cron binding
- Kustomize
- kubectl

## Sources Consulted
- [Component spec | Dapr Docs](https://docs.dapr.io/reference/resource-specs/component-schema/) — verified CRD structure, `scopes` field placement inside `spec`
- [How-To: Scope components to one or more applications | Dapr Docs](https://docs.dapr.io/operations/components/component-scopes/) — confirmed `scopes` is a field under `spec` with app ID array
- [Redis state store | Dapr Docs](https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/) — verified `redisHost`, `redisPassword`, `keyPrefix`, `enableTLS` metadata fields
- [Apache Kafka pub/sub | Dapr Docs](https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/) — verified `brokers`, `consumerGroup`, `authType`, `saslUsername`, `saslPassword` metadata fields
- [HashiCorp Vault secret store | Dapr Docs](https://docs.dapr.io/reference/components-reference/supported-secret-stores/hashicorp-vault/) — verified `vaultAddr`, `vaultToken`, `vaultKVPrefix` metadata fields
- [Cron binding spec | Dapr Docs](https://docs.dapr.io/reference/components-reference/supported-bindings/cron/) — verified `schedule` metadata field and `@every` shortcut syntax
- [How-To: Reference secrets in components | Dapr Docs](https://docs.dapr.io/operations/components/component-secrets/) — verified `secretKeyRef` usage pattern

## Issues Found

### 1. `scopes` field incorrectly placed at root level in Component CRD template
- **What was wrong:** The generic Component CRD structure template showed the `scopes` field at the root level (sibling to `spec`), but according to the official Dapr Component spec documentation, `scopes` is a field inside `spec`.
- **What was changed:** Moved `scopes` and its child `- <app-id>` inside `spec` with proper indentation.
- **Why:** The official Dapr docs at docs.dapr.io/reference/resource-specs/component-schema/ and docs.dapr.io/operations/components/component-scopes/ both show `scopes` nested under `spec`. Using root-level `scopes` would result in the field being ignored by the Dapr operator.

### 2. Hardcoded `vaultToken` in Secret Store example
- **What was wrong:** The HashiCorp Vault secret store example had `vaultToken` set as a plain-text value (`"s.xxxxxxxxx"`), which contradicts the blog's own summary stating that "Secret values are referenced through Kubernetes Secret resources via `secretKeyRef`, keeping credentials out of version control."
- **What was changed:** Replaced the hardcoded `value` with a `secretKeyRef` referencing a Kubernetes Secret (`vault-credentials` with key `token`).
- **Why:** Hardcoding a Vault token in a component YAML is a security anti-pattern and directly contradicts the blog's advice. Using `secretKeyRef` is consistent with the other examples in the post (Redis password, Kafka credentials) and with Dapr best practices.

## Review Notes
- All other YAML examples (state store, pub/sub, cron binding) are technically correct with valid metadata field names and values.
- The `@every 1m` cron syntax is confirmed valid by the Dapr cron binding documentation.
- The kubectl commands shown are all correct for interacting with Dapr Component CRDs.
- The `apiVersion: dapr.io/v1alpha1` is the current stable API version for Dapr components.
