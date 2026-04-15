# How to Choose Between Azure Cosmos DB and Azure Table Storage for Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure, Cosmos DB, Table Storage, Comparison

Description: Compare Azure Cosmos DB and Azure Table Storage as Dapr state stores, covering performance, cost, consistency, and when to choose each for your microservices.

---

## Overview

Both Azure Cosmos DB and Azure Table Storage can serve as Dapr state stores, and both use Microsoft's Azure infrastructure. However, they differ significantly in performance, consistency model, global distribution, and cost. Choosing the right one depends on your workload requirements and budget constraints.

## Feature Comparison

| Feature | Azure Cosmos DB | Azure Table Storage |
|---------|----------------|---------------------|
| Consistency | 5 tunable levels | Strong (single-region) |
| Latency | Single-digit ms globally | Low, but variable |
| Global distribution | Multi-region, multi-write | Geo-redundant (read-only replicas) |
| Throughput model | RU/s (provisioned or serverless) | Pay-per-operation |
| Max item size | 2MB | 1MB |
| Indexing | Automatic on all fields | Primary key only |
| SLA availability | 99.999% (multi-region) | 99.9% |
| Cost (low volume) | Higher (min RU/s charge) | Very low |

## When to Choose Azure Cosmos DB

Choose Cosmos DB when:
- Your microservices are globally distributed and need low read latency in multiple regions
- You require strong consistency or bounded staleness for critical state
- State items are read or written at high frequency (>1,000 ops/sec)
- You need multi-master writes across regions

Cosmos DB configuration for Dapr:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: cosmos-statestore
  namespace: default
spec:
  type: state.azure.cosmosdb
  version: v1
  metadata:
  - name: url
    value: "https://myaccount.documents.azure.com:443/"
  - name: masterKey
    secretKeyRef:
      name: cosmos-secret
      key: masterKey
  - name: database
    value: "DaprStateDB"
  - name: collection
    value: "StateContainer"
```

## When to Choose Azure Table Storage

Choose Table Storage when:
- Your application has moderate, predictable throughput
- Cost is a primary concern (Table Storage can be 10-20x cheaper)
- You don't need tunable consistency levels across multiple regions
- You already have a storage account and want to avoid provisioning a new Cosmos DB

Table Storage configuration for Dapr:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: table-statestore
  namespace: default
spec:
  type: state.azure.tablestorage
  version: v1
  metadata:
  - name: accountName
    value: "mystorageaccount"
  - name: accountKey
    secretKeyRef:
      name: table-secret
      key: accountKey
  - name: tableName
    value: "DaprState"
```

## Cost Comparison Example

For a service processing 1M state reads and 500K writes per day:

```bash
# Azure Table Storage cost estimate
# Read: 1,000,000 * $0.000000036 = $0.036/day
# Write: 500,000 * $0.000000036 = $0.018/day
# Storage: 1GB * $0.045/month = $0.045/month
# Total: ~$1.67/month

# Azure Cosmos DB (serverless) cost estimate
# 1M reads at 1 RU each: 1,000,000 RU * $0.000000250 = $0.25/day
# 500K writes at 5 RU each: 2,500,000 RU * $0.000000250 = $0.625/day
# Storage: 1GB * $0.25/month = $0.25/month
# Total: ~$26.50/month
```

## Migrating Between the Two

If you start with Table Storage and need to upgrade to Cosmos DB:

```bash
# Export state from Table Storage using Azure Data Factory or azcopy
# Then import into Cosmos DB
# Update the Dapr component manifest and redeploy
```

## Summary

Azure Table Storage is the cost-efficient choice for microservices with moderate, predictable throughput where strong single-region consistency is sufficient. Azure Cosmos DB is the right investment when you need guaranteed low latency globally, strong consistency, or multi-master replication. For most new projects on Azure, start with Table Storage and migrate to Cosmos DB when your scalability or consistency requirements demand it.
