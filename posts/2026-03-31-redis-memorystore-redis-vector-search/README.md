# How to Use Memorystore Redis Vector Search

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, GCP, Memorystore, Vector Search, AI

Description: Learn how to use Memorystore for Redis with the RediSearch module to store and query vector embeddings for semantic search and AI-powered caching workloads.

---

Memorystore for Redis on GCP supports Redis 7.2 with the RediSearch module, enabling vector similarity search. You can store embedding vectors alongside metadata and run k-nearest neighbor (KNN) queries for semantic search and recommendation features.

## Prerequisites

- Memorystore for Redis with RediSearch enabled (requires importing a compatible RDB or using a cluster that supports modules)
- Note: As of 2026, use Memorystore for Redis Cluster or the Valkey offering for module support. Standard Memorystore for Redis does not support RediSearch modules.

## Storing Vectors with Python

```python
import redis
import numpy as np
from redis.commands.search.field import VectorField, TextField, TagField
from redis.commands.search.indexDefinition import IndexDefinition, IndexType
from redis.commands.search.query import Query

r = redis.Redis(
    host="10.0.0.3",
    port=6379,
    decode_responses=False,  # Needed for binary vector data
)

# Create an index with a vector field
schema = (
    TextField("title"),
    TagField("category"),
    VectorField(
        "embedding",
        "FLAT",
        {
            "TYPE": "FLOAT32",
            "DIM": 384,
            "DISTANCE_METRIC": "COSINE",
        },
    ),
)

r.ft("documents").create_index(
    schema,
    definition=IndexDefinition(prefix=["doc:"], index_type=IndexType.HASH),
)
```

## Indexing Documents with Embeddings

```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("all-MiniLM-L6-v2")

documents = [
    {"id": "1", "title": "Redis caching tutorial", "category": "database"},
    {"id": "2", "title": "GCP networking guide", "category": "cloud"},
    {"id": "3", "title": "Python async programming", "category": "programming"},
]

pipeline = r.pipeline()
for doc in documents:
    embedding = model.encode(doc["title"]).astype(np.float32).tobytes()
    pipeline.hset(
        f"doc:{doc['id']}",
        mapping={
            "title": doc["title"],
            "category": doc["category"],
            "embedding": embedding,
        },
    )
pipeline.execute()
```

## Running a Vector Similarity Search

```python
def semantic_search(query_text: str, top_k: int = 3) -> list:
    query_vector = model.encode(query_text).astype(np.float32).tobytes()
    query = (
        Query(f"*=>[KNN {top_k} @embedding $query_vec AS score]")
        .sort_by("score")
        .return_fields("title", "category", "score")
        .dialect(2)
    )
    results = r.ft("documents").search(
        query, query_params={"query_vec": query_vector}
    )
    return [
        {"title": doc.title, "category": doc.category, "score": float(doc.score)}
        for doc in results.docs
    ]

results = semantic_search("how to set up Redis on Google Cloud")
for result in results:
    print(f"{result['title']} (score: {result['score']:.4f})")
```

## Semantic Caching Pattern

```python
def semantic_cache_lookup(query: str, threshold: float = 0.92) -> str | None:
    query_vec = model.encode(query).astype(np.float32).tobytes()
    q = (
        Query("*=>[KNN 1 @embedding $vec AS score]")
        .return_fields("answer", "score")
        .dialect(2)
    )
    results = r.ft("cache").search(q, query_params={"vec": query_vec})
    if results.docs and float(results.docs[0].score) <= (1 - threshold):
        return results.docs[0].answer
    return None
```

## Summary

Memorystore for Redis supports vector search through the RediSearch module, enabling KNN similarity queries over stored embeddings. Index vector fields using `VectorField` with FLAT or HNSW algorithms, store embeddings as FLOAT32 binary blobs, and query using the KNN syntax. This pattern is ideal for semantic caching of LLM responses, product recommendations, and document retrieval - all with sub-millisecond latency from GCP workloads.
