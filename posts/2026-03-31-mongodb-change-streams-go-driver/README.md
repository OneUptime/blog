# How to Use Change Streams with the MongoDB Go Driver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Go, Change Stream, Real-Time, Golang

Description: Learn how to watch real-time document changes in MongoDB using Change Streams with the official Go Driver and resume token support.

---

## Overview

MongoDB Change Streams provide a resilient, resumable event stream of insert, update, replace, and delete operations. In the Go Driver, you call `Watch()` on a collection, database, or client to receive a cursor of `ChangeEvent` documents.

## Prerequisites

- MongoDB 3.6+ replica set or sharded cluster.

```bash
go get go.mongodb.org/mongo-driver/v2/mongo
go get go.mongodb.org/mongo-driver/v2/bson
```

## Basic Change Stream

```go
package main

import (
    "context"
    "fmt"
    "log"

    "go.mongodb.org/mongo-driver/v2/bson"
    "go.mongodb.org/mongo-driver/v2/mongo"
    "go.mongodb.org/mongo-driver/v2/mongo/options"
)

type Product struct {
    ID   bson.ObjectID `bson:"_id"`
    Name string        `bson:"name"`
}

func main() {
    client, _ := mongo.Connect(
        options.Client().ApplyURI("mongodb://localhost:27017"))
    defer client.Disconnect(context.Background())

    coll := client.Database("shopdb").Collection("products")

    cs, err := coll.Watch(context.Background(), mongo.Pipeline{})
    if err != nil {
        log.Fatal(err)
    }
    defer cs.Close(context.Background())

    fmt.Println("Watching for changes...")
    for cs.Next(context.Background()) {
        var event bson.M
        if err := cs.Decode(&event); err != nil {
            log.Println("Decode error:", err)
            continue
        }
        fmt.Printf("Operation: %v\n", event["operationType"])
        fmt.Printf("Document:  %v\n", event["fullDocument"])
    }
}
```

## Filtering with a Pipeline

```go
// Watch only insert and update events
pipeline := mongo.Pipeline{
    {{Key: "$match", Value: bson.D{
        {Key: "operationType", Value: bson.D{
            {Key: "$in", Value: bson.A{"insert", "update"}},
        }},
    }}},
}

cs, err := coll.Watch(context.Background(), pipeline)
```

## Receiving Full Documents on Update

```go
opts := options.ChangeStream().
    SetFullDocument(options.UpdateLookup)

cs, err := coll.Watch(context.Background(), mongo.Pipeline{}, opts)
```

Without this option, update events only contain the diff. `UpdateLookup` fetches the current document state from the collection.

## Resume Tokens

Persist the resume token after each event to restart from the last position:

```go
var resumeToken bson.Raw

opts := options.ChangeStream().
    SetFullDocument(options.UpdateLookup)

if resumeToken != nil {
    opts.SetResumeAfter(resumeToken)
}

cs, err := coll.Watch(context.Background(), mongo.Pipeline{}, opts)
if err != nil {
    log.Fatal(err)
}
defer cs.Close(context.Background())

for cs.Next(context.Background()) {
    var event bson.M
    cs.Decode(&event)

    processEvent(event)

    // Persist token after successful processing
    resumeToken = cs.ResumeToken()
    saveTokenToDisk(resumeToken) // your persistence function
}
```

## Long-Running Watcher with Reconnect

```go
func watchProducts(client *mongo.Client) {
    coll := client.Database("shopdb").Collection("products")
    var resumeToken bson.Raw

    for {
        opts := options.ChangeStream().
            SetFullDocument(options.UpdateLookup)
        if resumeToken != nil {
            opts.SetResumeAfter(resumeToken)
        }

        cs, err := coll.Watch(context.Background(), mongo.Pipeline{}, opts)
        if err != nil {
            log.Println("Watch error, retrying:", err)
            time.Sleep(2 * time.Second)
            continue
        }

        for cs.Next(context.Background()) {
            var event bson.M
            if err := cs.Decode(&event); err != nil {
                log.Println("Decode error:", err)
                continue
            }
            handleEvent(event)
            resumeToken = cs.ResumeToken()
        }

        if err := cs.Err(); err != nil {
            log.Println("Stream error:", err)
        }
        cs.Close(context.Background())
    }
}
```

## Watching at Database or Cluster Level

```go
// Watch all collections in the database
dbStream, err := client.Database("shopdb").Watch(
    context.Background(), mongo.Pipeline{})

// Watch the entire deployment
clusterStream, err := client.Watch(
    context.Background(), mongo.Pipeline{})
```

## Typed Event Decoding

```go
type ChangeEvent struct {
    OperationType string  `bson:"operationType"`
    FullDocument  Product `bson:"fullDocument"`
}

for cs.Next(context.Background()) {
    var event ChangeEvent
    if err := cs.Decode(&event); err != nil {
        log.Println(err)
        continue
    }
    fmt.Printf("Op: %s, Product: %s\n",
        event.OperationType, event.FullDocument.Name)
}
```

## Summary

Change Streams in the MongoDB Go Driver are opened with `collection.Watch()`, filtered with pipeline stages, and iterated with `cs.Next()`. Use `SetFullDocument(options.UpdateLookup)` to receive complete documents on updates. Persist `cs.ResumeToken()` after each event to support restarts, and wrap the watcher in a reconnection loop for long-running processes.
