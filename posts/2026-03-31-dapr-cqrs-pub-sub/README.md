# How to Implement CQRS with Dapr State and Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, CQRS, Pub/Sub, State, Pattern

Description: Learn how to implement Command Query Responsibility Segregation (CQRS) using Dapr's state and pub/sub building blocks for scalable read and write models.

---

## Overview

CQRS (Command Query Responsibility Segregation) separates read and write models. Commands mutate state and publish events; queries read from a denormalized read model optimized for querying. Dapr's state store and pub/sub make this pattern straightforward to implement.

## Architecture

```text
Client --> Command Service --> Dapr State (write model)
                           --> Dapr Pub/Sub --> Event Handler --> Read Model Store
Client --> Query Service  --> Read Model Store
```

## Write Model: Command Service

```go
package main

import (
    "context"
    "encoding/json"
    "net/http"
    dapr "github.com/dapr/go-sdk/client"
)

type CreateProductCommand struct {
    ID    string  `json:"id"`
    Name  string  `json:"name"`
    Price float64 `json:"price"`
    Stock int     `json:"stock"`
}

func handleCreateProduct(w http.ResponseWriter, r *http.Request) {
    var cmd CreateProductCommand
    json.NewDecoder(r.Body).Decode(&cmd)

    client, _ := dapr.NewClient()
    defer client.Close()
    ctx := context.Background()

    // Save to write model
    productBytes, _ := json.Marshal(cmd)
    err := client.SaveState(ctx, "write-store", "product:"+cmd.ID, productBytes, nil)
    if err != nil {
        http.Error(w, err.Error(), 500)
        return
    }

    // Publish event to update read model
    event := map[string]interface{}{
        "eventType": "product.created",
        "productId": cmd.ID,
        "name":      cmd.Name,
        "price":     cmd.Price,
        "stock":     cmd.Stock,
    }
    client.PublishEvent(ctx, "pubsub", "product-events", event)

    w.WriteHeader(http.StatusCreated)
}
```

## Event Handler: Update Read Model

The event handler subscribes to product events and updates a denormalized read model:

```go
type ProductReadModel struct {
    ID          string  `json:"id"`
    Name        string  `json:"name"`
    Price       float64 `json:"price"`
    Stock       int     `json:"stock"`
    DisplayName string  `json:"displayName"`
    PriceLabel  string  `json:"priceLabel"`
}

func handleProductEvent(ctx context.Context, e *common.TopicEvent) (bool, error) {
    var event map[string]interface{}
    json.Unmarshal(e.RawData, &event)

    if event["eventType"] == "product.created" {
        readModel := ProductReadModel{
            ID:          event["productId"].(string),
            Name:        event["name"].(string),
            Price:       event["price"].(float64),
            Stock:       int(event["stock"].(float64)),
            DisplayName: fmt.Sprintf("%s ($%.2f)", event["name"], event["price"]),
            PriceLabel:  fmt.Sprintf("$%.2f", event["price"]),
        }

        client, _ := dapr.NewClient()
        defer client.Close()

        data, _ := json.Marshal(readModel)
        client.SaveState(ctx, "read-store", "product:"+readModel.ID, data, nil)
    }
    return false, nil
}
```

## Read Model: Query Service

```go
func handleGetProduct(w http.ResponseWriter, r *http.Request) {
    productID := r.URL.Query().Get("id")

    client, _ := dapr.NewClient()
    defer client.Close()

    // Query from read store - optimized for reads
    item, err := client.GetState(context.Background(), "read-store", "product:"+productID, nil)
    if err != nil || item.Value == nil {
        http.Error(w, "product not found", 404)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    w.Write(item.Value)
}
```

## Separate State Store Components

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: write-store
spec:
  type: state.postgresql
  version: v1
  metadata:
    - name: connectionString
      value: "host=pg-write user=app dbname=writedb sslmode=disable"
---
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: read-store
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: redis-read:6379
```

## Subscription Configuration

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: product-events-sub
spec:
  pubsubname: pubsub
  topic: product-events
  routes:
    default: /product-events
  scopes:
    - event-handler
```

## Summary

CQRS with Dapr cleanly separates write and read concerns using different state store backends optimized for each purpose. Commands write to a transactional store and publish events via Dapr pub/sub; event handlers project data into a denormalized read model. This pattern scales reads and writes independently while keeping service code focused and simple.
