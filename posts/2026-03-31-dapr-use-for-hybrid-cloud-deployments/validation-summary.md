# Validation Summary: How to Use Dapr for Hybrid Cloud Deployments

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Redis (state store)
- Azure Cosmos DB (state store)
- Apache Kafka (pub/sub)
- HashiCorp Vault (secret store)
- Kubernetes (deployment, kustomize overlays)
- AWS Direct Connect / Site-to-Site VPN (network connectivity)

## Sources Consulted
- Dapr Component spec format: https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr Redis state store component: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr Azure Cosmos DB state store component: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-azure-cosmosdb/
- Dapr Kafka pub/sub component: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/
- Dapr HashiCorp Vault secret store component: https://docs.dapr.io/reference/components-reference/supported-secret-stores/hashicorp-vault/
- Dapr health endpoint API: https://docs.dapr.io/reference/api/health_api/

## Issues Found
1. **Kafka pub/sub `authType` value was incorrect.** The blog post used `authType: "scram"`, which is not a valid value for the Dapr Kafka component. Valid values are `none`, `password`, `oidc`, `mtls`, and `certificate`. For SCRAM-SHA-256 authentication, the correct setting is `authType: "password"` combined with `saslMechanism: "SCRAM-SHA-256"` (which was already correctly specified). Changed `"scram"` to `"password"`.

## Review Notes
- The Dapr component YAML format (`apiVersion: dapr.io/v1alpha1`, `kind: Component`) is correct and current.
- The Redis state store metadata field `redisHost` is correct.
- The Cosmos DB state store fields (`url`, `database`, `collection`, `masterKey`) are correct. The use of `secretKeyRef` for `masterKey` is a recommended practice.
- The Kafka pub/sub `saslMechanism: "SCRAM-SHA-256"` value is correct.
- The Vault secret store `vaultToken` using `secretKeyRef` is valid since Dapr resolves `secretKeyRef` from Kubernetes secrets when loading components, avoiding a circular dependency.
- The Dapr health endpoint path `/v1.0/healthz` is correct.
- The `kubectl apply -k` commands for kustomize overlays are syntactically correct.
