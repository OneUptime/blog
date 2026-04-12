# How to Implement Similarity Search with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Similarity Search, Vector Search, Atlas, Python

Description: Learn how to implement vector similarity search in MongoDB Atlas using the $vectorSearch aggregation stage with approximate nearest neighbor (ANN) queries.

---

## Overview

Similarity search finds items most similar to a query based on their vector representation rather than exact keyword matches. MongoDB Atlas Vector Search provides approximate nearest neighbor (ANN) search using the Hierarchical Navigable Small World (HNSW) algorithm, enabling fast similarity queries over millions of vectors.

## Creating the Vector Search Index

Before running similarity queries, create a vector search index in the Atlas UI or via the API.

Via the Atlas CLI:

```bash
atlas clusters search indexes create \
  --clusterName myCluster \
  --file vector-index.json
```

Index definition file `vector-index.json`:

```json
{
  "name": "similarity_index",
  "type": "vectorSearch",
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 384,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "category"
    },
    {
      "type": "filter",
      "path": "isActive"
    },
    {
      "type": "filter",
      "path": "price"
    }
  ]
}
```

## Inserting Items with Embeddings

```python
from pymongo import MongoClient
from sentence_transformers import SentenceTransformer

client = MongoClient(MONGODB_URI)
collection = client["catalog"]["products"]

model = SentenceTransformer("all-MiniLM-L6-v2")

products = [
    {"name": "Wireless Noise-Canceling Headphones", "category": "audio", "price": 299},
    {"name": "Bluetooth Over-Ear Headphones", "category": "audio", "price": 149},
    {"name": "USB-C Wired Earbuds", "category": "audio", "price": 49},
    {"name": "4K Gaming Monitor", "category": "display", "price": 699},
]

for product in products:
    product["embedding"] = model.encode(product["name"]).tolist()
    product["isActive"] = True

collection.insert_many(products)
```

## Basic Similarity Search

```python
def similarity_search(query, top_k=5):
    query_embedding = model.encode(query).tolist()

    pipeline = [
        {
            "$vectorSearch": {
                "index": "similarity_index",
                "path": "embedding",
                "queryVector": query_embedding,
                "numCandidates": top_k * 15,
                "limit": top_k
            }
        },
        {
            "$project": {
                "name": 1,
                "category": 1,
                "price": 1,
                "score": {"$meta": "vectorSearchScore"},
                "_id": 0
            }
        }
    ]

    return list(collection.aggregate(pipeline))

results = similarity_search("wireless headphones for music")
for r in results:
    print(f"{r['score']:.4f} | {r['name']} - ${r['price']}")
```

## Filtered Similarity Search

Combine vector similarity with metadata filters for scoped search:

```python
def filtered_similarity_search(query, category, top_k=5, max_price=None):
    query_embedding = model.encode(query).tolist()

    pre_filter = {"category": {"$eq": category}, "isActive": {"$eq": True}}
    if max_price:
        pre_filter["price"] = {"$lte": max_price}

    pipeline = [
        {
            "$vectorSearch": {
                "index": "similarity_index",
                "path": "embedding",
                "queryVector": query_embedding,
                "numCandidates": top_k * 15,
                "limit": top_k,
                "filter": pre_filter
            }
        },
        {
            "$project": {
                "name": 1, "price": 1,
                "score": {"$meta": "vectorSearchScore"},
                "_id": 0
            }
        }
    ]

    return list(collection.aggregate(pipeline))

results = filtered_similarity_search("noise canceling headphones", "audio", max_price=200)
```

## Similarity Thresholding

Filter out low-confidence results using a score threshold:

```python
def search_with_threshold(query, threshold=0.75, top_k=10):
    results = similarity_search(query, top_k=top_k)
    return [r for r in results if r["score"] >= threshold]
```

## Item-to-Item Similarity (Recommendations)

Find items similar to an existing item:

```python
def find_similar_items(item_id, top_k=5):
    item = collection.find_one({"_id": item_id})
    if not item or "embedding" not in item:
        return []

    pipeline = [
        {
            "$vectorSearch": {
                "index": "similarity_index",
                "path": "embedding",
                "queryVector": item["embedding"],
                "numCandidates": (top_k + 1) * 15,
                "limit": top_k + 1
            }
        },
        {
            "$match": {"_id": {"$ne": item_id}}  # Exclude the source item
        },
        {"$limit": top_k},
        {
            "$project": {
                "name": 1, "price": 1,
                "score": {"$meta": "vectorSearchScore"},
                "_id": 0
            }
        }
    ]

    return list(collection.aggregate(pipeline))
```

## Best Practices

- Set `numCandidates` to at least 20x your `limit` - HNSW examines this many candidates before returning the top-k results. Higher values improve recall at the cost of latency.
- Use `cosine` similarity for normalized embeddings from sentence transformers and `dotProduct` only when embeddings are unit-normalized and you need maximum performance.
- Add filter fields to your index definition before running filtered queries - filtering on un-indexed fields degrades performance.
- Re-embed all documents when upgrading your embedding model since vector spaces are not compatible across models.

## Summary

MongoDB Atlas Vector Search implements similarity search using ANN queries via the `$vectorSearch` aggregation stage. Combine it with metadata filters for scoped search, use score thresholds to remove low-quality matches, and leverage item embeddings directly for recommendation use cases.
