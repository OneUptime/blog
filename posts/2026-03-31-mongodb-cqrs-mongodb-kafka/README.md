# How to Implement CQRS with MongoDB and Kafka

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Kafka, CQRS, Event-Driven, Architecture

Description: Learn how to implement CQRS using MongoDB as the write store and Kafka to propagate events to read model projections stored in MongoDB or other databases.

---

## Overview

CQRS (Command Query Responsibility Segregation) separates the write model (commands that change state) from the read model (queries optimized for reads). MongoDB serves as the write store where commands are applied; Kafka propagates change events to update one or more read model projections.

## CQRS Architecture with MongoDB and Kafka

```text
Command side (write):
  Client -> Command Handler -> MongoDB (write model) -> Kafka (change events)

Query side (read):
  Client -> Query Handler -> MongoDB read model collection (or Elasticsearch/Redis)

Event flow:
  MongoDB change stream -> MongoDB Kafka Source Connector -> Kafka -> Projection consumer -> Read model
```

## Write Model: Command Handler

The write model processes commands and persists the updated aggregate state to MongoDB:

```javascript
// Express.js command handler
const express = require("express");
const { MongoClient } = require("mongodb");

const app = express();
app.use(express.json());

const client = new MongoClient(process.env.MONGO_URI);
const db = client.db("orders");

// PlaceOrder command
app.post("/commands/orders", async (req, res) => {
  const { customerId, items } = req.body;
  const orderId = require("crypto").randomUUID();
  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  await db.collection("orders").insertOne({
    _id: orderId,
    customerId,
    items,
    total,
    status: "pending",
    createdAt: new Date()
  });

  res.status(201).json({ orderId });
});
```

## Propagate Events via MongoDB Change Streams to Kafka

Use the MongoDB Kafka Source Connector to stream write model changes to Kafka (see the MongoDB Kafka Source Connector post for full setup):

```json
{
  "name": "orders-cqrs-source",
  "config": {
    "connector.class": "com.mongodb.kafka.connect.MongoSourceConnector",
    "connection.uri": "mongodb://user:pass@mongo:27017/?replicaSet=rs0",
    "database": "orders",
    "collection": "orders",
    "topic.prefix": "cqrs",
    "change.stream.full.document": "updateLookup"
  }
}
```

## Read Model Projection Consumer

A Kafka consumer updates the read model in MongoDB whenever a change event arrives:

```python
from kafka import KafkaConsumer
from pymongo import MongoClient
import json

consumer = KafkaConsumer(
  "cqrs.orders.orders",
  bootstrap_servers=["localhost:9092"],
  value_deserializer=lambda m: json.loads(m.decode("utf-8")),
  group_id="order-read-model-projector"
)

mongo = MongoClient("mongodb://localhost:27017")
read_db = mongo["orders_read"]

for message in consumer:
  event = message.value
  op = event.get("operationType")
  doc = event.get("fullDocument", {})

  if op in ("insert", "replace", "update"):
    # Denormalized read model optimized for queries
    read_db.order_summaries.update_one(
      {"_id": doc["_id"]},
      {"$set": {
        "_id": doc["_id"],
        "customerId": doc["customerId"],
        "status": doc["status"],
        "total": doc["total"],
        "itemCount": len(doc.get("items", [])),
        "createdAt": doc["createdAt"]
      }},
      upsert=True
    )
  elif op == "delete":
    deleted_id = event["documentKey"]["_id"]
    read_db.order_summaries.delete_one({"_id": deleted_id})

  print(f"Projected: {op} {doc.get('_id', event.get('documentKey', {}).get('_id'))}")
```

## Query Model: Optimized Read Queries

The read model is optimized for specific query patterns:

```javascript
// Read model: query orders by customer and status
app.get("/queries/orders", async (req, res) => {
  const { customerId, status } = req.query;
  const orders = await db.collection("order_summaries")
    .find({ customerId, ...(status ? { status } : {}) })
    .sort({ createdAt: -1 })
    .project({ _id: 1, status: 1, total: 1, itemCount: 1, createdAt: 1 })
    .toArray();
  res.json(orders);
});
```

Create indexes on the read model collection tailored to query patterns:

```javascript
db.order_summaries.createIndex({ customerId: 1, status: 1, createdAt: -1 });
```

## Handle Eventual Consistency

CQRS with Kafka introduces eventual consistency - the read model lags behind the write model. Communicate this to clients:

```javascript
// Include write model version or timestamp in command response
res.status(201).json({
  orderId,
  message: "Order placed. Read model updates are eventual.",
  writtenAt: new Date().toISOString()
});
```

## Summary

CQRS with MongoDB and Kafka separates writes and reads cleanly: commands write to MongoDB, the MongoDB Kafka Source Connector publishes change events to Kafka, and projection consumers update read model collections optimized for query patterns. This architecture enables independent scaling of read and write paths and supports multiple specialized read models from a single source of truth.
