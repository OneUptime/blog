# How to Use Dapr Go Client

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Go, Client, SDK, Microservice, API

Description: Explore the Dapr Go client API for state management, service invocation, pub/sub, secrets, and configuration with practical code examples.

---

## Overview

The Dapr Go client (`github.com/dapr/go-sdk/client`) is a thin gRPC wrapper that exposes all Dapr building blocks as idiomatic Go methods. This guide walks through the most common operations.

## Creating the Client

```go
import dapr "github.com/dapr/go-sdk/client"

client, err := dapr.NewClient()
if err != nil {
    log.Fatal(err)
}
defer client.Close()
```

## State Management

```go
ctx := context.Background()

// Save state
err = client.SaveState(ctx, "statestore", "user:42",
    []byte(`{"name":"Alice","email":"alice@example.com"}`), nil)

// Get state
item, err := client.GetState(ctx, "statestore", "user:42", nil)
fmt.Println(string(item.Value))

// Delete state
err = client.DeleteState(ctx, "statestore", "user:42", nil)

// Batch save
items := []*dapr.SetStateItem{
    {Key: "a", Value: []byte(`"val-a"`), Etag: nil},
    {Key: "b", Value: []byte(`"val-b"`), Etag: nil},
}
err = client.SaveBulkState(ctx, "statestore", items...)
```

## Service Invocation

```go
// Invoke a method on another service
resp, err := client.InvokeMethod(ctx, "order-service", "orders/123", "GET")
if err != nil {
    log.Fatal(err)
}
fmt.Println(string(resp))

// Invoke with body
content := &dapr.DataContent{
    ContentType: "application/json",
    Data:        []byte(`{"product":"widget","qty":5}`),
}
resp, err = client.InvokeMethodWithContent(ctx, "order-service", "orders", "POST", content)
```

## Publishing Events

```go
err = client.PublishEvent(ctx, "pubsub", "new-orders",
    map[string]any{"id": "ord-1", "product": "widget"})
```

## Secrets

```go
secrets, err := client.GetSecret(ctx, "local-secret-store", "db-password", nil)
if err != nil {
    log.Fatal(err)
}
fmt.Println(secrets["db-password"])

// Get all secrets
all, err := client.GetBulkSecret(ctx, "local-secret-store", nil)
```

## Configuration

```go
// Get a configuration item
items, err := client.GetConfigurationItem(ctx, "config-store", "feature-flag-x")

// Subscribe to configuration changes
subscriptionID, err := client.SubscribeConfigurationItems(ctx, "config-store",
    []string{"feature-flag-x"}, func(id string, items map[string]*dapr.ConfigurationItem) {
        fmt.Printf("Config changed: %v\n", items)
    })

// Unsubscribe when done
err = client.UnsubscribeConfigurationItems(ctx, "config-store", subscriptionID)
```

## Closing the Client

Always defer client close so the underlying gRPC connection is released cleanly:

```go
client, err := dapr.NewClient()
if err != nil {
    log.Fatal(err)
}
defer client.Close()
```

## Summary

The Dapr Go client provides a single, consistent interface for state management, service invocation, pub/sub, secrets, and configuration. By using `defer client.Close()` and passing a context throughout, your Go services integrate with Dapr building blocks while remaining idiomatic and respecting Go's cancellation model.
