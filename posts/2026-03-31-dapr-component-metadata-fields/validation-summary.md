# Validation Summary: How to Use Dapr Component Metadata Fields

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Component Schema (dapr.io/v1alpha1)
- Dapr State Store - Redis (state.redis)
- Dapr Pub/Sub - Apache Kafka (pubsub.kafka)
- Dapr Secret Stores (secretstores.local.env)
- Kubernetes Secrets
- kubectl CLI

## Sources Consulted
- Dapr Component Schema reference: https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr Component Secrets: https://docs.dapr.io/operations/components/component-secrets/
- Dapr Redis State Store reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr Apache Kafka Pub/Sub reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/
- Dapr Local Environment Variables Secret Store: https://docs.dapr.io/reference/components-reference/supported-secret-stores/envvar-secret-store/

## Issues Found
1. **Environment variable substitution syntax was incorrect.** The post originally showed `${POSTGRES_PASSWORD}` inline substitution in a metadata `value` field, claiming Dapr supports shell-style variable interpolation in component YAML. This is not a documented Dapr feature. Dapr does not natively perform `${VAR}` substitution in component metadata values. **Fix:** Replaced the section with the correct approach using the `secretstores.local.env` secret store component, which reads environment variables and exposes them through the standard `secretKeyRef` mechanism.

## Review Notes
- All Redis state store metadata field names (`redisHost`, `redisDB`, `enableTLS`, `maxRetries`, `redisPassword`) are correct per current official docs.
- All Kafka pub/sub metadata field names (`brokers`, `consumerGroup`, `authType`, `saslUsername`, `saslPassword`, `maxMessageBytes`) are correct per current official docs.
- The `auth.secretStore` placement at the root level (sibling of `spec`) is correct.
- The `secretKeyRef` structure with `name` and `key` fields is correct.
- The claim that metadata values are always strings (even for booleans and integers) is accurate.
- The `kubectl get component` command uses the correct CRD resource name and jsonpath syntax.
