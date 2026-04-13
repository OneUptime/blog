# How to Map Go Structs to MongoDB Documents with BSON Tags

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Go, BSON, Struct, Serialization

Description: Learn how to control MongoDB document serialization in Go using BSON struct tags, custom codecs, and the bson package conventions.

---

## Overview

The MongoDB Go Driver uses struct tags to control how Go structs serialize to and deserialize from BSON documents. The `bson` package provides tags similar to `json` tags but with MongoDB-specific options like `omitempty`, custom field names, and inline embedding.

## Basic BSON Tags

```go
import "go.mongodb.org/mongo-driver/v2/bson"

type Product struct {
    ID       bson.ObjectID `bson:"_id,omitempty"`
    Name     string        `bson:"name"`
    Price    float64       `bson:"price"`
    Category string        `bson:"category"`
    Stock    int           `bson:"stock"`
    Internal string        `bson:"-"`         // never serialized
    Notes    string        `bson:"notes,omitempty"` // omitted if empty
}
```

Tag options:
- `_id` - maps the field to the `_id` field
- `omitempty` - omits the field from BSON if it has a zero value
- `-` - excludes the field entirely
- A plain name overrides the default (lowercase field name)

## ObjectID Handling

```go
type Order struct {
    ID         bson.ObjectID  `bson:"_id,omitempty"`  // auto-generated
    CustomerID bson.ObjectID  `bson:"customerId"`      // reference
    Amount     float64        `bson:"amount"`
    CreatedAt  time.Time      `bson:"createdAt"`
}

// Creating a new document with auto-generated ID
order := Order{
    ID:         bson.NewObjectID(),
    CustomerID: customerID,
    Amount:     99.99,
    CreatedAt:  time.Now().UTC(),
}
```

## Inline Embedding

Use `bson:"...,inline"` to flatten an embedded struct into the parent document:

```go
type Address struct {
    Street string `bson:"street"`
    City   string `bson:"city"`
    Zip    string `bson:"zip"`
}

type Customer struct {
    ID      bson.ObjectID `bson:"_id,omitempty"`
    Name    string        `bson:"name"`
    Address `bson:",inline"` // fields appear at top level in the document
}
```

Without `inline`, `Address` would be stored as a nested sub-document under an `address` key.

## Nested Documents

Nested structs without `inline` become embedded sub-documents:

```go
type LineItem struct {
    ProductID bson.ObjectID `bson:"productId"`
    Name      string        `bson:"name"`
    Quantity  int           `bson:"quantity"`
    Price     float64       `bson:"price"`
}

type Order struct {
    ID        bson.ObjectID `bson:"_id,omitempty"`
    LineItems []LineItem    `bson:"lineItems"` // array of sub-documents
}
```

## Custom BSON Marshaler

For types that need special serialization (e.g., `decimal.Decimal`), implement `bson.Marshaler` and `bson.Unmarshaler`:

```go
type Money struct {
    Amount   int64  // stored as cents
    Currency string
}

func (m Money) MarshalBSON() ([]byte, error) {
    return bson.Marshal(bson.D{
        {Key: "amount", Value: m.Amount},
        {Key: "currency", Value: m.Currency},
    })
}

func (m *Money) UnmarshalBSON(data []byte) error {
    var raw bson.D
    if err := bson.Unmarshal(data, &raw); err != nil {
        return err
    }
    for _, elem := range raw {
        switch elem.Key {
        case "amount":
            m.Amount = elem.Value.(int64)
        case "currency":
            m.Currency = elem.Value.(string)
        }
    }
    return nil
}
```

## Registry and Codec Registration

Register a custom codec for a type:

```go
import (
    "go.mongodb.org/mongo-driver/v2/bson"
    "reflect"
)

type MyTypeCodec struct{}

// implement bson.ValueEncoder and bson.ValueDecoder interfaces...

registry := bson.NewRegistry()
registry.RegisterTypeEncoder(reflect.TypeOf(MyType{}), &MyTypeCodec{})
registry.RegisterTypeDecoder(reflect.TypeOf(MyType{}), &MyTypeCodec{})

opts := options.Client().
    ApplyURI("mongodb://localhost:27017").
    SetRegistry(registry)
```

## Working with bson.M and bson.D

When you do not have a struct, use `bson.M` (unordered map) or `bson.D` (ordered slice):

```go
// bson.M - like map[string]interface{}
doc := bson.M{
    "name":  "Widget",
    "price": 9.99,
}

// bson.D - ordered document (preserves field order)
filter := bson.D{
    {Key: "category", Value: "electronics"},
    {Key: "price", Value: bson.D{{Key: "$lte", Value: 100}}},
}

// Decode query result into bson.M
var result bson.M
coll.FindOne(ctx, filter).Decode(&result)
fmt.Println(result["name"])
```

## Summary

Go struct BSON tags control field naming, zero-value omission, exclusion, and embedding. Use `bson:"_id,omitempty"` for ID fields, `bson:",inline"` to flatten embedded structs, and `bson:"-"` to skip fields. For custom serialization, implement `bson.Marshaler`/`bson.Unmarshaler` or register a codec. Use `bson.D` for ordered documents (filters, update operators) and `bson.M` for schemaless decoding.
