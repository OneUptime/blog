# How to Store Training Data in MongoDB for ML Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Machine Learning, Training Data, MLOps, Python

Description: Learn how to store, version, and retrieve ML training data in MongoDB with dataset versioning, label management, and efficient batch export for model training.

---

## Overview

MongoDB is well-suited for storing ML training datasets, especially for NLP and computer vision tasks where labels, annotations, and metadata are document-shaped. This guide covers dataset storage, versioning, label management, and efficient batch retrieval for training pipelines.

## Designing the Training Data Schema

For a text classification dataset:

```javascript
{
  "_id": ObjectId("..."),
  "datasetVersion": "v2.1",
  "split": "train",
  "text": "The product arrived broken and customer service was unhelpful.",
  "label": "negative",
  "labelConfidence": 0.95,
  "annotatedBy": "human",
  "annotatedAt": ISODate("2026-02-15T10:00:00Z"),
  "metadata": {
    "source": "product-reviews",
    "language": "en",
    "wordCount": 9
  }
}
```

## Inserting Training Data in Bulk

```python
from pymongo import MongoClient
from datetime import datetime, timezone

client = MongoClient(MONGODB_URI)
db = client["ml_data"]
training = db["training_samples"]

samples = [
    {
        "datasetVersion": "v2.1",
        "split": "train",
        "text": "Excellent product, fast shipping!",
        "label": "positive",
        "labelConfidence": 0.99,
        "annotatedBy": "human",
        "annotatedAt": datetime.now(timezone.utc),
        "metadata": {"source": "product-reviews", "language": "en"}
    },
    # ... more samples
]

result = training.insert_many(samples)
print(f"Inserted {len(result.inserted_ids)} samples")
```

## Dataset Versioning

Track dataset versions in a separate collection:

```python
datasets = db["datasets"]

datasets.insert_one({
    "name": "sentiment-classifier",
    "version": "v2.1",
    "createdAt": datetime.now(timezone.utc),
    "description": "Added 5000 neutral examples from Q1 reviews",
    "stats": {
        "train": 40000,
        "val": 5000,
        "test": 5000,
        "labels": {"positive": 20000, "negative": 15000, "neutral": 15000}
    },
    "s3_backup": "s3://ml-datasets/sentiment/v2.1/"
})
```

## Querying Samples by Split and Label

```python
# Retrieve all training samples for version v2.1
train_cursor = training.find(
    {"datasetVersion": "v2.1", "split": "train"},
    {"_id": 0, "text": 1, "label": 1}
)

texts = []
labels = []
for doc in train_cursor:
    texts.append(doc["text"])
    labels.append(doc["label"])

print(f"Loaded {len(texts)} training samples")
```

## Batch Loading for Training with PyTorch

```python
from pymongo import MongoClient
import torch
from torch.utils.data import IterableDataset

class MongoDataset(IterableDataset):
    def __init__(self, uri, db_name, collection, version, split, batch_size=100):
        self.uri = uri
        self.db_name = db_name
        self.collection = collection
        self.version = version
        self.split = split
        self.batch_size = batch_size

    def __iter__(self):
        client = MongoClient(self.uri)
        col = client[self.db_name][self.collection]
        cursor = col.find(
            {"datasetVersion": self.version, "split": self.split},
            {"text": 1, "label": 1, "_id": 0},
            batch_size=self.batch_size
        )
        for doc in cursor:
            yield doc["text"], doc["label"]
        client.close()

dataset = MongoDataset(MONGODB_URI, "ml_data", "training_samples", "v2.1", "train")
loader = torch.utils.data.DataLoader(dataset, batch_size=32)
```

## Adding Indexes for Efficient Querying

```javascript
db.training_samples.createIndex({ datasetVersion: 1, split: 1 })
db.training_samples.createIndex({ datasetVersion: 1, label: 1 })
db.training_samples.createIndex({ "metadata.source": 1 })
```

## Computing Label Distribution

```python
pipeline = [
    {"$match": {"datasetVersion": "v2.1", "split": "train"}},
    {"$group": {"_id": "$label", "count": {"$sum": 1}}},
    {"$sort": {"count": -1}}
]
distribution = list(training.aggregate(pipeline))
for item in distribution:
    print(f"{item['_id']}: {item['count']}")
```

## Best Practices

- Store raw training samples in MongoDB and export to Parquet/TFRecord format for actual training to avoid streaming overhead.
- Version your datasets explicitly - never overwrite a dataset version, only append new versions.
- Use the `split` field (`train`, `val`, `test`) rather than separate collections so you can query across splits with one index.
- Create a compound index on `{ datasetVersion: 1, split: 1 }` - this is the most common query pattern and avoids collection scans.

## Summary

MongoDB provides a flexible storage layer for ML training data with built-in support for nested annotations, dataset versioning, and label metadata. Use bulk inserts for ingestion, compound indexes for fast split retrieval, and cursor-based iteration for memory-efficient batch loading during training.
