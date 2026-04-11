# How to Use HNSW Index for Vector Search in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, HNSW, Vector Search, Approximate Nearest Neighbor, AI

Description: Learn how to configure and use the HNSW approximate nearest neighbor index in Redis for fast, scalable vector similarity search.

---

## What Is HNSW

Hierarchical Navigable Small World (HNSW) is a graph-based algorithm for approximate nearest neighbor (ANN) search. It builds a multi-layer graph where each layer is a subset of the previous, enabling logarithmic-time searches. Redis Stack implements HNSW as the default vector index type.

## HNSW vs FLAT Index

- FLAT: Exact brute-force search. 100% recall, O(n) per query. Good for small datasets (under 50k vectors).
- HNSW: Approximate search. Configurable recall/speed tradeoff. O(log n) per query. Scales to millions of vectors.

## Key HNSW Parameters

- `M`: Number of edges per node per layer (default 16). Higher M = better recall, more memory.
- `EF_CONSTRUCTION`: Size of the candidate set during index build (default 200). Higher = better recall at index time, slower indexing.
- `EF_RUNTIME`: Size of the candidate set during search (default 10). Higher = better recall at query time, slower queries.
- `INITIAL_CAP`: Pre-allocated capacity (optional performance hint).

## Creating an HNSW Index

```bash
FT.CREATE idx:embeddings
  ON HASH
  PREFIX 1 emb:
  SCHEMA
    label TEXT
    embedding VECTOR HNSW 12
      TYPE FLOAT32
      DIM 768
      DISTANCE_METRIC COSINE
      M 16
      EF_CONSTRUCTION 200
      EF_RUNTIME 50
```

## Python Setup

```python
from redis import Redis
from redis.commands.search.field import TextField, VectorField
from redis.commands.search.indexDefinition import IndexDefinition, IndexType
from redis.commands.search.query import Query
import numpy as np

r = Redis(decode_responses=False)
VECTOR_DIM = 768

def create_hnsw_index(dim: int = 768, m: int = 16,
                      ef_construction: int = 200, ef_runtime: int = 50):
    try:
        r.ft("idx:embeddings").info()
    except Exception:
        r.ft("idx:embeddings").create_index(
            [
                TextField("label"),
                VectorField(
                    "embedding",
                    "HNSW",
                    {
                        "TYPE": "FLOAT32",
                        "DIM": dim,
                        "DISTANCE_METRIC": "COSINE",
                        "M": m,
                        "EF_CONSTRUCTION": ef_construction,
                        "EF_RUNTIME": ef_runtime
                    }
                )
            ],
            definition=IndexDefinition(prefix=["emb:"], index_type=IndexType.HASH)
        )
```

## Adding Vectors

```python
def add_vector(vec_id: int, label: str, vector: list[float]):
    r.hset(f"emb:{vec_id}", mapping={
        "label": label.encode(),
        "embedding": np.array(vector, dtype=np.float32).tobytes()
    })

def bulk_add_vectors(items: list[dict]):
    pipe = r.pipeline(transaction=False)
    for item in items:
        pipe.hset(f"emb:{item['id']}", mapping={
            "label": item["label"].encode(),
            "embedding": np.array(item["vector"], dtype=np.float32).tobytes()
        })
    pipe.execute()
```

## Querying with KNN

```python
def knn_search(query_vector: list[float], top_k: int = 10) -> list:
    query_bytes = np.array(query_vector, dtype=np.float32).tobytes()
    q = Query(f"*=>[KNN {top_k} @embedding $vec AS distance]") \
        .sort_by("distance", asc=True) \
        .return_fields("label", "distance") \
        .paging(0, top_k) \
        .dialect(2)
    results = r.ft("idx:embeddings").search(q, query_params={"vec": query_bytes})
    return [
        {
            "id": doc.id.replace("emb:", ""),
            "label": doc.label.decode() if isinstance(doc.label, bytes) else doc.label,
            "distance": float(doc.distance)
        }
        for doc in results.docs
    ]
```

## Tuning EF_RUNTIME Per Query

Override EF_RUNTIME at query time without rebuilding the index:

```python
def knn_high_recall(query_vector: list[float], top_k: int = 10) -> list:
    query_bytes = np.array(query_vector, dtype=np.float32).tobytes()
    # Higher EF_RUNTIME = better recall, slower
    q = Query(f"*=>[KNN {top_k} @embedding $vec EF_RUNTIME 200 AS distance]") \
        .sort_by("distance", asc=True) \
        .return_fields("label", "distance") \
        .paging(0, top_k) \
        .dialect(2)
    results = r.ft("idx:embeddings").search(q, query_params={"vec": query_bytes})
    return [{"label": doc.label, "distance": float(doc.distance)} for doc in results.docs]
```

## Memory and Performance Benchmarks

```text
Dataset: 1 million 768-dim float32 vectors

Configuration          | Index time | Memory    | QPS    | Recall@10
M=8,  EF=100           | ~120s      | ~3.1 GB   | 8,000  | 96%
M=16, EF=200           | ~180s      | ~4.8 GB   | 6,000  | 98%
M=32, EF=400           | ~300s      | ~7.2 GB   | 3,500  | 99.5%
FLAT (brute force)     | ~20s       | ~3.0 GB   | 400    | 100%
```

## Checking Index Stats

```bash
FT.INFO idx:embeddings
```

```python
def get_index_info() -> dict:
    info = r.ft("idx:embeddings").info()
    return {
        "num_docs": info.get("num_docs"),
        "indexing": info.get("indexing"),
        "percent_indexed": info.get("percent_indexed")
    }
```

## Summary

HNSW is Redis Stack's recommended vector index for large-scale similarity search, offering logarithmic query time with configurable recall. Tuning `M` and `EF_CONSTRUCTION` at index creation time and `EF_RUNTIME` per query lets you balance recall accuracy against query speed. For datasets under 50k vectors, the FLAT index may be preferable for exact results.
