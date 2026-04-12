# How to Store and Query Feature Stores in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Feature Store, Machine Learning, MLOps, Python

Description: Learn how to use MongoDB as a feature store for ML models, storing precomputed features per entity with versioning, point-in-time retrieval, and low-latency serving.

---

## Overview

A feature store is a centralized repository for ML features - precomputed values that feed into model inference. MongoDB serves as an effective online feature store due to its low-latency lookups by entity key, flexible document model for heterogeneous feature sets, and built-in TTL for feature expiry.

## Feature Store Schema Design

Store features as documents keyed by entity (user ID, item ID, etc.):

```javascript
{
  "_id": "user:user-12345",
  "entityType": "user",
  "entityId": "user-12345",
  "featureVersion": "v3",
  "computedAt": ISODate("2026-03-31T08:00:00Z"),
  "features": {
    "total_purchases_30d": 12,
    "avg_order_value_30d": 87.50,
    "days_since_last_login": 2,
    "preferred_category": "electronics",
    "churn_risk_score": 0.23,
    "lifetime_value_usd": 1050.00
  }
}
```

## Ingesting Features

Write precomputed features from your batch pipeline:

```python
from pymongo import MongoClient, UpdateOne
from datetime import datetime, timezone

client = MongoClient(MONGODB_URI)
feature_store = client["ml"]["feature_store"]

# Add TTL index - expire features after 7 days
feature_store.create_index("computedAt", expireAfterSeconds=604800)

# Upsert features for a batch of users
def upsert_features(entity_type, entity_features_list):
    operations = []
    for entity_id, features in entity_features_list:
        operations.append(UpdateOne(
            {"_id": f"{entity_type}:{entity_id}"},
            {"$set": {
                "entityType": entity_type,
                "entityId": entity_id,
                "featureVersion": "v3",
                "computedAt": datetime.now(timezone.utc),
                "features": features
            }},
            upsert=True
        ))
    if operations:
        result = feature_store.bulk_write(operations)
        print(f"Upserted {result.upserted_count + result.modified_count} feature records")

upsert_features("user", [
    ("user-12345", {"total_purchases_30d": 12, "churn_risk_score": 0.23}),
    ("user-67890", {"total_purchases_30d": 3, "churn_risk_score": 0.71}),
])
```

## Retrieving Features for Inference

```python
def get_features(entity_type, entity_ids):
    """Batch retrieve features for a list of entity IDs."""
    keys = [f"{entity_type}:{eid}" for eid in entity_ids]
    docs = feature_store.find(
        {"_id": {"$in": keys}},
        {"features": 1, "computedAt": 1}
    )
    return {doc["_id"].split(":")[1]: doc["features"] for doc in docs}

# Use during model serving
features = get_features("user", ["user-12345", "user-67890"])
for user_id, f in features.items():
    print(f"{user_id}: churn_risk={f.get('churn_risk_score')}")
```

## Point-in-Time Feature Retrieval

For training, retrieve features as they existed at a specific point in time. Store feature history in a separate collection:

```python
feature_history = client["ml"]["feature_history"]

def store_feature_snapshot(entity_type, entity_id, features, as_of):
    feature_history.insert_one({
        "entityType": entity_type,
        "entityId": entity_id,
        "asOf": as_of,
        "features": features,
    })

def get_features_as_of(entity_type, entity_id, as_of_date):
    return feature_history.find_one(
        {"entityType": entity_type, "entityId": entity_id, "asOf": {"$lte": as_of_date}},
        sort=[("asOf", -1)]
    )
```

## Indexing for Low-Latency Serving

```javascript
// Primary key lookup is already indexed via _id
// Index for batch retrieval by entity type
db.feature_store.createIndex({ entityType: 1, computedAt: -1 })

// Index feature history for point-in-time queries
db.feature_history.createIndex({ entityType: 1, entityId: 1, asOf: -1 })
```

## Serving Features via REST API

```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/features/{entity_type}/{entity_id}")
def get_entity_features(entity_type: str, entity_id: str):
    doc = feature_store.find_one({"_id": f"{entity_type}:{entity_id}"})
    if not doc:
        return {"error": "Features not found"}
    return {"entityId": entity_id, "features": doc["features"], "computedAt": doc["computedAt"]}
```

## Best Practices

- Use `_id` as the entity key (e.g., `user:12345`) for O(1) point lookups by primary key.
- Use `bulk_write` with `UpdateOne` upserts for batch feature ingestion rather than individual updates.
- Keep the online feature store small (recent features only) using TTL indexes, and store feature history in a separate collection for training.
- Monitor feature freshness by alerting when `computedAt` is older than your expected recompute interval.

## Summary

MongoDB works as an online feature store by storing precomputed features keyed by entity ID with TTL-based expiry. Use `_id`-based lookups for low-latency serving, `bulk_write` upserts for batch ingestion, and a separate history collection for point-in-time training data retrieval.
