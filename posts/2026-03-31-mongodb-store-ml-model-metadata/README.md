# How to Store ML Model Metadata in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Machine Learning, Model Registry, MLOps, Python

Description: Learn how to use MongoDB as a model registry to store ML model metadata, hyperparameters, metrics, and artifact references for experiment tracking and governance.

---

## Overview

ML teams need to track which models were trained with which hyperparameters, datasets, and evaluation metrics. MongoDB's flexible document model makes it an excellent model registry - each experiment run is a document with structured metadata and arbitrary nested fields for custom metrics.

## Designing the Model Metadata Schema

```javascript
{
  "_id": ObjectId("..."),
  "name": "customer-churn-classifier",
  "version": "1.4.2",
  "framework": "scikit-learn",
  "algorithm": "GradientBoostingClassifier",
  "status": "production",
  "createdAt": ISODate("2026-03-31T08:00:00Z"),
  "createdBy": "ml-pipeline-v2",
  "hyperparameters": {
    "n_estimators": 200,
    "max_depth": 5,
    "learning_rate": 0.05,
    "subsample": 0.8
  },
  "metrics": {
    "train_accuracy": 0.923,
    "val_accuracy": 0.911,
    "f1_score": 0.897,
    "auc_roc": 0.951
  },
  "dataset": {
    "name": "customer-features-v3",
    "version": "2026-03-01",
    "rows": 500000,
    "s3_path": "s3://ml-datasets/customer-features-v3.parquet"
  },
  "artifact": {
    "type": "pickle",
    "s3_path": "s3://ml-models/customer-churn/1.4.2/model.pkl",
    "size_bytes": 15728640
  },
  "tags": ["production", "churn", "quarterly-release"]
}
```

## Registering a Model After Training

```python
from pymongo import MongoClient
from datetime import datetime, timezone
import sklearn

client = MongoClient(MONGODB_URI)
registry = client["mlops"]["models"]

def register_model(name, version, hyperparams, metrics, dataset_info, s3_path):
    doc = {
        "name": name,
        "version": version,
        "framework": f"scikit-learn {sklearn.__version__}",
        "status": "staging",
        "createdAt": datetime.now(timezone.utc),
        "hyperparameters": hyperparams,
        "metrics": metrics,
        "dataset": dataset_info,
        "artifact": {
            "type": "pickle",
            "s3_path": s3_path,
        },
        "tags": []
    }
    result = registry.insert_one(doc)
    print(f"Registered model {name} v{version} with id {result.inserted_id}")
    return result.inserted_id

register_model(
    name="customer-churn-classifier",
    version="1.4.2",
    hyperparams={"n_estimators": 200, "max_depth": 5},
    metrics={"val_accuracy": 0.911, "f1_score": 0.897},
    dataset_info={"name": "customer-features-v3", "rows": 500000},
    s3_path="s3://ml-models/customer-churn/1.4.2/model.pkl"
)
```

## Querying the Model Registry

```python
# Find the best production model by validation accuracy
best = registry.find_one(
    {"name": "customer-churn-classifier", "status": "production"},
    sort=[("metrics.val_accuracy", -1)]
)

# List all staging models with F1 > 0.85
staging = registry.find({
    "status": "staging",
    "metrics.f1_score": {"$gt": 0.85}
}).sort("createdAt", -1)

# Find all models trained on a specific dataset version
dataset_models = registry.find({
    "dataset.name": "customer-features-v3",
    "dataset.version": "2026-03-01"
})
```

## Promoting a Model to Production

```python
from bson import ObjectId

def promote_to_production(model_id):
    # Demote current production model
    registry.update_many(
        {"name": "customer-churn-classifier", "status": "production"},
        {"$set": {"status": "archived"}}
    )
    # Promote staging model
    registry.update_one(
        {"_id": ObjectId(model_id)},
        {"$set": {"status": "production", "promotedAt": datetime.now(timezone.utc)}}
    )

promote_to_production("660a1234b5c6d7e8f9012345")
```

## Indexing for Fast Lookups

```javascript
db.models.createIndex({ name: 1, status: 1, "metrics.val_accuracy": -1 })
db.models.createIndex({ status: 1, createdAt: -1 })
db.models.createIndex({ tags: 1 })
```

## Best Practices

- Store model artifacts in object storage (S3, GCS) and only reference the path in MongoDB - avoid storing binary model files directly in documents.
- Use a `status` field (`staging`, `production`, `archived`) to manage the model lifecycle without deleting documents.
- Add a text index on `name`, `tags`, and `algorithm` fields to enable full-text search across the registry.

## Summary

MongoDB serves as a flexible model registry for ML experiments, storing hyperparameters, metrics, dataset references, and artifact paths in structured documents. Its aggregation pipeline makes it easy to compare experiments, find top-performing models, and manage promotion workflows.
