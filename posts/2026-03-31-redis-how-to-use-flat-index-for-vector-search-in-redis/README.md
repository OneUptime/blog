# How to Use FLAT Index for Vector Search in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, FLAT Index, Vector Search, Exact Search, AI

Description: Learn when and how to use the Redis FLAT index for exact brute-force vector similarity search with 100% recall for smaller datasets.

---

## What Is the FLAT Index

The FLAT index in Redis Stack performs an exhaustive brute-force search across all stored vectors. Every query computes the distance between the query vector and every indexed vector, returning the exact nearest neighbors with 100% recall.

## When to Choose FLAT Over HNSW

Use FLAT when:
- Dataset has fewer than 50,000 vectors
- 100% recall accuracy is required
- Index build time needs to be minimal
- Memory footprint must be predictable

Use HNSW when:
- Dataset has more than 50,000 vectors
- Sub-second latency is required at scale
- Approximate results (98%+ recall) are acceptable

## Creating a FLAT Index

```bash
FT.CREATE idx:exact
  ON HASH
  PREFIX 1 vec:
  SCHEMA
    label TEXT
    category TAG
    embedding VECTOR FLAT 10
      TYPE FLOAT32
      DIM 384
      DISTANCE_METRIC COSINE
      INITIAL_CAP 10000
      BLOCK_SIZE 1024
```

## FLAT Parameters

- `DIM`: Vector dimensionality (must match stored vectors)
- `TYPE`: Data type - FLOAT32 or FLOAT64
- `DISTANCE_METRIC`: COSINE, L2, or IP (inner product)
- `INITIAL_CAP`: Pre-allocated capacity hint (optional)
- `BLOCK_SIZE`: Number of vectors per memory block (default 1024)

## Python Implementation

```python
from redis import Redis
from redis.commands.search.field import TextField, TagField, VectorField
from redis.commands.search.indexDefinition import IndexDefinition, IndexType
from redis.commands.search.query import Query
import numpy as np

r = Redis(decode_responses=False)
VECTOR_DIM = 384

def create_flat_index():
    try:
        r.ft("idx:exact").info()
    except Exception:
        r.ft("idx:exact").create_index(
            [
                TextField("label"),
                TagField("category"),
                VectorField(
                    "embedding",
                    "FLAT",
                    {
                        "TYPE": "FLOAT32",
                        "DIM": VECTOR_DIM,
                        "DISTANCE_METRIC": "COSINE",
                        "INITIAL_CAP": 10000,
                        "BLOCK_SIZE": 1024
                    }
                )
            ],
            definition=IndexDefinition(prefix=["vec:"], index_type=IndexType.HASH)
        )

def add_vector(vec_id: int, label: str, category: str, vector: list[float]):
    r.hset(f"vec:{vec_id}", mapping={
        "label": label.encode(),
        "category": category.encode(),
        "embedding": np.array(vector, dtype=np.float32).tobytes()
    })
```

## Exact KNN Search

```python
def exact_knn_search(query_vector: list[float], top_k: int = 10) -> list:
    query_bytes = np.array(query_vector, dtype=np.float32).tobytes()
    q = Query(f"*=>[KNN {top_k} @embedding $vec AS distance]") \
        .sort_by("distance", asc=True) \
        .return_fields("label", "category", "distance") \
        .paging(0, top_k) \
        .dialect(2)
    results = r.ft("idx:exact").search(q, query_params={"vec": query_bytes})
    return [
        {
            "id": doc.id.replace("vec:", ""),
            "label": doc.label.decode() if isinstance(doc.label, bytes) else doc.label,
            "category": doc.category.decode() if isinstance(doc.category, bytes) else doc.category,
            "distance": float(doc.distance)
        }
        for doc in results.docs
    ]

def exact_search_filtered(query_vector: list[float], category: str,
                          top_k: int = 10) -> list:
    query_bytes = np.array(query_vector, dtype=np.float32).tobytes()
    q = Query(f"(@category:{{{category}}})=>[KNN {top_k} @embedding $vec AS distance]") \
        .sort_by("distance", asc=True) \
        .return_fields("label", "distance") \
        .paging(0, top_k) \
        .dialect(2)
    results = r.ft("idx:exact").search(q, query_params={"vec": query_bytes})
    return [
        {"label": doc.label, "distance": float(doc.distance)}
        for doc in results.docs
    ]
```

## Distance Metrics Compared

```python
# COSINE: angle between vectors, range [0, 2], normalized
# Good for: text similarity, direction matters more than magnitude

# L2: Euclidean distance, range [0, inf)
# Good for: image similarity, coordinate-based data

# IP: Inner product (dot product), higher = more similar
# Good for: when vectors are already normalized (equivalent to COSINE)

def create_l2_index():
    r.ft("idx:l2").create_index(
        [
            TextField("label"),
            VectorField("embedding", "FLAT", {
                "TYPE": "FLOAT32",
                "DIM": VECTOR_DIM,
                "DISTANCE_METRIC": "L2"
            })
        ],
        definition=IndexDefinition(prefix=["l2vec:"], index_type=IndexType.HASH)
    )
```

## Practical Example - Image Similarity

```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("clip-ViT-B-32")

def index_product_images(products: list[dict]):
    for product in products:
        # Get image embedding from CLIP model
        embedding = model.encode(product["image_url"])
        add_vector(
            vec_id=product["id"],
            label=product["name"],
            category=product["category"],
            vector=embedding.tolist()
        )

def find_similar_products(image_url: str, top_k: int = 5) -> list:
    embedding = model.encode(image_url)
    return exact_knn_search(embedding.tolist(), top_k)
```

## Monitoring FLAT Index

```python
def flat_index_stats() -> dict:
    info = r.ft("idx:exact").info()
    return {
        "num_docs": info.get("num_docs"),
        "vector_index_sz_mb": info.get("vector_index_sz_mb"),
        "total_index_memory_mb": info.get("total_index_memory_mb")
    }
```

## Summary

The Redis FLAT index provides exact nearest-neighbor search with 100% recall by computing distances to every stored vector. It is the right choice for datasets under 50k vectors where accuracy is non-negotiable. FLAT is faster to build and simpler to configure than HNSW, with predictable O(n) query complexity.
