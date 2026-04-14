# How to Use Dapr State Management with Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Go, State Management, SDK, Microservice, Storage

Description: Use the Dapr Go SDK to save, retrieve, update, and delete state with support for ETags, bulk operations, and state store transactions.

---

## Overview

Dapr state management provides a consistent key-value API across multiple storage backends - Redis, Cosmos DB, PostgreSQL, and more. The Go SDK exposes this through simple, context-aware functions on the `DaprClient` interface.

## Basic CRUD Operations

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "log"

    dapr "github.com/dapr/go-sdk/client"
)

type Product struct {
    ID    string  `json:"id"`
    Name  string  `json:"name"`
    Price float64 `json:"price"`
}

func main() {
    client, err := dapr.NewClient()
    if err != nil {
        log.Fatal(err)
    }
    defer client.Close()

    ctx := context.Background()
    const store = "statestore"

    // Save
    p := Product{ID: "prod-1", Name: "Widget", Price: 9.99}
    data, _ := json.Marshal(p)
    if err := client.SaveState(ctx, store, p.ID, data, nil); err != nil {
        log.Fatal(err)
    }

    // Get
    item, err := client.GetState(ctx, store, "prod-1", nil)
    if err != nil {
        log.Fatal(err)
    }
    fmt.Println(string(item.Value))

    // Delete
    if err := client.DeleteState(ctx, store, "prod-1", nil); err != nil {
        log.Fatal(err)
    }
}
```

## ETag-Based Optimistic Concurrency

```go
// Get with ETag
item, err := client.GetState(ctx, store, "counter", nil)
if err != nil {
    log.Fatal(err)
}

var count int
json.Unmarshal(item.Value, &count)
count++

data, _ := json.Marshal(count)
etag := item.Etag

// Save only if ETag matches
if err := client.SaveStateWithETag(ctx, store, "counter", data, etag, nil); err != nil {
    log.Printf("concurrent update detected: %v", err)
}
```

## Bulk Operations

```go
// Bulk save
items := []*dapr.SetStateItem{
    {Key: "user:1", Value: []byte(`{"name":"Alice"}`)},
    {Key: "user:2", Value: []byte(`{"name":"Bob"}`)},
}
if err := client.SaveBulkState(ctx, store, items...); err != nil {
    log.Fatal(err)
}

// Bulk get
keys := []string{"user:1", "user:2"}
results, err := client.GetBulkState(ctx, store, keys, nil, 0)
for _, r := range results {
    fmt.Printf("%s: %s\n", r.Key, r.Value)
}
```

## Transactional Operations

```go
ops := []*dapr.StateOperation{
    {
        Type: dapr.StateOperationTypeUpsert,
        Item: &dapr.SetStateItem{
            Key:   "order:1",
            Value: []byte(`{"status":"paid"}`),
        },
    },
    {
        Type: dapr.StateOperationTypeDelete,
        Item: &dapr.SetStateItem{Key: "cart:user-1"},
    },
}

if err := client.ExecuteStateTransaction(ctx, store, nil, ops); err != nil {
    log.Fatalf("transaction failed: %v", err)
}
```

## Summary

The Dapr Go state management API covers single-key CRUD, ETag-based optimistic locking, bulk operations, and ACID-like transactions. Because the component name is the only connection to the underlying store, you can switch from Redis to PostgreSQL by updating a YAML file without modifying any Go code.
