# How to Use MongoDB Go Driver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Go, Driver, Backend Development, Programming

Description: Learn how to use the official MongoDB Go driver to connect, perform CRUD operations, run aggregations, handle transactions, and follow idiomatic Go patterns.

---

## Overview

The official MongoDB Go driver (`go.mongodb.org/mongo-driver`) provides a comprehensive API for interacting with MongoDB from Go applications. It uses context for timeouts and cancellation, and BSON for document encoding/decoding.

```mermaid
flowchart LR
    App[Go Application] --> MC[mongo.Connect]
    MC -->|Connection Pool| MongoDB
    MC --> DB[client.Database]
    DB --> COL[db.Collection]
    COL --> OPS[CRUD + Aggregation + Transactions]
```

## Installation

```bash
go get go.mongodb.org/mongo-driver/v2
```

## Connecting to MongoDB

```go
package main

import (
    "context"
    "fmt"
    "log"
    "os"
    "time"

    "go.mongodb.org/mongo-driver/v2/mongo"
    "go.mongodb.org/mongo-driver/v2/mongo/options"
)

var client *mongo.Client

func init() {
    uri := os.Getenv("MONGODB_URI")
    if uri == "" {
        uri = "mongodb://admin:password@127.0.0.1:27017/?authSource=admin"
    }

    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    var err error
    client, err = mongo.Connect(options.Client().ApplyURI(uri))
    if err != nil {
        log.Fatalf("Failed to connect to MongoDB: %v", err)
    }

    // Verify connection
    if err := client.Ping(ctx, nil); err != nil {
        log.Fatalf("Failed to ping MongoDB: %v", err)
    }

    fmt.Println("Connected to MongoDB")
}

func getCollection(dbName, collName string) *mongo.Collection {
    return client.Database(dbName).Collection(collName)
}

func main() {
    defer func() {
        ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
        defer cancel()
        if err := client.Disconnect(ctx); err != nil {
            log.Printf("Error disconnecting: %v", err)
        }
    }()

    // Application code here
}
```

## Defining Structs with BSON Tags

```go
import (
    "time"
    "go.mongodb.org/mongo-driver/v2/bson"
)

type Order struct {
    ID         bson.ObjectID `bson:"_id,omitempty"`
    CustomerID string             `bson:"customerId"`
    Total      float64            `bson:"total"`
    Status     string             `bson:"status"`
    Items      []OrderItem        `bson:"items"`
    CreatedAt  time.Time          `bson:"createdAt"`
    UpdatedAt  time.Time          `bson:"updatedAt,omitempty"`
}

type OrderItem struct {
    ProductID string  `bson:"productId"`
    Qty       int     `bson:"qty"`
    Price     float64 `bson:"price"`
}
```

## Insert Operations

```go
import (
    "context"
    "time"
    "go.mongodb.org/mongo-driver/v2/bson"
)

func insertOrder() {
    coll := getCollection("myapp", "orders")
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    order := Order{
        ID:         bson.NewObjectID(),
        CustomerID: "c123",
        Total:      99.98,
        Status:     "pending",
        CreatedAt:  time.Now().UTC(),
    }

    result, err := coll.InsertOne(ctx, order)
    if err != nil {
        log.Printf("InsertOne error: %v", err)
        return
    }
    fmt.Println("Inserted:", result.InsertedID)
}

func insertManyOrders() {
    coll := getCollection("myapp", "orders")
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    docs := []interface{}{
        Order{ID: bson.NewObjectID(), CustomerID: "c124", Total: 29.99, Status: "pending", CreatedAt: time.Now().UTC()},
        Order{ID: bson.NewObjectID(), CustomerID: "c125", Total: 149.00, Status: "pending", CreatedAt: time.Now().UTC()},
    }

    result, err := coll.InsertMany(ctx, docs)
    if err != nil {
        log.Printf("InsertMany error: %v", err)
        return
    }
    fmt.Println("Inserted count:", len(result.InsertedIDs))
}
```

## Find Operations

```go
import (
    "go.mongodb.org/mongo-driver/v2/bson"
    "go.mongodb.org/mongo-driver/v2/mongo/options"
)

func findPendingOrders() ([]Order, error) {
    coll := getCollection("myapp", "orders")
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    filter := bson.D{{Key: "status", Value: "pending"}}
    opts := options.Find().
        SetSort(bson.D{{Key: "createdAt", Value: -1}}).
        SetLimit(20).
        SetProjection(bson.D{
            {Key: "customerId", Value: 1},
            {Key: "total", Value: 1},
            {Key: "status", Value: 1},
        })

    cursor, err := coll.Find(ctx, filter, opts)
    if err != nil {
        return nil, err
    }
    defer cursor.Close(ctx)

    var orders []Order
    if err := cursor.All(ctx, &orders); err != nil {
        return nil, err
    }
    return orders, nil
}

func findOneOrder(id bson.ObjectID) (*Order, error) {
    coll := getCollection("myapp", "orders")
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    var order Order
    err := coll.FindOne(ctx, bson.D{{Key: "_id", Value: id}}).Decode(&order)
    if err != nil {
        return nil, err
    }
    return &order, nil
}
```

## Update Operations

```go
func updateOrderStatus(id bson.ObjectID, status string) error {
    coll := getCollection("myapp", "orders")
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    filter := bson.D{{Key: "_id", Value: id}}
    update := bson.D{{Key: "$set", Value: bson.D{
        {Key: "status", Value: status},
        {Key: "updatedAt", Value: time.Now().UTC()},
    }}}

    result, err := coll.UpdateOne(ctx, filter, update)
    if err != nil {
        return err
    }
    fmt.Printf("Matched: %d, Modified: %d\n", result.MatchedCount, result.ModifiedCount)
    return nil
}

func upsertConfig(key, value string) error {
    coll := getCollection("myapp", "config")
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    filter := bson.D{{Key: "_id", Value: key}}
    update := bson.D{
        {Key: "$set", Value: bson.D{{Key: "value", Value: value}}},
        {Key: "$setOnInsert", Value: bson.D{{Key: "createdAt", Value: time.Now().UTC()}}},
    }
    opts := options.UpdateOne().SetUpsert(true)

    _, err := coll.UpdateOne(ctx, filter, update, opts)
    return err
}
```

## Delete Operations

```go
func deleteOrder(id bson.ObjectID) error {
    coll := getCollection("myapp", "orders")
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    result, err := coll.DeleteOne(ctx, bson.D{{Key: "_id", Value: id}})
    if err != nil {
        return err
    }
    fmt.Println("Deleted:", result.DeletedCount)
    return nil
}
```

## Aggregation Pipeline

```go
func getTopCustomers(limit int) ([]bson.M, error) {
    coll := getCollection("myapp", "orders")
    ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
    defer cancel()

    pipeline := mongo.Pipeline{
        {{Key: "$match", Value: bson.D{{Key: "status", Value: "completed"}}}},
        {{Key: "$group", Value: bson.D{
            {Key: "_id", Value: "$customerId"},
            {Key: "totalSpent", Value: bson.D{{Key: "$sum", Value: "$total"}}},
            {Key: "orderCount", Value: bson.D{{Key: "$sum", Value: 1}}},
        }}},
        {{Key: "$sort", Value: bson.D{{Key: "totalSpent", Value: -1}}}},
        {{Key: "$limit", Value: limit}},
    }

    cursor, err := coll.Aggregate(ctx, pipeline)
    if err != nil {
        return nil, err
    }
    defer cursor.Close(ctx)

    var results []bson.M
    if err := cursor.All(ctx, &results); err != nil {
        return nil, err
    }
    return results, nil
}
```

## Transactions

```go
func transferFunds(fromID, toID string, amount float64) error {
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    session, err := client.StartSession()
    if err != nil {
        return err
    }
    defer session.EndSession(ctx)

    _, err = session.WithTransaction(ctx, func(sessCtx context.Context) (interface{}, error) {
        accounts := client.Database("myapp").Collection("accounts")

        // Debit
        res, err := accounts.UpdateOne(sessCtx,
            bson.D{{Key: "_id", Value: fromID}, {Key: "balance", Value: bson.D{{Key: "$gte", Value: amount}}}},
            bson.D{{Key: "$inc", Value: bson.D{{Key: "balance", Value: -amount}}}},
        )
        if err != nil {
            return nil, err
        }
        if res.MatchedCount == 0 {
            return nil, fmt.Errorf("insufficient funds or account not found")
        }

        // Credit
        _, err = accounts.UpdateOne(sessCtx,
            bson.D{{Key: "_id", Value: toID}},
            bson.D{{Key: "$inc", Value: bson.D{{Key: "balance", Value: amount}}}},
        )
        return nil, err
    })

    return err
}
```

## Error Handling

```go
import "go.mongodb.org/mongo-driver/v2/mongo"

func insertWithErrorHandling(doc interface{}) error {
    coll := getCollection("myapp", "users")
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    _, err := coll.InsertOne(ctx, doc)
    if err != nil {
        if mongo.IsDuplicateKeyError(err) {
            return fmt.Errorf("duplicate key: %w", err)
        }
        if mongo.IsTimeout(err) {
            return fmt.Errorf("operation timed out: %w", err)
        }
        return err
    }
    return nil
}
```

## Best Practices

- Use `context.WithTimeout` for all database operations to prevent goroutine leaks.
- Create one `mongo.Client` at startup and close it on shutdown with `client.Disconnect(ctx)`.
- Define structs with `bson` tags for type-safe document mapping.
- Use `mongo.IsDuplicateKeyError(err)` and `mongo.IsTimeout(err)` for error classification.
- Always defer cursor cleanup with `cursor.Close(ctx)`.
- Use `cursor.All(ctx, &results)` for small result sets; iterate with `cursor.Next(ctx)` for large ones.

## Summary

The MongoDB Go driver provides an idiomatic Go API using contexts, structs with BSON tags, and builder-free filter construction with `bson.D`. Create a singleton `mongo.Client`, use `context.WithTimeout` on all operations, and handle errors with `mongo.IsDuplicateKeyError` and `mongo.IsTimeout`. For transactions, use `session.WithTransaction()` for automatic retry handling.
