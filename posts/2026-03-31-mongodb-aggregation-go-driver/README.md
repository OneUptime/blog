# How to Use Aggregation Pipelines with the MongoDB Go Driver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Go, Aggregation, Pipeline, Golang

Description: Learn how to build and execute MongoDB aggregation pipelines in Go using the official Go Driver with bson.D pipeline stage definitions.

---

## Overview

MongoDB's aggregation framework processes documents through a sequence of pipeline stages. In the Go Driver, pipelines are expressed as a slice of `bson.D` values - one per stage. Results decode into Go structs just like regular queries.

## Setup

```bash
go get go.mongodb.org/mongo-driver/v2/mongo
go get go.mongodb.org/mongo-driver/v2/bson
```

```go
import (
    "context"
    "log"
    "go.mongodb.org/mongo-driver/v2/mongo"
    "go.mongodb.org/mongo-driver/v2/mongo/options"
    "go.mongodb.org/mongo-driver/v2/bson"
)

client, _ := mongo.Connect(options.Client().ApplyURI("mongodb://localhost:27017"))
orders := client.Database("shopdb").Collection("orders")
ctx := context.Background()
```

## Basic Pipeline: Match and Group

```go
type CategorySummary struct {
    Category     string  `bson:"_id"`
    TotalRevenue float64 `bson:"totalRevenue"`
    OrderCount   int     `bson:"orderCount"`
}

pipeline := mongo.Pipeline{
    {{Key: "$match", Value: bson.D{{Key: "status", Value: "completed"}}}},
    {{Key: "$group", Value: bson.D{
        {Key: "_id", Value: "$category"},
        {Key: "totalRevenue", Value: bson.D{{Key: "$sum", Value: "$amount"}}},
        {Key: "orderCount", Value: bson.D{{Key: "$sum", Value: 1}}},
    }}},
    {{Key: "$sort", Value: bson.D{{Key: "totalRevenue", Value: -1}}}},
    {{Key: "$limit", Value: 5}},
}

cursor, err := orders.Aggregate(ctx, pipeline)
if err != nil {
    log.Fatal(err)
}
defer cursor.Close(ctx)

var summaries []CategorySummary
if err = cursor.All(ctx, &summaries); err != nil {
    log.Fatal(err)
}
for _, s := range summaries {
    fmt.Printf("%s: $%.2f (%d orders)\n", s.Category, s.TotalRevenue, s.OrderCount)
}
```

## Unwind Stage

```go
type TagCount struct {
    Tag   string `bson:"_id"`
    Count int    `bson:"count"`
}

pipeline := mongo.Pipeline{
    {{Key: "$unwind", Value: "$tags"}},
    {{Key: "$group", Value: bson.D{
        {Key: "_id", Value: "$tags"},
        {Key: "count", Value: bson.D{{Key: "$sum", Value: 1}}},
    }}},
    {{Key: "$sort", Value: bson.D{{Key: "count", Value: -1}}}},
    {{Key: "$limit", Value: 10}},
}
```

## Project Stage

```go
pipeline := mongo.Pipeline{
    {{Key: "$match", Value: bson.D{{Key: "category", Value: "electronics"}}}},
    {{Key: "$project", Value: bson.D{
        {Key: "name", Value: 1},
        {Key: "price", Value: 1},
        {Key: "priceWithTax", Value: bson.D{
            {Key: "$multiply", Value: bson.A{"$price", 1.2}},
        }},
        {Key: "_id", Value: 0},
    }}},
}
```

## Lookup (Left Outer Join)

```go
type OrderWithCustomer struct {
    OrderID  bson.ObjectID `bson:"_id"`
    Amount   float64       `bson:"amount"`
    Customer bson.M        `bson:"customerInfo"`
}

pipeline := mongo.Pipeline{
    {{Key: "$match", Value: bson.D{{Key: "status", Value: "pending"}}}},
    {{Key: "$lookup", Value: bson.D{
        {Key: "from", Value: "customers"},
        {Key: "localField", Value: "customerId"},
        {Key: "foreignField", Value: "_id"},
        {Key: "as", Value: "customerInfo"},
    }}},
    {{Key: "$unwind", Value: "$customerInfo"}},
}

cursor, _ := orders.Aggregate(ctx, pipeline)
var results []OrderWithCustomer
cursor.All(ctx, &results)
```

## Date-Based Grouping

```go
pipeline := mongo.Pipeline{
    {{Key: "$match", Value: bson.D{{Key: "status", Value: "completed"}}}},
    {{Key: "$group", Value: bson.D{
        {Key: "_id", Value: bson.D{
            {Key: "year", Value: bson.D{{Key: "$year", Value: "$createdAt"}}},
            {Key: "month", Value: bson.D{{Key: "$month", Value: "$createdAt"}}},
        }},
        {Key: "revenue", Value: bson.D{{Key: "$sum", Value: "$amount"}}},
    }}},
    {{Key: "$sort", Value: bson.D{
        {Key: "_id.year", Value: 1},
        {Key: "_id.month", Value: 1},
    }}},
}
```

## Pagination in Aggregation

```go
page := 0
size := 20

pipeline := mongo.Pipeline{
    {{Key: "$match", Value: bson.D{{Key: "status", Value: "active"}}}},
    {{Key: "$sort", Value: bson.D{{Key: "createdAt", Value: -1}}}},
    {{Key: "$skip", Value: int64(page * size)}},
    {{Key: "$limit", Value: int64(size)}},
}
```

## Aggregation with Options

```go
ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
defer cancel()

opts := options.Aggregate().
    SetAllowDiskUse(true)

cursor, err := orders.Aggregate(ctx, pipeline, opts)
```

`SetAllowDiskUse(true)` allows MongoDB to spill to disk for large pipelines that exceed the 100 MB memory limit. To set a timeout for the aggregation operation, use `context.WithTimeout` rather than a driver-level option.

## Summary

MongoDB aggregation pipelines in Go are expressed as `mongo.Pipeline` - a slice of `bson.D` stage documents. Each element corresponds to a pipeline stage (`$match`, `$group`, `$project`, `$lookup`, `$unwind`, `$sort`, `$skip`, `$limit`). Call `collection.Aggregate()` with the pipeline, then decode results with `cursor.All()` into a typed slice. Use `SetAllowDiskUse(true)` in `AggregateOptions` for large dataset processing.
