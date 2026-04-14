# How to Use Dapr for Hybrid Cloud Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Hybrid Cloud, On-Premise, Cloud, Connectivity

Description: Learn how to use Dapr to build services that span on-premises and cloud environments, leveraging component portability and shared backends for seamless hybrid deployments.

---

Hybrid cloud deployments run services across on-premises data centers and public cloud simultaneously. Dapr's component abstraction makes it easier to build applications that work in both environments without environment-specific code.

## Hybrid Cloud Architecture with Dapr

```text
On-Premises (Private DC)           Cloud (AWS/Azure/GCP)
[order-service + Dapr]  <-------> [inventory-service + Dapr]
       |                                    |
       +-----> Shared Kafka (on-prem) <-----+
       |
       +-----> On-prem Redis (state)
                                   [Cloud services use cloud-native components]
```

The key insight: Dapr components are swapped per environment without code changes.

## Component Configuration per Environment

Define different component configurations for on-premises and cloud environments:

On-premises `statestore.yaml`:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: production
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis.onprem.internal:6379"
```

Cloud `statestore.yaml`:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: production
spec:
  type: state.azure.cosmosdb
  version: v1
  metadata:
    - name: url
      value: "https://myaccount.documents.azure.com:443/"
    - name: database
      value: "statedb"
    - name: collection
      value: "orders"
    - name: masterKey
      secretKeyRef:
        name: cosmosdb-secret
        key: key
```

Same application code, same state store name (`statestore`), different backing service.

## Shared Pub/Sub Across Environments

Use a shared Kafka cluster accessible from both environments as the pub/sub backbone:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.kafka
  version: v1
  metadata:
    - name: brokers
      value: "kafka.shared.example.com:9092"
    - name: saslUsername
      secretKeyRef:
        name: kafka-secret
        key: username
    - name: saslPassword
      secretKeyRef:
        name: kafka-secret
        key: password
    - name: saslMechanism
      value: "SCRAM-SHA-256"
    - name: authType
      value: "password"
```

Both on-premises and cloud services use identical pub/sub component configuration.

## Network Connectivity

Dapr service invocation requires network connectivity between environments. Use a VPN or dedicated interconnect:

```bash
# AWS Direct Connect + Site-to-Site VPN to on-premises
# Or: Cloudflare Tunnel / ngrok for testing

# Verify cross-environment connectivity
curl http://inventory-service.cloud.internal:3500/v1.0/healthz
```

## Secret Management Across Environments

Use Vault as a hybrid secret store accessible from both environments:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: secrets
spec:
  type: secretstores.hashicorp.vault
  version: v1
  metadata:
    - name: vaultAddr
      value: "https://vault.shared.example.com:8200"
    - name: vaultToken
      secretKeyRef:
        name: vault-token
        key: token
```

## Deployment Automation

Use GitOps with environment-specific overlays:

```bash
overlays/
  onprem/
    components/    # Redis, on-prem Kafka
  cloud/
    components/    # CosmosDB, cloud Kafka

# Deploy on-premises
kubectl apply -k overlays/onprem/ -n production

# Deploy to cloud
kubectl apply -k overlays/cloud/ -n production
```

## Summary

Dapr enables hybrid cloud deployments by decoupling application code from environment-specific infrastructure through component YAML files. Deploy identical application code in both on-premises and cloud environments, configure different backing services through component overlays, and use shared backends (Kafka, Vault) as the integration layer between environments.
