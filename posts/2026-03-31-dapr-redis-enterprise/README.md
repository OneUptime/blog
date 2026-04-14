# How to Use Dapr with Redis Enterprise

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Redis, Enterprise, State, Pub/Sub

Description: Configure Dapr state management and pub/sub with Redis Enterprise for high-availability, geo-distributed microservice deployments with advanced Redis capabilities.

---

## Overview

Redis Enterprise extends open-source Redis with features like Active-Active geo-distribution, Redis on Flash, and 99.999% uptime SLAs. Dapr's Redis state store and pub/sub components work with Redis Enterprise, giving you Dapr's simple API backed by enterprise-grade Redis infrastructure.

## Prerequisites

- Redis Enterprise cluster deployed (on Kubernetes or cloud)
- Dapr installed
- Redis Enterprise database created with appropriate modules

## Deploying Redis Enterprise on Kubernetes

Install the Redis Enterprise Operator:

```bash
# Add Redis Enterprise repo
kubectl apply -f https://raw.githubusercontent.com/RedisLabs/redis-enterprise-k8s-docs/master/bundle.yaml

# Create a Redis Enterprise Cluster
kubectl apply -f - <<EOF
apiVersion: app.redislabs.com/v1
kind: RedisEnterpriseCluster
metadata:
  name: rec
  namespace: redis-enterprise
spec:
  nodes: 3
  redisEnterpriseImageSpec:
    imagePullPolicy: IfNotPresent
  persistentSpec:
    enabled: true
    storageClassName: standard
    volumeSize: 20Gi
EOF
```

## Creating a Redis Enterprise Database

```yaml
apiVersion: app.redislabs.com/v1alpha1
kind: RedisEnterpriseDatabase
metadata:
  name: dapr-db
  namespace: redis-enterprise
spec:
  redisEnterpriseCluster:
    name: rec
  memorySize: "1GB"
  tlsMode: enabled
  replication: true
  databaseSecretName: dapr-db-secret
  modulesList:
  - name: search
    version: 2.8.0
  - name: timeseries
    version: 1.10.0
```

## Configuring Dapr State Store for Redis Enterprise

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
    value: "dapr-db.redis-enterprise.svc.cluster.local:12345"
  - name: redisPassword
    secretKeyRef:
      name: dapr-db-secret
      key: password
  - name: enableTLS
    value: "true"
  - name: maxRetries
    value: "3"
  - name: maxRetryBackoff
    value: "2s"
  - name: ttlInSeconds
    value: "86400"
```

## Configuring Dapr Pub/Sub for Redis Enterprise

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
    value: "dapr-db.redis-enterprise.svc.cluster.local:12345"
  - name: redisPassword
    secretKeyRef:
      name: dapr-db-secret
      key: password
  - name: enableTLS
    value: "true"
  - name: concurrency
    value: "10"
  - name: processingTimeout
    value: "15s"
```

## Using Redis Enterprise Active-Active for Multi-Region

For geo-distributed Dapr deployments, configure Active-Active replication:

```bash
# Create Active-Active database (CRDB)
crdb-cli crdb create \
  --name dapr-state \
  --memory-size 1g \
  --replication true \
  --instance fqdn=cluster1.example.com,username=admin,password=pass \
  --instance fqdn=cluster2.example.com,username=admin,password=pass
```

Each Dapr cluster connects to its local Redis Enterprise endpoint:

```yaml
  - name: redisHost
    value: "local-redis-enterprise:12345"
```

## Performance Tuning

```yaml
  metadata:
  - name: poolSize
    value: "100"
  - name: dialTimeout
    value: "5s"
  - name: readTimeout
    value: "3s"
  - name: writeTimeout
    value: "3s"
  - name: poolTimeout
    value: "4s"
```

## Summary

Redis Enterprise provides production-grade infrastructure for Dapr's Redis-based state store and pub/sub components. Features like Active-Active geo-distribution, TLS, and high-availability clustering complement Dapr's building blocks for globally distributed, resilient microservice deployments. The Dapr Redis components work with Redis Enterprise using standard Redis protocol, requiring only connection string changes.
