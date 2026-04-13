# How to Connect to MongoDB from Go Using the Official Driver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Go, Driver, Connection, Golang

Description: Learn how to install the MongoDB Go Driver, create a client, configure options, and establish connections to MongoDB from a Go application.

---

## Overview

The MongoDB Go Driver is the official library for connecting to MongoDB from Go. It provides synchronous and context-aware operations, a BSON codec for struct mapping, and support for all MongoDB features including transactions, change streams, and GridFS.

## Installation

```bash
go get go.mongodb.org/mongo-driver/v2/mongo
```

## Creating a Client

```go
package main

import (
    "context"
    "fmt"
    "log"
    "time"

    "go.mongodb.org/mongo-driver/v2/mongo"
    "go.mongodb.org/mongo-driver/v2/mongo/options"
)

func main() {
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    client, err := mongo.Connect(
        options.Client().ApplyURI("mongodb://localhost:27017"),
    )
    if err != nil {
        log.Fatal("Failed to create client:", err)
    }
    defer client.Disconnect(ctx)

    // Verify connection
    if err := client.Ping(ctx, nil); err != nil {
        log.Fatal("Failed to ping MongoDB:", err)
    }
    fmt.Println("Connected to MongoDB!")
}
```

## Advanced Client Options

```go
opts := options.Client().
    ApplyURI("mongodb://localhost:27017").
    SetMaxPoolSize(100).
    SetMinPoolSize(5).
    SetConnectTimeout(10 * time.Second).
    SetTimeout(30 * time.Second).
    SetServerSelectionTimeout(5 * time.Second).
    SetAuth(options.Credential{
        Username:   "admin",
        Password:   "secret",
        AuthSource: "admin",
    })

client, err := mongo.Connect(opts)
```

## Getting a Database and Collection

```go
// Get database (lazily created)
db := client.Database("shopdb")

// Get collection
products := db.Collection("products")
```

## Defining a Struct with BSON Tags

```go
import "go.mongodb.org/mongo-driver/v2/bson"

type Product struct {
    ID       bson.ObjectID `bson:"_id,omitempty"`
    Name     string        `bson:"name"`
    Price    float64       `bson:"price"`
    Category string        `bson:"category"`
    Stock    int           `bson:"stock"`
}
```

## Atlas Connection

```go
client, err := mongo.Connect(
    options.Client().ApplyURI(
        "mongodb+srv://user:password@cluster0.example.mongodb.net/?retryWrites=true&w=majority",
    ),
)
```

## Connection with TLS

```go
import "crypto/tls"

tlsCfg := &tls.Config{
    InsecureSkipVerify: false, // always validate in production
}

opts := options.Client().
    ApplyURI("mongodb://localhost:27017").
    SetTLSConfig(tlsCfg)
```

## Handling Connection Lifecycle in a Web Server

For a long-running process, create the client once and share it:

```go
package db

import (
    "context"
    "sync"
    "go.mongodb.org/mongo-driver/v2/mongo"
    "go.mongodb.org/mongo-driver/v2/mongo/options"
)

var (
    once   sync.Once
    client *mongo.Client
)

func GetClient() *mongo.Client {
    once.Do(func() {
        var err error
        client, err = mongo.Connect(
            options.Client().ApplyURI("mongodb://localhost:27017"),
        )
        if err != nil {
            panic(err)
        }
    })
    return client
}
```

Always use `sync.Once` or initialize the client in `main()` to ensure a single pool is shared.

## Checking Server Status

```go
result := client.Database("admin").RunCommand(
    context.Background(),
    bson.D{{Key: "serverStatus", Value: 1}},
)

var status bson.M
if err := result.Decode(&status); err != nil {
    log.Fatal(err)
}
fmt.Println("MongoDB version:", status["version"])
```

## Summary

The MongoDB Go Driver connects via `mongo.Connect()` with `options.Client()`. Configure pool size, timeouts, and authentication through the options builder, then call `client.Ping()` to verify connectivity. Create a single `mongo.Client` instance per application, share it via a package-level variable or dependency injection, and always pass `context.Context` to every operation for timeout and cancellation control.
