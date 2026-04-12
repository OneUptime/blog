# How to Use Transactions with the MongoDB Go Driver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Go, Transaction, ACID, Golang

Description: Learn how to use multi-document ACID transactions in MongoDB with the Go Driver using sessions and the WithTransaction helper.

---

## Overview

MongoDB supports multi-document ACID transactions on replica sets and sharded clusters (4.0+). The Go Driver provides transactions through `mongo.Session`. Operations executed with a session context participate in the same transaction.

## Prerequisites

- MongoDB 4.0+ replica set or sharded cluster.

```bash
go get go.mongodb.org/mongo-driver/v2/mongo
```

## Manual Transaction (StartTransaction / CommitTransaction)

```go
package main

import (
    "context"
    "fmt"
    "log"

    "go.mongodb.org/mongo-driver/v2/bson"
    "go.mongodb.org/mongo-driver/v2/mongo"
    "go.mongodb.org/mongo-driver/v2/mongo/options"
    "go.mongodb.org/mongo-driver/v2/mongo/writeconcern"
)

func main() {
    client, err := mongo.Connect(
        options.Client().ApplyURI("mongodb://localhost:27017"))
    if err != nil {
        log.Fatal(err)
    }
    defer client.Disconnect(context.Background())

    db := client.Database("shopdb")
    accounts := db.Collection("accounts")

    session, err := client.StartSession()
    if err != nil {
        log.Fatal(err)
    }
    defer session.EndSession(context.Background())

    err = session.StartTransaction(options.Transaction().
        SetWriteConcern(writeconcern.Majority()))
    if err != nil {
        log.Fatal(err)
    }

    sessionCtx := mongo.NewSessionContext(context.Background(), session)

    // Debit account A
    _, err = accounts.UpdateOne(sessionCtx,
        bson.D{{Key: "accountId", Value: "A"}},
        bson.D{{Key: "$inc", Value: bson.D{{Key: "balance", Value: -200}}}},
    )
    if err != nil {
        session.AbortTransaction(context.Background())
        log.Fatal("Aborted:", err)
    }

    // Credit account B
    _, err = accounts.UpdateOne(sessionCtx,
        bson.D{{Key: "accountId", Value: "B"}},
        bson.D{{Key: "$inc", Value: bson.D{{Key: "balance", Value: 200}}}},
    )
    if err != nil {
        session.AbortTransaction(context.Background())
        log.Fatal("Aborted:", err)
    }

    if err = session.CommitTransaction(context.Background()); err != nil {
        log.Fatal("Commit failed:", err)
    }
    fmt.Println("Transfer committed successfully")
}
```

## WithTransaction Helper (Recommended)

`WithTransaction` automatically retries the callback on transient errors and commit failures:

```go
session, err := client.StartSession()
if err != nil {
    log.Fatal(err)
}
defer session.EndSession(context.Background())

_, err = session.WithTransaction(context.Background(),
    func(ctx context.Context) (interface{}, error) {
        // Debit
        _, err := accounts.UpdateOne(ctx,
            bson.D{{Key: "accountId", Value: "A"}},
            bson.D{{Key: "$inc", Value: bson.D{{Key: "balance", Value: -200}}}},
        )
        if err != nil {
            return nil, err
        }

        // Credit
        _, err = accounts.UpdateOne(ctx,
            bson.D{{Key: "accountId", Value: "B"}},
            bson.D{{Key: "$inc", Value: bson.D{{Key: "balance", Value: 200}}}},
        )
        return nil, err
    },
)
if err != nil {
    log.Fatal("Transaction failed:", err)
}
fmt.Println("Transfer successful")
```

## Cross-Collection Transaction

```go
orders := db.Collection("orders")
inventory := db.Collection("inventory")

_, err = session.WithTransaction(context.Background(),
    func(ctx context.Context) (interface{}, error) {
        // Insert order
        _, err := orders.InsertOne(ctx, bson.D{
            {Key: "customerId", Value: "cust-001"},
            {Key: "productId", Value: "prod-001"},
            {Key: "quantity", Value: 2},
            {Key: "status", Value: "CONFIRMED"},
        })
        if err != nil {
            return nil, err
        }

        // Decrement inventory
        res, err := inventory.UpdateOne(ctx,
            bson.D{
                {Key: "productId", Value: "prod-001"},
                {Key: "quantity", Value: bson.D{{Key: "$gte", Value: 2}}},
            },
            bson.D{{Key: "$inc", Value: bson.D{{Key: "quantity", Value: -2}}}},
        )
        if err != nil {
            return nil, err
        }
        if res.ModifiedCount == 0 {
            return nil, fmt.Errorf("insufficient inventory")
        }
        return nil, nil
    },
)
```

## Transaction Options

```go
txOpts := options.Transaction().
    SetWriteConcern(writeconcern.Majority()).
    SetReadConcern(readconcern.Snapshot()).
    SetReadPreference(readpref.Primary())

err := session.StartTransaction(txOpts)
if err != nil {
    log.Fatal(err)
}
```

## Summary

MongoDB Go Driver transactions use a `mongo.Session` to group operations. Pass the session context (obtained from `mongo.NewSessionContext`) to every operation inside the transaction. Use `session.WithTransaction()` for production code as it handles automatic retry of transient errors. Return a non-nil error from the `WithTransaction` callback to trigger an abort, and ensure every operation receives the same session context.
