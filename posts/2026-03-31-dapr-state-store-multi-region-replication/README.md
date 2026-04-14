# How to Use Dapr State Store with Multi-Region Replication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Store, Multi-Region, Replication, High Availability

Description: Learn how to configure Dapr state stores with multi-region replication for globally distributed microservices, covering Azure Cosmos DB, AWS DynamoDB, and Redis strategies.

---

## Overview

Multi-region state replication ensures your microservices remain available even during a complete regional outage. Dapr itself does not manage replication - the state store backend provides it. This guide covers how to configure the most common Dapr state backends for multi-region replication and how to configure Dapr to use them correctly.

## Option 1 - Azure Cosmos DB Multi-Region

Cosmos DB's multi-region write capability is the most turnkey option:

```bash
# Enable multi-region writes
az cosmosdb update \
  --name dapr-cosmos-account \
  --resource-group dapr-rg \
  --enable-multiple-write-locations true

# Add a second region
az cosmosdb update \
  --name dapr-cosmos-account \
  --resource-group dapr-rg \
  --locations regionName=eastus failoverPriority=0 isZoneRedundant=true \
              regionName=westeurope failoverPriority=1 isZoneRedundant=true
```

Update the Dapr component to use the global endpoint - Cosmos DB handles routing automatically:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: cosmos-statestore
spec:
  type: state.azure.cosmosdb
  version: v1
  metadata:
  - name: url
    value: "https://dapr-cosmos-account.documents.azure.com:443/"
```

## Option 2 - AWS DynamoDB Global Tables

Enable DynamoDB Global Tables for multi-region active-active replication by adding a replica to an existing table:

```bash
# Add a replica in eu-west-1 (table must already exist in us-east-1)
aws dynamodb update-table \
  --table-name DaprState \
  --replica-updates 'Create={RegionName=eu-west-1}' \
  --region us-east-1
```

Deploy a Dapr instance in each region with the same component configuration pointing to the local region:

```yaml
# In us-east-1
  - name: region
    value: "us-east-1"
  - name: table
    value: "DaprState"
```

```yaml
# In eu-west-1
  - name: region
    value: "eu-west-1"
  - name: table
    value: "DaprState"
```

DynamoDB replicates data across regions asynchronously within seconds.

## Option 3 - Redis Global Replication

For Redis, use Redis Global Datastore (AWS ElastiCache) or Redis Enterprise Active-Active:

```bash
# AWS ElastiCache Global Datastore
aws elasticache create-global-replication-group \
  --global-replication-group-id-suffix dapr-state \
  --primary-replication-group-id dapr-state-us-east
```

Configure Dapr in each region to use the local Redis endpoint:

```yaml
# US East region
  - name: redisHost
    value: "dapr-state.xxxxxx.us-east-1.cache.amazonaws.com:6379"
```

```yaml
# EU West region
  - name: redisHost
    value: "dapr-state.xxxxxx.eu-west-1.cache.amazonaws.com:6379"
```

## Routing Traffic to the Right Region

Use Kubernetes federation or a global load balancer to route Dapr sidecar requests to the nearest regional endpoint:

```yaml
# Kubernetes ExternalDNS with latency-based routing
apiVersion: v1
kind: Service
metadata:
  name: statestore-endpoint
  annotations:
    external-dns.alpha.kubernetes.io/hostname: statestore.myapp.io
    external-dns.alpha.kubernetes.io/set-identifier: statestore-us-east-1
    external-dns.alpha.kubernetes.io/aws-region: us-east-1
```

## Handling Replication Lag

Design your application to handle eventual consistency during replication:

```javascript
import { DaprClient, StateConsistencyEnum } from "@dapr/dapr";

const client = new DaprClient();

// Use strong consistency for reads where cross-region sync is critical
const result = await client.state.get("cosmos-statestore", "critical-config", {
  consistency: StateConsistencyEnum.CONSISTENCY_STRONG
});

// Use eventual consistency for read-heavy, less critical paths
const cachedResult = await client.state.get("cosmos-statestore", "popular-product", {
  consistency: StateConsistencyEnum.CONSISTENCY_EVENTUAL
});
```

## Summary

Multi-region Dapr state store replication is handled entirely by the backend database, not Dapr itself. Azure Cosmos DB multi-master writes offer the simplest setup, while DynamoDB Global Tables and Redis Global Datastore provide AWS-native options. The key is deploying Dapr in each target region pointing to the nearest regional replica for minimal latency.
