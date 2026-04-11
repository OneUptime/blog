# How to Combine Vector Search with Text Filters in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Vector Search, Hybrid Search, RediSearch, Filtering

Description: Learn how to combine semantic vector search with TAG, TEXT, and NUMERIC filters in Redis for hybrid search that is both semantically relevant and precisely filtered.

---

## Why Hybrid Search

Pure vector similarity finds semantically similar content but cannot enforce hard constraints like "only show in-stock products" or "only documents from the last 30 days." Combining vector KNN with traditional filters gives you the best of both worlds.

## Index Schema for Hybrid Search

```bash
FT.CREATE idx:hybrid
  ON HASH
  PREFIX 1 item:
  SCHEMA
    title TEXT WEIGHT 2.0
    category TAG
    in_stock TAG
    price NUMERIC SORTABLE
    published_at NUMERIC SORTABLE
    embedding VECTOR HNSW 10
      TYPE FLOAT32
      DIM 384
      DISTANCE_METRIC COSINE
      M 16
      EF_CONSTRUCTION 200
```

## Python Setup

```python
from redis import Redis
from redis.commands.search.field import (
    TextField, TagField, NumericField, VectorField
)
from redis.commands.search.indexDefinition import IndexDefinition, IndexType
from redis.commands.search.query import Query
from sentence_transformers import SentenceTransformer
import numpy as np
import time

r = Redis(decode_responses=False)
model = SentenceTransformer("all-MiniLM-L6-v2")
VECTOR_DIM = 384

def create_hybrid_index():
    try:
        r.ft("idx:hybrid").info()
    except Exception:
        r.ft("idx:hybrid").create_index(
            [
                TextField("title", weight=2.0),
                TagField("category"),
                TagField("in_stock"),
                NumericField("price", sortable=True),
                NumericField("published_at", sortable=True),
                VectorField("embedding", "HNSW", {
                    "TYPE": "FLOAT32",
                    "DIM": VECTOR_DIM,
                    "DISTANCE_METRIC": "COSINE",
                    "M": 16,
                    "EF_CONSTRUCTION": 200
                })
            ],
            definition=IndexDefinition(prefix=["item:"], index_type=IndexType.HASH)
        )

def add_item(item_id: int, title: str, category: str,
             price: float, in_stock: bool):
    embedding = model.encode(title, normalize_embeddings=True)
    r.hset(f"item:{item_id}", mapping={
        "title": title.encode(),
        "category": category.encode(),
        "in_stock": ("yes" if in_stock else "no").encode(),
        "price": price,
        "published_at": int(time.time()),
        "embedding": np.array(embedding, dtype=np.float32).tobytes()
    })
```

## Vector Search with TAG Filter

```python
def search_by_category(query_text: str, category: str, top_k: int = 10) -> list:
    query_bytes = np.array(
        model.encode(query_text, normalize_embeddings=True),
        dtype=np.float32
    ).tobytes()

    # Pre-filter with TAG, then apply KNN
    filter_expr = f"@category:{{{category}}}"
    q = Query(f"({filter_expr})=>[KNN {top_k} @embedding $vec AS score]") \
        .sort_by("score", asc=True) \
        .return_fields("title", "category", "price", "score") \
        .paging(0, top_k) \
        .dialect(2)

    results = r.ft("idx:hybrid").search(q, query_params={"vec": query_bytes})
    return [
        {
            "id": doc.id.replace("item:", ""),
            "title": doc.title.decode() if isinstance(doc.title, bytes) else doc.title,
            "price": float(doc.price),
            "score": float(doc.score)
        }
        for doc in results.docs
    ]
```

## Vector Search with Multiple Filters

```python
def search_in_stock_budget(query_text: str, max_price: float,
                           category: str, top_k: int = 10) -> list:
    query_bytes = np.array(
        model.encode(query_text, normalize_embeddings=True),
        dtype=np.float32
    ).tobytes()

    # Combine TAG, NUMERIC, and vector KNN
    filter_expr = (
        f"@in_stock:{{yes}} "
        f"@category:{{{category}}} "
        f"@price:[-inf {max_price}]"
    )
    q = Query(f"({filter_expr})=>[KNN {top_k} @embedding $vec AS score]") \
        .sort_by("score", asc=True) \
        .return_fields("title", "price", "in_stock", "score") \
        .paging(0, top_k) \
        .dialect(2)

    results = r.ft("idx:hybrid").search(q, query_params={"vec": query_bytes})
    return [
        {"title": doc.title, "price": float(doc.price), "score": float(doc.score)}
        for doc in results.docs
    ]
```

## Post-filter vs Pre-filter

```python
# Pre-filter (recommended for large datasets):
# Redis applies the filter first to narrow the candidate set, then runs KNN.
# Efficient but may miss some results if the filter is very restrictive.

# Post-filter example: fetch more candidates and filter in Python
def post_filter_search(query_text: str, max_price: float, top_k: int = 10) -> list:
    query_bytes = np.array(
        model.encode(query_text, normalize_embeddings=True),
        dtype=np.float32
    ).tobytes()

    # Fetch more than needed, then filter
    q = Query(f"*=>[KNN {top_k * 5} @embedding $vec AS score]") \
        .sort_by("score", asc=True) \
        .return_fields("title", "price", "in_stock", "score") \
        .paging(0, top_k * 5) \
        .dialect(2)

    results = r.ft("idx:hybrid").search(q, query_params={"vec": query_bytes})
    filtered = [
        {"title": doc.title, "price": float(doc.price), "score": float(doc.score)}
        for doc in results.docs
        if float(doc.price) <= max_price
    ]
    return filtered[:top_k]
```

## Summary

Redis hybrid search combines vector KNN queries with TAG, TEXT, and NUMERIC pre-filters in a single FT.SEARCH call. Pre-filtering narrows the candidate pool before vector scoring, making queries faster on large datasets. Post-filtering in application code provides a fallback when strict pre-filters would over-constrain the vector search.
