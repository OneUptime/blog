# How to Configure Dapr with Azure Event Hubs Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure, Event Hub, Pub/Sub, Messaging, Cloud, Microservice

Description: Configure Dapr pub/sub with Azure Event Hubs, covering connection string setup, consumer groups, and partitioned event streaming at scale.

---

## Overview

Azure Event Hubs is a fully managed, real-time data ingestion service capable of handling millions of events per second. Dapr's Event Hubs pub/sub component lets you publish and subscribe to events through Dapr's standard pub/sub API without writing Event Hubs SDK code directly. Event Hubs topics map to Event Hubs instances within a namespace.

## Prerequisites

- Azure subscription with an Event Hubs namespace
- Dapr CLI installed
- Connection string or Managed Identity configured

## Creating Azure Resources

```bash
# Create resource group
az group create --name dapr-demo --location eastus

# Create Event Hubs namespace
az eventhubs namespace create \
  --name dapr-eventhubs \
  --resource-group dapr-demo \
  --sku Standard

# Create an Event Hub (topic)
az eventhubs eventhub create \
  --name orders \
  --namespace-name dapr-eventhubs \
  --resource-group dapr-demo \
  --partition-count 4

# Get connection string
az eventhubs namespace authorization-rule keys list \
  --resource-group dapr-demo \
  --namespace-name dapr-eventhubs \
  --name RootManageSharedAccessKey \
  --query primaryConnectionString -o tsv
```

## Dapr Component Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: eventhubs-pubsub
  namespace: default
spec:
  type: pubsub.azure.eventhubs
  version: v1
  metadata:
    - name: connectionString
      secretKeyRef:
        name: eventhubs-secret
        key: connectionString
    - name: storageAccountName
      value: "daprcheckpoints"
    - name: storageAccountKey
      secretKeyRef:
        name: storage-secret
        key: accountKey
    - name: storageContainerName
      value: "dapr-checkpoints"
    - name: consumerID
      value: "dapr-consumer-group"
```

Create the Kubernetes secret:

```bash
kubectl create secret generic eventhubs-secret \
  --from-literal=connectionString="Endpoint=sb://dapr-eventhubs.servicebus.windows.net/;..."
```

## Publishing Events

```bash
curl -X POST http://localhost:3500/v1.0/publish/eventhubs-pubsub/orders \
  -H "Content-Type: application/json" \
  -d '{"orderId": "EH-2001", "region": "us-east"}'
```

## Subscribing in Go

```go
package main

import (
    "encoding/json"
    "fmt"
    "net/http"
)

type Order struct {
    OrderID string `json:"orderId"`
    Region  string `json:"region"`
}

func handleOrder(w http.ResponseWriter, r *http.Request) {
    var event map[string]interface{}
    json.NewDecoder(r.Body).Decode(&event)
    data := event["data"].(map[string]interface{})
    fmt.Printf("Order %s from %s\n", data["orderId"], data["region"])
    w.WriteHeader(http.StatusOK)
}

func main() {
    http.HandleFunc("/orders", handleOrder)
    http.ListenAndServe(":6000", nil)
}
```

Declarative subscription:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: orders-sub
spec:
  pubsubname: eventhubs-pubsub
  topic: orders
  route: /orders
```

## Running the Service

```bash
dapr run --app-id order-service \
  --app-port 6000 \
  --resources-path ./components \
  go run main.go
```

## Summary

Dapr's Azure Event Hubs pub/sub component bridges Dapr's standard messaging API with Azure's high-throughput event streaming service. You configure the component with a connection string, a storage account for checkpointing, and a consumer group. Your application code publishes and subscribes using the same Dapr API you would use with Kafka or RabbitMQ, enabling cloud portability.
