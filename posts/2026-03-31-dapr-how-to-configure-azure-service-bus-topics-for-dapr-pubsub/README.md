# How to Configure Azure Service Bus Topics for Dapr Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure Service Bus, Pub/Sub, Azure, Messaging

Description: Configure Azure Service Bus Topics as the Dapr pub/sub backend with subscriptions, sessions, and managed identity authentication.

---

## Overview

Azure Service Bus Topics provide enterprise messaging with fan-out delivery to multiple subscriptions. When used as a Dapr pub/sub backend, Service Bus brings FIFO ordering, message sessions, duplicate detection, and dead-lettering. This guide covers the full setup from Azure resource creation through Dapr component configuration.

## Create Azure Service Bus Resources

Using Azure CLI:

```bash
# Set variables
RESOURCE_GROUP="rg-dapr-demo"
LOCATION="eastus"
NAMESPACE_NAME="sb-dapr-demo-001"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create Service Bus namespace (Standard or Premium for Topics)
az servicebus namespace create \
  --name $NAMESPACE_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard

# Get connection string
az servicebus namespace authorization-rule keys list \
  --namespace-name $NAMESPACE_NAME \
  --resource-group $RESOURCE_GROUP \
  --name RootManageSharedAccessKey \
  --query primaryConnectionString -o tsv
```

Dapr creates topics and subscriptions automatically when your app runs.

## Dapr Component with Connection String

```yaml
# components/pubsub-servicebus.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
  namespace: default
spec:
  type: pubsub.azure.servicebus.topics
  version: v1
  metadata:
  - name: connectionString
    secretKeyRef:
      name: servicebus-secret
      key: connectionString
  - name: maxConcurrentHandlers
    value: "10"
  - name: maxActiveMessages
    value: "800"
  - name: lockDurationInSec
    value: "60"
  - name: timeoutInSec
    value: "60"
  - name: defaultMessageTimeToLiveInSec
    value: "86400"
  - name: autoDeleteOnIdleInSec
    value: "300"
  - name: disableEntityManagement
    value: "false"
```

Create the Kubernetes secret:

```bash
kubectl create secret generic servicebus-secret \
  --from-literal=connectionString="Endpoint=sb://..." \
  -n default
```

## Using Managed Identity (Recommended for Production)

Avoid storing connection strings by using Azure Managed Identity:

```bash
# Enable system-assigned identity on AKS node pool
az aks update \
  --resource-group $RESOURCE_GROUP \
  --name my-aks-cluster \
  --enable-managed-identity

# Assign Service Bus Data Owner role
NODE_IDENTITY=$(az aks show \
  --resource-group $RESOURCE_GROUP \
  --name my-aks-cluster \
  --query identityProfile.kubeletidentity.objectId -o tsv)

az role assignment create \
  --assignee $NODE_IDENTITY \
  --role "Azure Service Bus Data Owner" \
  --scope "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.ServiceBus/namespaces/$NAMESPACE_NAME"
```

Component without connection string:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.azure.servicebus.topics
  version: v1
  metadata:
  - name: namespaceName
    value: "sb-dapr-demo-001.servicebus.windows.net"
  - name: azureClientId
    value: ""
  - name: maxConcurrentHandlers
    value: "10"
```

## Publisher

```csharp
// OrderPublisher.cs
using Dapr.Client;

public class OrderPublisher
{
    private readonly DaprClient _daprClient;

    public OrderPublisher(DaprClient daprClient)
    {
        _daprClient = daprClient;
    }

    public async Task PublishOrderAsync(Order order)
    {
        // Standard publish
        await _daprClient.PublishEventAsync("pubsub", "orders", order);
    }

    public async Task PublishPriorityOrderAsync(Order order)
    {
        // Publish with custom metadata
        var metadata = new Dictionary<string, string>
        {
            { "priority", "high" },
            { "region", "us-east" }
        };

        await _daprClient.PublishEventAsync(
            "pubsub",
            "orders",
            order,
            metadata
        );
    }
}

public record Order(string OrderId, string ProductId, int Quantity, string UserId);
```

## Subscriber with Multiple Routes

```python
# subscriber/app.py
from flask import Flask, request, jsonify
import logging

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)

@app.route('/dapr/subscribe', methods=['GET'])
def subscribe():
    return jsonify([
        {
            "pubsubname": "pubsub",
            "topic": "orders",
            "route": "/orders/process"
        },
        {
            "pubsubname": "pubsub",
            "topic": "orders-priority",
            "route": "/orders/priority"
        }
    ])

@app.route('/orders/process', methods=['POST'])
def process_order():
    event = request.get_json()
    order = event.get('data', {})
    logging.info(f"Processing order: {order.get('orderId')}")

    try:
        # Business logic
        result = fulfill_order(order)
        return jsonify({"result": result}), 200
    except Exception as e:
        logging.error(f"Failed: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/orders/priority', methods=['POST'])
def process_priority_order():
    event = request.get_json()
    order = event.get('data', {})
    logging.info(f"Priority order: {order.get('orderId')}")
    return jsonify({"expedited": True}), 200

def fulfill_order(order):
    return {"fulfilled": True, "orderId": order.get("orderId")}

if __name__ == '__main__':
    app.run(port=5000)
```

## Dead Letter Handling

Configure Dapr to route failed messages to a dead letter topic by adding `deadLetterTopic` to your subscription:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: orders-subscription
spec:
  pubsubname: pubsub
  topic: orders
  route: /orders/process
  deadLetterTopic: orders-deadletter
```

Then subscribe to the dead letter topic to process failed messages:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: orders-dlq-subscription
spec:
  pubsubname: pubsub
  topic: orders-deadletter
  route: /orders/dead-letter
```

When your subscriber returns an error status, Dapr publishes the message to `orders-deadletter` for later inspection or reprocessing. You can also view Azure Service Bus native dead-letter messages (caused by exceeding max delivery count) using Service Bus Explorer in the Azure Portal.

## Message Sessions for FIFO Ordering

Enable sessions for ordered processing per entity (e.g., per customer):

```yaml
metadata:
- name: requireSessions
  value: "true"
- name: sessionIdleTimeoutInSec
  value: "30"
```

Publish with session ID in your code:

```csharp
var metadata = new Dictionary<string, string>
{
    { "SessionId", order.CustomerId }
};

await _daprClient.PublishEventAsync("pubsub", "orders", order, metadata);
```

## Summary

Azure Service Bus Topics with Dapr provide enterprise-grade pub/sub with fan-out delivery, dead-lettering, and optional FIFO ordering via message sessions. Managed Identity authentication eliminates the need to store connection strings in Kubernetes secrets. The Dapr component's `maxConcurrentHandlers` and `maxActiveMessages` settings let you tune throughput to match your application's processing capacity without changing application code.
