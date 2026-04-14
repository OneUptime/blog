# How to Configure Dapr with Redis State Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Redis, State Store, Configuration, Microservice

Description: Learn how to configure the Dapr Redis state store component, connect to Redis for application state management, and tune settings for production deployments.

---

Redis is the default state store for Dapr and the most commonly used option for development and production. This guide covers setting up the Dapr Redis state store component, from local development to production cluster configurations.

## Prerequisites

- Dapr CLI installed and initialized
- Redis instance (local Docker, Redis Cloud, or Kubernetes)

## Running Redis Locally

```bash
docker run -d -p 6379:6379 --name redis redis:7-alpine
```

## Creating the Redis State Store Component

For local development, Dapr init creates a default Redis component at `~/.dapr/components/statestore.yaml`. To customize it:

```yaml
# components/redis-statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: "localhost:6379"
    - name: redisPassword
      secretKeyRef:
        name: redis-secret
        key: password
    - name: actorStateStore
      value: "true"
    - name: enableTLS
      value: "false"
    - name: maxRetries
      value: "3"
    - name: maxRetryBackoff
      value: "2s"
    - name: ttlInSeconds
      value: "3600"
```

## Connecting to Redis with Authentication

```bash
# Store Redis password as a secret
kubectl create secret generic redis-secret \
  --from-literal=password=your-redis-password
```

For Redis with TLS (Redis Cloud, Upstash, etc.):

```yaml
    - name: redisHost
      value: "redis-endpoint.cloud.redislabs.com:12345"
    - name: redisPassword
      secretKeyRef:
        name: redis-secret
        key: password
    - name: enableTLS
      value: "true"
    - name: clientCert
      secretKeyRef:
        name: redis-tls-secret
        key: cert
    - name: clientKey
      secretKeyRef:
        name: redis-tls-secret
        key: key
```

## Connecting to Redis Sentinel (High Availability)

```yaml
    - name: failover
      value: "true"
    - name: sentinelMasterName
      value: "mymaster"
    - name: redisHost
      value: "sentinel1:26379,sentinel2:26379,sentinel3:26379"
```

## Connecting to Redis Cluster

```yaml
    - name: redisHost
      value: "redis-cluster-node1:6379"
    - name: redisType
      value: "cluster"
```

## Basic State Operations

Once configured, use the state store:

```bash
# Save state
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[{"key": "user:123", "value": {"name": "Alice", "plan": "pro"}}]'

# Get state
curl http://localhost:3500/v1.0/state/statestore/user:123

# Delete state
curl -X DELETE http://localhost:3500/v1.0/state/statestore/user:123
```

## Production Tuning

For high-throughput production deployments:

```yaml
    - name: poolSize
      value: "20"
    - name: maxConnAge
      value: "0"
    - name: idleCheckFrequency
      value: "1m"
    - name: idleTimeout
      value: "5m"
    - name: dialTimeout
      value: "5s"
    - name: readTimeout
      value: "3s"
    - name: writeTimeout
      value: "3s"
```

## Using Redis on Kubernetes with the Bitnami Chart

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami

helm install redis bitnami/redis \
  --set auth.password=your-password \
  --set replica.replicaCount=2 \
  --namespace dapr-apps \
  --create-namespace
```

Update the Dapr component:

```yaml
    - name: redisHost
      value: "redis-master.dapr-apps.svc.cluster.local:6379"
```

## Summary

The Dapr Redis state store is straightforward to configure for both local development and production. Key configuration areas include authentication, TLS for cloud Redis providers, Sentinel or cluster mode for high availability, and connection pool tuning for production throughput. Once configured, all Dapr state management features work transparently through Redis.
