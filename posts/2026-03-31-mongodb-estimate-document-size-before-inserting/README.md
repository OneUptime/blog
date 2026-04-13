# How to Estimate Document Size Before Inserting in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Document, Performance, Schema Design, Validation

Description: Learn how to estimate BSON document size before inserting into MongoDB to prevent 16MB limit errors and design more efficient schemas.

---

## Why Estimate Document Size Before Insertion

Inserting a document that exceeds MongoDB's 16MB BSON size limit throws a `BSONObjTooLarge` error. Pre-insertion size estimation lets you validate documents in your application layer, design schemas with safe growth margins, and catch unbounded growth early.

## Method 1: Using BSON.calculateObjectSize in Node.js

The official MongoDB driver provides a BSON utility for calculating size:

```javascript
const { BSON } = require("mongodb");

function estimateDocumentSize(doc) {
  const sizeBytes = BSON.calculateObjectSize(doc);
  const sizeKB = (sizeBytes / 1024).toFixed(1);
  const sizeMB = (sizeBytes / 1024 / 1024).toFixed(3);
  return { sizeBytes, sizeKB, sizeMB };
}

const order = {
  customerId: "cust_123",
  items: Array.from({ length: 100 }, (_, i) => ({
    sku: `ITEM_${i}`,
    qty: Math.floor(Math.random() * 10) + 1,
    price: parseFloat((Math.random() * 100).toFixed(2))
  })),
  createdAt: new Date()
};

const { sizeBytes, sizeMB } = estimateDocumentSize(order);
console.log(`Document size: ${sizeMB} MB`);

const LIMIT_BYTES = 16 * 1024 * 1024;
if (sizeBytes > LIMIT_BYTES * 0.75) {
  throw new Error(`Document is ${sizeMB}MB - approaching 16MB limit`);
}
```

## Method 2: Estimating Size in Python with pymongo

```python
import bson

def estimate_document_size(doc: dict) -> dict:
    """Estimate the BSON size of a document before insertion."""
    encoded = bson.encode(doc)
    size_bytes = len(encoded)
    return {
        "bytes": size_bytes,
        "kb": size_bytes / 1024,
        "mb": size_bytes / 1024 / 1024,
        "pct_of_limit": (size_bytes / (16 * 1024 * 1024)) * 100
    }

# Example
document = {
    "user_id": "u123",
    "tags": ["mongodb", "python", "database"],
    "metadata": {"key": "value" * 100},
    "created_at": __import__("datetime").datetime.utcnow()
}

size = estimate_document_size(document)
print(f"Size: {size['kb']:.1f} KB ({size['pct_of_limit']:.1f}% of 16MB limit)")

# Warn if over 50% of the limit
if size["pct_of_limit"] > 50:
    print("WARNING: Document is using more than 50% of the 16MB limit")
```

## Method 3: Estimating Size in Go

```go
package main

import (
    "fmt"
    "go.mongodb.org/mongo-driver/bson"
)

func estimateDocSize(doc interface{}) (int, error) {
    encoded, err := bson.Marshal(doc)
    if err != nil {
        return 0, err
    }
    return len(encoded), nil
}

type Order struct {
    CustomerID string      `bson:"customerId"`
    Items      []OrderItem `bson:"items"`
}

type OrderItem struct {
    SKU   string  `bson:"sku"`
    Price float64 `bson:"price"`
}

func main() {
    order := Order{
        CustomerID: "cust_123",
        Items:      make([]OrderItem, 1000),
    }

    size, err := estimateDocSize(order)
    if err != nil {
        panic(err)
    }
    fmt.Printf("Estimated size: %d bytes (%.2f MB)\n", size, float64(size)/1024/1024)
}
```

## Method 4: Estimating Maximum Document Growth

For documents that grow over time (e.g., arrays that get appended), estimate the eventual maximum size:

```javascript
function estimateMaxGrowth(currentDoc, itemsPerDay, avgItemSize, daysToGrow) {
  const currentSize = BSON.calculateObjectSize(currentDoc);
  const projectedAdditions = itemsPerDay * avgItemSize * daysToGrow;
  const projectedTotal = currentSize + projectedAdditions;

  const LIMIT = 16 * 1024 * 1024;
  const daysUntilLimit = Math.floor((LIMIT - currentSize) / (itemsPerDay * avgItemSize));

  return {
    currentBytes: currentSize,
    projectedBytes: projectedTotal,
    daysUntilLimit,
    willExceedLimit: projectedTotal > LIMIT
  };
}

const growth = estimateMaxGrowth(
  myDocument,
  10,     // 10 items added per day
  500,    // each item ~500 bytes
  365     // project 1 year
);

if (growth.willExceedLimit) {
  console.log(`Document will exceed 16MB in ~${growth.daysUntilLimit} days`);
}
```

## Method 5: Adding a Pre-Insert Validation Hook

Add size validation at the application service layer:

```javascript
async function safeInsert(collection, document, maxSizeBytes = 14 * 1024 * 1024) {
  const { BSON } = require("mongodb");
  const size = BSON.calculateObjectSize(document);

  if (size > maxSizeBytes) {
    throw new Error(
      `Document size ${(size / 1024 / 1024).toFixed(2)}MB exceeds limit of ${(maxSizeBytes / 1024 / 1024).toFixed(0)}MB`
    );
  }

  return collection.insertOne(document);
}
```

## Summary

Estimating MongoDB document size before insertion uses `BSON.calculateObjectSize` in Node.js, `bson.encode()` in Python, or `bson.Marshal()` in Go to serialize the document and measure its byte length. Set a warning threshold at 75-80% of the 16MB limit to catch growth issues early. For documents that grow over time, model the growth rate and calculate how many days until the limit is hit.
