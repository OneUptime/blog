# How to Use Dapr with Azure Cache for Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure Cache, Redis, Azure, State Management

Description: Configure Dapr state store and pub/sub components with Azure Cache for Redis, including TLS setup, Microsoft Entra ID authentication, and geo-replication support.

---

## Overview

Azure Cache for Redis is a fully managed Redis service on Azure. Dapr integrates natively with it through the Redis state store and pub/sub components, and supports Microsoft Entra ID (formerly Azure AD) authentication for passwordless access.

## Basic Configuration with Access Key

Create a Dapr state store component for Azure Cache for Redis:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: default
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: my-cache.redis.cache.windows.net:6380
  - name: redisPassword
    secretKeyRef:
      name: azure-redis-secret
      key: accessKey
  - name: enableTLS
    value: "true"
  - name: redisMaxRetries
    value: "3"
```

Create the secret:

```bash
kubectl create secret generic azure-redis-secret \
  --from-literal=accessKey="your-azure-redis-primary-key"
```

## Entra ID Authentication (Passwordless)

Configure Dapr to authenticate with Azure Cache using Managed Identity:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: default
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: my-cache.redis.cache.windows.net:6380
  - name: enableTLS
    value: "true"
  - name: useEntraID
    value: "true"
  auth:
    secretStore: azurekeyvault
```

Enable the Managed Identity on your AKS node pool and assign the `Data Owner` access policy for Redis data operations.

## Pub/Sub with Azure Cache for Redis

Configure Redis Streams pub/sub using Azure Cache:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
  namespace: default
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: my-cache.redis.cache.windows.net:6380
  - name: redisPassword
    secretKeyRef:
      name: azure-redis-secret
      key: accessKey
  - name: enableTLS
    value: "true"
  - name: consumerID
    value: "{uuid}"
  - name: maxLenApprox
    value: "10000"
```

## Using Premium Tier with Geo-Replication

For geo-distributed Dapr deployments, use the geo-replicated endpoint:

```yaml
metadata:
- name: redisHost
  value: my-cache-geo.redis.cache.windows.net:6380
- name: enableTLS
  value: "true"
# Geo-replica is read-only - use only for read state operations
```

## Testing the Connection

Verify the Azure Cache connection from your Dapr service:

```bash
# Save test state
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[{"key":"azure-test","value":"hello-from-dapr"}]'

# Read it back
curl http://localhost:3500/v1.0/state/statestore/azure-test

# Check Dapr sidecar metadata for loaded components
curl http://localhost:3500/v1.0/metadata | jq '.components'
```

## Actor State with Azure Cache

Mark the Azure Cache component as an actor state store:

```yaml
spec:
  metadata:
  - name: actorStateStore
    value: "true"
```

## Summary

Azure Cache for Redis integrates with Dapr using the standard Redis state store and pub/sub components with TLS enabled and port 6380. For production AKS deployments, prefer Microsoft Entra ID authentication over access keys to eliminate credential rotation overhead. Use the Premium tier for higher throughput, clustering, and geo-replication capabilities needed by production Dapr workloads.
