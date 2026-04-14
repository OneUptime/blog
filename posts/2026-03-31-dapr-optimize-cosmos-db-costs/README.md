# How to Optimize Azure Cosmos DB Costs with Dapr State Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure, Cosmos DB, Cost Optimization, State Store

Description: Learn practical strategies to reduce Azure Cosmos DB costs when using it as a Dapr state store, including serverless mode, autoscale, and key design patterns.

---

## Overview

Azure Cosmos DB is a powerful but potentially expensive Dapr state store. Without proper cost optimization, a growing microservice deployment can accumulate significant Cosmos DB charges. This guide covers the key levers for reducing Cosmos DB costs while maintaining the performance your Dapr applications require.

## Understanding Cosmos DB Billing for Dapr

Cosmos DB charges are driven by:
- **Request Units (RUs)**: 1 RU = 1KB read; writes cost 5-10x more
- **Storage**: $0.25/GB/month
- **Provisioned throughput**: Minimum 400 RU/s per container = ~$23/month

Each Dapr state operation consumes RUs:
- `state.get`: 1 RU per 1KB
- `state.save`: 5+ RUs per 1KB
- `state.delete`: 5+ RUs per 1KB

## Strategy 1 - Use Serverless Mode for Variable Workloads

Switch from provisioned to serverless to pay only for what you use:

```bash
# Create a serverless Cosmos DB account
az cosmosdb create \
  --name dapr-serverless-cosmos \
  --resource-group dapr-rg \
  --capabilities EnableServerless \
  --default-consistency-level Session
```

Serverless is best when:
- Average throughput is under 5,000 RU/s
- Traffic is spiky or unpredictable
- Development or test environments

## Strategy 2 - Use Autoscale for Consistent Production Workloads

For production with consistent load, autoscale is more cost-effective than serverless:

```bash
az cosmosdb sql container create \
  --account-name dapr-cosmos-account \
  --resource-group dapr-rg \
  --database-name DaprStateDB \
  --name StateContainer \
  --partition-key-path /partitionKey \
  --max-throughput 4000
```

Autoscale scales from 10% to 100% of the max automatically, so 4000 max = 400 RU/s minimum.

## Strategy 3 - Optimize Dapr State Key Design

Poorly designed partition keys create hot partitions, requiring higher RU provisioning:

```javascript
// Bad: all state in one partition
await client.state.save("cosmos-statestore", [
  { key: "global-user-1001", value: { ... } }
]);

// Better: include the app ID context
// Dapr automatically prefixes keys with the app ID
// Use specific, distributed keys
await client.state.save("cosmos-statestore", [
  { key: `order-${region}-${orderId}`, value: { ... } }
]);
```

## Strategy 4 - Enable State TTL to Reduce Storage

Use Dapr's TTL to automatically expire old state:

```bash
# Set TTL on state items - Cosmos DB will auto-delete expired items
curl -X POST http://localhost:3500/v1.0/state/cosmos-statestore \
  -H "Content-Type: application/json" \
  -d '[{
    "key": "session-user-5001",
    "value": {"userId": 5001, "token": "abc123"},
    "metadata": {"ttlInSeconds": "86400"}
  }]'
```

Enable TTL on the Cosmos DB container:

```bash
az cosmosdb sql container update \
  --account-name dapr-cosmos-account \
  --resource-group dapr-rg \
  --database-name DaprStateDB \
  --name StateContainer \
  --ttl -1
```

## Strategy 5 - Monitor RU Consumption

Identify which Dapr operations are most expensive:

```bash
# Enable Azure Monitor diagnostics
az monitor diagnostic-settings create \
  --resource YOUR_COSMOS_DB_RESOURCE_ID \
  --name dapr-diag \
  --logs '[{"category": "DataPlaneRequests", "enabled": true}]' \
  --workspace YOUR_LOG_ANALYTICS_WORKSPACE_ID
```

Query the logs to find expensive operations:

```bash
# KQL query in Log Analytics
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.DOCUMENTDB"
| where todouble(requestCharge_s) > 10
| project TimeGenerated, operationType_s, todouble(requestCharge_s), statusCode_s
| order by todouble(requestCharge_s) desc
```

## Summary

Optimizing Cosmos DB costs for Dapr involves selecting the right throughput model (serverless vs autoscale), designing partition-friendly state keys, using TTL to clean up expired state, and monitoring RU consumption to identify expensive operations. These strategies together can reduce Cosmos DB spend by 40-70% without sacrificing the performance advantages that make it a compelling Dapr state backend.
