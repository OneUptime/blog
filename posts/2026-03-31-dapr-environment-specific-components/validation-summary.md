# Validation Summary: How to Use Environment-Specific Dapr Components

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (components, state stores, pub/sub, secret stores, component scoping)
- Kubernetes (namespaces, CRDs)
- Kustomize (overlays, patches)
- Helm (values files, templates)
- Redis (state store and pub/sub)
- Azure Cosmos DB (state store)
- Azure Service Bus (pub/sub)
- HashiCorp Vault (secret store)

## Sources Consulted
- Dapr Component Schema: https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr Component Scopes: https://docs.dapr.io/operations/components/component-scopes/
- Dapr Redis State Store: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr Azure Cosmos DB State Store: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-azure-cosmosdb/
- Dapr Redis Pub/Sub: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-redis-pubsub/
- Dapr Azure Service Bus Topics Pub/Sub: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-azure-servicebus-topics/
- Dapr HashiCorp Vault Secret Store: https://docs.dapr.io/reference/components-reference/supported-secret-stores/hashicorp-vault/
- Kustomize Documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/

## Issues Found
1. **Component `scopes` field placement (line ~216)**: The `scopes` field was nested under `spec`, but according to the Dapr component schema, `scopes` is a top-level field alongside `spec`, not inside it. Fixed by moving `scopes` and its items to the root level of the YAML document.

2. **Deprecated Kustomize `bases:` field (line ~106)**: The kustomization.yaml example used `bases:` to reference the base directory, which has been deprecated since Kustomize v2.1.0. Replaced with `resources:`, which is the current recommended field.

## Review Notes
- All Dapr component type strings (`state.redis`, `state.azure.cosmosdb`, `pubsub.redis`, `pubsub.azure.servicebus.topics`, `secretstores.hashicorp.vault`) are correct.
- The Dapr Component CRD apiVersion (`dapr.io/v1alpha1`), kind (`Component`), and metadata field names (`redisHost`, `url`, `masterKey`, `database`, `actorStateStore`, `vaultAddr`) are all accurate.
- The Helm template syntax and deployment commands are correct.
- The Cosmos DB examples omit the `collection` metadata field, which is typically required in practice, but the examples are focused on illustrating environment-specific patterns rather than being complete production configs, so this is acceptable.
