# How to Configure Azure Cosmos DB RU Provisioning for Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure, Cosmos DB, State Store, Request Unit

Description: Learn how to configure Azure Cosmos DB request unit provisioning for Dapr state stores to balance cost and performance for microservice workloads.

---

## Cosmos DB Request Units and Dapr

Azure Cosmos DB charges for operations in Request Units (RUs). Each Dapr state operation - get, set, delete - consumes RUs based on item size and operation type. Provisioning too few RUs causes 429 throttling errors; provisioning too many wastes money. This guide covers calculating the right RU allocation and configuring Dapr to handle throttling gracefully.

## Setting Up the Cosmos DB State Store

Create the Cosmos DB account and database via Azure CLI:

```bash
# Create Cosmos DB account
az cosmosdb create \
  --name dapr-statestore-prod \
  --resource-group myapp-rg \
  --kind GlobalDocumentDB \
  --default-consistency-level Session \
  --locations regionName=eastus failoverPriority=0 isZoneRedundant=true

# Create database with autoscale
az cosmosdb sql database create \
  --account-name dapr-statestore-prod \
  --resource-group myapp-rg \
  --name DaprState \
  --max-throughput 4000

# Create container
az cosmosdb sql container create \
  --account-name dapr-statestore-prod \
  --database-name DaprState \
  --resource-group myapp-rg \
  --name StateStore \
  --partition-key-path "/partitionKey" \
  --max-throughput 4000
```

## Dapr Component Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: cosmos-statestore
  namespace: production
spec:
  type: state.azure.cosmosdb
  version: v1
  metadata:
  - name: url
    value: "https://dapr-statestore-prod.documents.azure.com:443/"
  - name: masterKey
    secretKeyRef:
      name: cosmos-secret
      key: masterKey
  - name: database
    value: "DaprState"
  - name: collection
    value: "StateStore"
  - name: actorStateStore
    value: "true"
  - name: consistencyLevel
    value: "Strong"
```

## Calculating Required RU Provisioning

Estimate RU needs based on your workload:

```python
def estimate_ru_requirements(
    requests_per_second: int,
    avg_item_size_kb: float,
    read_write_ratio: float  # 0.0 = all writes, 1.0 = all reads
) -> dict:
    # Cosmos DB RU estimates:
    # Read: ~1 RU per KB
    # Write: ~5-10 RU per KB
    read_rps = requests_per_second * read_write_ratio
    write_rps = requests_per_second * (1 - read_write_ratio)

    read_ru = read_rps * avg_item_size_kb * 1.0
    write_ru = write_rps * avg_item_size_kb * 7.0  # average write cost

    total_ru = read_ru + write_ru
    # Add 20% buffer for spikes
    provisioned_ru = total_ru * 1.2

    return {
        "estimatedRUPerSecond": round(total_ru),
        "recommendedProvisionedRU": round(provisioned_ru / 100) * 100  # round to nearest 100
    }

# Example: 500 RPS, 2KB items, 70% reads
result = estimate_ru_requirements(500, 2.0, 0.7)
print(result)
# {"estimatedRUPerSecond": 2800, "recommendedProvisionedRU": 3400}
```

## Autoscale vs Manual Provisioning

Use autoscale for variable traffic patterns:

```bash
# Enable autoscale with max 10,000 RU
az cosmosdb sql container throughput update \
  --account-name dapr-statestore-prod \
  --database-name DaprState \
  --name StateStore \
  --resource-group myapp-rg \
  --max-throughput 10000
```

Autoscale scales between 10% and 100% of max RU automatically, so you pay for 1,000 RU minimum with 10,000 RU max.

## Handling 429 Throttling with Dapr Resiliency

Configure retry logic to handle Cosmos DB throttling:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: cosmos-resiliency
spec:
  policies:
    retries:
      cosmosRetry:
        policy: exponential
        duration: 200ms
        maxInterval: 10s
        maxRetries: 5
        matching:
          httpStatusCodes: "429"
  targets:
    components:
      cosmos-statestore:
        outbound:
          retry: cosmosRetry
```

## Summary

Azure Cosmos DB RU provisioning for Dapr requires estimating read/write RU costs based on item size and request rate, then adding a 20% buffer for spikes. Autoscale is the recommended option for most workloads as it eliminates manual tuning while capping costs. Dapr resiliency policies handle 429 throttling responses with exponential backoff, preventing cascading failures when RU limits are temporarily exceeded.
