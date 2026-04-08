# How to Perform CRUD Operations with the MongoDB Go Driver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Go, CRUD, Driver, Golang

Description: Learn how to insert, find, update, and delete documents in MongoDB using the official Go Driver with practical code examples.

---

## Setup

```bash
go get go.mongodb.org/mongo-driver/v2
```

Document struct:

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

Getting a collection:

```go
client, _ := mongo.Connect(options.Client().ApplyURI("mongodb://localhost:27017"))
coll := client.Database("shopdb").Collection("products")
```

## Create - Insert Documents

```go
ctx := context.Background()

// Insert one
keyboard := Product{Name: "Wireless Keyboard", Price: 49.99, Category: "electronics", Stock: 100}
res, err := coll.InsertOne(ctx, keyboard)
if err != nil {
    log.Fatal(err)
}
fmt.Println("Inserted ID:", res.InsertedID)

// Insert many
docs := []Product{
    {Name: "Mouse", Price: 29.99, Category: "electronics", Stock: 200},
    {Name: "Monitor", Price: 299.99, Category: "electronics", Stock: 50},
}
manyRes, err := coll.InsertMany(ctx, docs)
fmt.Println("Inserted IDs:", manyRes.InsertedIDs)
```

## Read - Find Documents

```go
// Find one
var found Product
err = coll.FindOne(ctx,
    bson.D{{Key: "name", Value: "Wireless Keyboard"}},
).Decode(&found)
if err == mongo.ErrNoDocuments {
    fmt.Println("Not found")
} else if err != nil {
    log.Fatal(err)
}
fmt.Printf("Found: %s at $%.2f\n", found.Name, found.Price)

// Find many with filter
filter := bson.D{
    {Key: "category", Value: "electronics"},
    {Key: "price", Value: bson.D{{Key: "$lte", Value: 100.0}}},
}
cursor, err := coll.Find(ctx, filter)
if err != nil {
    log.Fatal(err)
}
defer cursor.Close(ctx)

var products []Product
if err = cursor.All(ctx, &products); err != nil {
    log.Fatal(err)
}
for _, p := range products {
    fmt.Printf("%s: $%.2f\n", p.Name, p.Price)
}
```

## Sorting, Projection, and Limiting

```go
opts := options.Find().
    SetSort(bson.D{{Key: "price", Value: 1}}).
    SetLimit(10).
    SetProjection(bson.D{
        {Key: "name", Value: 1},
        {Key: "price", Value: 1},
        {Key: "_id", Value: 0},
    })

cursor, err := coll.Find(ctx, bson.D{{Key: "category", Value: "electronics"}}, opts)
```

## Update - Modify Documents

```go
// UpdateOne
filter := bson.D{{Key: "name", Value: "Wireless Keyboard"}}
update := bson.D{
    {Key: "$set", Value: bson.D{{Key: "price", Value: 44.99}}},
    {Key: "$inc", Value: bson.D{{Key: "stock", Value: -1}}},
}
res, err := coll.UpdateOne(ctx, filter, update)
fmt.Println("Modified:", res.ModifiedCount)

// UpdateMany
coll.UpdateMany(ctx,
    bson.D{{Key: "stock", Value: 0}},
    bson.D{{Key: "$set", Value: bson.D{{Key: "category", Value: "out-of-stock"}}}},
)

// Upsert
opts := options.UpdateOne().SetUpsert(true)
coll.UpdateOne(ctx,
    bson.D{{Key: "name", Value: "New Product"}},
    bson.D{
        {Key: "$setOnInsert", Value: bson.D{{Key: "name", Value: "New Product"}}},
        {Key: "$set", Value: bson.D{{Key: "price", Value: 19.99}}},
    },
    opts,
)
```

## FindOneAndUpdate (Atomic)

```go
opts := options.FindOneAndUpdate().
    SetReturnDocument(options.After)

var updated Product
err = coll.FindOneAndUpdate(ctx,
    bson.D{{Key: "name", Value: "Wireless Keyboard"}},
    bson.D{{Key: "$inc", Value: bson.D{{Key: "stock", Value: -1}}}},
    opts,
).Decode(&updated)

fmt.Println("New stock:", updated.Stock)
```

## Delete - Remove Documents

```go
// DeleteOne
delRes, err := coll.DeleteOne(ctx,
    bson.D{{Key: "name", Value: "Wireless Keyboard"}})
fmt.Println("Deleted:", delRes.DeletedCount)

// DeleteMany
coll.DeleteMany(ctx,
    bson.D{{Key: "category", Value: "discontinued"}})
```

## Count and Check Existence

```go
count, _ := coll.CountDocuments(ctx,
    bson.D{{Key: "category", Value: "electronics"}})
fmt.Println("Count:", count)

// Estimated count (fast, uses metadata)
estimated, _ := coll.EstimatedDocumentCount(ctx)
fmt.Println("Estimated total:", estimated)
```

## Summary

The MongoDB Go Driver uses context-aware methods - `InsertOne`, `InsertMany`, `Find`, `FindOne`, `UpdateOne`, `UpdateMany`, `DeleteOne`, `DeleteMany` - on a `*mongo.Collection`. Filters, updates, and projections are expressed as `bson.D` slices. Always decode `cursor.All()` results into a slice and close cursors with `defer cursor.Close(ctx)`. Use `FindOneAndUpdate` for atomic read-modify operations.
