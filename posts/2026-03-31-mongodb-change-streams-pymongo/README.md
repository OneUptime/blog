# How to Use Change Streams with PyMongo

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Python, PyMongo, Change Stream, Event

Description: Learn how to watch MongoDB change streams with PyMongo to react to real-time insert, update, and delete events on collections and databases.

---

## Overview

MongoDB change streams provide a real-time event feed of changes to a collection, database, or entire deployment. PyMongo's `watch()` method opens a change stream and returns a cursor you can iterate to process events as they occur. Change streams require MongoDB 3.6+ with a replica set.

## Basic Change Stream

```python
from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017/?replicaSet=rs0")
col = client["mydb"]["orders"]

with col.watch() as stream:
    for event in stream:
        print("Event:", event["operationType"])
        print("Document:", event.get("fullDocument"))
```

## Filtering Change Events

Use a pipeline to filter which events you receive:

```python
pipeline = [
    {
        "$match": {
            "operationType": {"$in": ["insert", "update"]},
            "fullDocument.status": "completed"
        }
    }
]

with col.watch(pipeline=pipeline, full_document="updateLookup") as stream:
    for event in stream:
        order = event["fullDocument"]
        print(f"Order {order['_id']} completed for ${order['amount']}")
```

## Requesting Full Documents on Update

By default, updates only return changed fields. Use `full_document='updateLookup'` to get the complete document:

```python
with col.watch(full_document="updateLookup") as stream:
    for event in stream:
        if event["operationType"] == "update":
            print("Updated doc:", event["fullDocument"])
            print("Changed fields:", event["updateDescription"]["updatedFields"])
```

## Resuming a Change Stream

Store the `resume_token` to resume after a disconnect:

```python
import json

resume_token = None

try:
    with col.watch(resume_after=resume_token) as stream:
        for event in stream:
            resume_token = stream.resume_token
            # Persist token to disk or cache
            with open("resume_token.json", "w") as f:
                json.dump(resume_token, f, default=str)
            process_event(event)
except Exception as e:
    print("Stream interrupted:", e)
    # Restart with stored token
```

## Watching a Full Database

```python
db = client["mydb"]

with db.watch() as stream:
    for event in stream:
        ns = event["ns"]
        print(f"Change in {ns['db']}.{ns['coll']}: {event['operationType']}")
```

## Running in a Background Thread

```python
import threading

def watch_orders(client):
    col = client["mydb"]["orders"]
    with col.watch(full_document="updateLookup") as stream:
        for event in stream:
            if event["operationType"] == "insert":
                notify_fulfillment(event["fullDocument"])

thread = threading.Thread(target=watch_orders, args=(client,), daemon=True)
thread.start()
```

## Summary

PyMongo's `watch()` method opens a change stream cursor on a collection, database, or client. Filter events with aggregation pipeline stages, request full documents with `full_document="updateLookup"`, and resume interrupted streams using `resume_after` with a stored `resume_token`. Change streams require a replica set and are ideal for building real-time features like notifications, audit logs, and event-driven workflows.
