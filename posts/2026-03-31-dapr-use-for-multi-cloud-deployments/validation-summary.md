# Validation Summary: How to Use Dapr for Multi-Cloud Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- AWS DynamoDB (state store)
- Azure CosmosDB (state store)
- GCP Firestore (state store)
- AWS SNS/SQS (pub/sub)
- Azure Service Bus (pub/sub)
- GCP Pub/Sub
- AWS Systems Manager Parameter Store (secret store)
- Azure Key Vault (secret store)
- GCP Secret Manager (secret store)
- Apache Kafka / Confluent Cloud (cross-cloud pub/sub)
- Kubernetes (kubectl, Kustomize)
- GitOps

## Sources Consulted
- Dapr Components Reference: https://docs.dapr.io/reference/components-reference/
- Dapr State Store - AWS DynamoDB: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-dynamodb/
- Dapr State Store - Azure CosmosDB: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-azure-cosmosdb/
- Dapr State Store - GCP Firestore: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-firestore/
- Dapr Pub/Sub - Azure Service Bus Topics: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-azure-servicebus-topics/
- Dapr Secret Store - AWS Parameter Store: https://docs.dapr.io/reference/components-reference/supported-secret-stores/aws-parameter-store/
- Dapr Secret Store - Azure Key Vault: https://docs.dapr.io/reference/components-reference/supported-secret-stores/azure-keyvault/
- Dapr Pub/Sub - Apache Kafka: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/
- Kubernetes kubectl wait documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/

## Issues Found

### 1. Incorrect component type: `pubsub.azure.servicebus`
- **What was wrong:** The multi-cloud strategy diagram listed `pubsub.azure.servicebus` as the Azure pub/sub component type.
- **What was changed:** Corrected to `pubsub.azure.servicebus.topics`. Dapr requires specifying either `.topics` or `.queues` suffix; there is no plain `pubsub.azure.servicebus` type.
- **Why:** Using the incorrect type name would cause a component initialization failure at runtime.

### 2. Incorrect component type: `secretstores.aws.ssm`
- **What was wrong:** The multi-cloud strategy diagram listed `secretstores.aws.ssm` as the AWS secret store component type.
- **What was changed:** Corrected to `secretstores.aws.parameterstore`, which is the official Dapr component type name.
- **Why:** `secretstores.aws.ssm` is not a recognized Dapr component type and would fail to load.

### 3. Incorrect component type: `secretstores.azure.kv`
- **What was wrong:** The multi-cloud strategy diagram listed `secretstores.azure.kv` as the Azure secret store component type.
- **What was changed:** Corrected to `secretstores.azure.keyvault`, which is the official Dapr component type name.
- **Why:** `secretstores.azure.kv` is not a recognized Dapr component type and would fail to load.

### 4. Incorrect Kafka `authType` value
- **What was wrong:** The cross-cloud Kafka pub/sub configuration used `authType: "sasl"`.
- **What was changed:** Corrected to `authType: "password"`. The valid values for Dapr's Kafka `authType` are: `none`, `password`, `mtls`, `oidc`, `oidc_private_key_jwt`, `awsiam`.
- **Why:** `"sasl"` is not a recognized `authType` value and would cause a configuration error.

### 5. Incorrect Kafka `saslMechanism` value
- **What was wrong:** The Kafka configuration used `saslMechanism: "PLAIN"`.
- **What was changed:** Corrected to `saslMechanism: "PLAINTEXT"`. The valid values are `PLAINTEXT`, `SHA-256`, and `SHA-512`.
- **Why:** `"PLAIN"` is the SASL mechanism name in the SASL spec, but Dapr's Kafka component uses `"PLAINTEXT"` as the configuration value.

### 6. Missing required Kafka authentication fields
- **What was wrong:** When using `authType: "password"`, the `saslUsername` and `saslPassword` metadata fields are required but were missing from the Kafka component YAML.
- **What was changed:** Added `saslUsername` and `saslPassword` fields, with `saslPassword` using a `secretKeyRef` for secure handling.
- **Why:** Without these fields, the Kafka connection would fail to authenticate with Confluent Cloud.

### 7. Incorrect `kubectl wait` condition for Pod
- **What was wrong:** The portability test script used `kubectl wait --for=condition=complete pod/portability-test`. The `condition=complete` condition applies to Job resources, not Pods.
- **What was changed:** Corrected to `kubectl wait --for=jsonpath='{.status.phase}'=Succeeded pod/portability-test`, which correctly waits for a Pod to reach the Succeeded phase.
- **Why:** Using `condition=complete` on a Pod would cause `kubectl wait` to hang until the timeout, as Pods don't have a "complete" condition.

### 8. Missing pod cleanup in portability test script
- **What was wrong:** The script iterates over three clouds but never deletes the `portability-test` pod between iterations. The second and third runs would fail because a pod with that name already exists.
- **What was changed:** Added `kubectl delete pod portability-test --ignore-not-found` before each `kubectl run`.
- **Why:** Without cleanup, `kubectl run` would fail with an "already exists" error on the second cloud iteration.

## Review Notes
- The overall architecture and multi-cloud strategy described in the post is sound and well-structured.
- The Dapr Component YAML structure (apiVersion, kind, metadata, spec) is correct throughout.
- The AWS DynamoDB, Azure CosmosDB, and GCP Firestore state store configurations use correct metadata field names.
- The Kustomize overlay approach for managing per-cloud configurations is a well-established pattern.
- The post could benefit from mentioning Dapr's namespace scoping for components in multi-tenant scenarios, but this is not an error.
