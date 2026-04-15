# How to Use Azure Cosmos DB Change Feed with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure, Cosmos DB, Change Feed, Event Sourcing, State Store

Description: Use Azure Cosmos DB Change Feed with Dapr to trigger event-driven workflows when state changes, enabling real-time data synchronization.

---

## Overview

Azure Cosmos DB Change Feed provides a persistent, ordered record of changes made to items in a container. When combined with Dapr, it enables event-driven patterns where state changes in the Dapr state store automatically trigger downstream processing workflows.

## Architecture Overview

The integration works in two parts:
1. Dapr writes state to Cosmos DB
2. Azure Functions or a Change Feed processor reads the change feed and publishes events back via Dapr pub/sub

```text
Microservice -> Dapr Sidecar -> Cosmos DB State Store
                                      |
                               Change Feed Processor
                                      |
                               Dapr Pub/Sub -> Other Services
```

## Setting Up the Change Feed Processor

Create an Azure Function triggered by the Cosmos DB change feed:

```javascript
const { DaprClient } = require('@dapr/dapr');

module.exports = async function (context, documents) {
  const client = new DaprClient({
    daprHost: process.env.DAPR_HOST || '127.0.0.1',
    daprPort: process.env.DAPR_HTTP_PORT || '3500'
  });

  for (const doc of documents) {
    // Skip documents without expected properties
    if (!doc._ts) continue;

    const stateKey = doc.id;
    const stateValue = doc.value;

    // Publish change event via Dapr pub/sub
    await client.pubsub.publish('eventhubs-pubsub', 'state-changes', {
      key: stateKey,
      value: stateValue,
      timestamp: doc._ts,
      etag: doc._etag
    });

    context.log(`Published change for key: ${stateKey}`);
  }
};
```

## Azure Function Configuration

```json
{
  "bindings": [
    {
      "type": "cosmosDBTrigger",
      "name": "documents",
      "direction": "in",
      "leaseContainerName": "leases",
      "connection": "CosmosDBConnectionString",
      "databaseName": "daprdb",
      "containerName": "statestore",
      "createLeaseContainerIfNotExists": true,
      "feedPollDelay": 500,
      "startFromBeginning": false
    }
  ]
}
```

## .NET Change Feed Processor

For more control, implement the change feed processor directly in .NET:

```csharp
using Microsoft.Azure.Cosmos;

public class StateSyncProcessor
{
    private readonly CosmosClient _cosmosClient;
    private readonly DaprClient _daprClient;
    private ChangeFeedProcessor _processor;

    public StateSyncProcessor(CosmosClient cosmosClient, DaprClient daprClient)
    {
        _cosmosClient = cosmosClient;
        _daprClient = daprClient;
    }

    public async Task StartAsync()
    {
        var container = _cosmosClient
            .GetDatabase("daprdb")
            .GetContainer("statestore");

        var leaseContainer = _cosmosClient
            .GetDatabase("daprdb")
            .GetContainer("leases");

        _processor = container
            .GetChangeFeedProcessorBuilder<StateItem>(
                processorName: "state-sync-processor",
                onChangesDelegate: HandleChangesAsync)
            .WithInstanceName(Environment.MachineName)
            .WithLeaseContainer(leaseContainer)
            .WithPollInterval(TimeSpan.FromMilliseconds(500))
            .Build();

        await _processor.StartAsync();
    }

    private async Task HandleChangesAsync(
        ChangeFeedProcessorContext context,
        IReadOnlyCollection<StateItem> changes,
        CancellationToken token)
    {
        foreach (var item in changes)
        {
            await _daprClient.PublishEventAsync(
                "pubsub",
                "state-changes",
                new StateChangeEvent
                {
                    Key = item.Id,
                    Value = item.Value,
                    ETag = item.ETag
                });
        }
    }
}
```

## Lease Container Setup

```bash
# Create the lease container for checkpoint tracking
az cosmosdb sql container create \
  --account-name mycosmosaccount \
  --database-name daprdb \
  --name leases \
  --resource-group myResourceGroup \
  --partition-key-path "/id" \
  --throughput 400
```

## Filtering Change Feed Events

```javascript
// Only process changes to order state keys
module.exports = async function (context, documents) {
  const orderChanges = documents.filter(doc =>
    doc.id && doc.id.startsWith('order-service||order:')
  );

  for (const doc of orderChanges) {
    await publishOrderChangeEvent(doc);
  }
};
```

## Summary

Azure Cosmos DB Change Feed with Dapr enables reactive, event-driven architectures where state changes automatically trigger downstream workflows. The change feed provides a durable, ordered log of all inserts and updates, making it ideal for CQRS read model synchronization and audit logging. The lease container tracks processing positions across multiple processor instances for scalable parallel processing.
