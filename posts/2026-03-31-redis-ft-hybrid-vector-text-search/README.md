# How to Use FT.HYBRID in Redis for Combined Vector and Text Search

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RediSearch, Vector Search

Description: Learn how to combine vector similarity search with text filters in Redis using hybrid search to find semantically similar results matching specific criteria.

---

Hybrid search in RediSearch combines vector similarity (semantic search) with traditional text or numeric filters in a single query. This lets you find results that are both semantically similar to a query embedding and match specific structured criteria - for example, "find products similar to this description that are in stock and under $100."

## Prerequisites

- Redis with RediSearch 2.4+ and vector support enabled
- An embedding model to generate float vectors (e.g., OpenAI, sentence-transformers)

## Creating an Index with Vector and Text Fields

```bash
FT.CREATE products
  ON HASH
  PREFIX 1 product:
  SCHEMA
    name TEXT
    category TAG
    price NUMERIC
    in_stock TAG
    embedding VECTOR HNSW 6
      TYPE FLOAT32
      DIM 384
      DISTANCE_METRIC COSINE
```

## Adding Sample Documents

```bash
HSET product:1 name "Wireless Headphones" category "electronics" price 79.99 in_stock "yes" embedding <binary_vector>
HSET product:2 name "Bluetooth Speaker" category "electronics" price 49.99 in_stock "yes" embedding <binary_vector>
HSET product:3 name "Noise Cancelling Headphones" category "electronics" price 249.99 in_stock "no" embedding <binary_vector>
```

## Hybrid Search Query Syntax

In RediSearch, hybrid search is expressed via `FT.SEARCH` using the `KNN` clause combined with a pre-filter:

```text
FT.SEARCH <index> "(<filter_expression>)=>[KNN <k> @<vector_field> $query_vec]"
  PARAMS 2 query_vec <binary_vector>
  SORTBY __<vector_field>_score
  RETURN 4 name price in_stock __embedding_score
  DIALECT 2
```

## Python Example: Semantic Search with Filters

```python
import redis
import struct

r = redis.Redis(host="127.0.0.1", port=6379, decode_responses=False)

def encode_vector(vec: list) -> bytes:
    """Convert float list to binary for Redis."""
    return struct.pack(f"{len(vec)}f", *vec)

def hybrid_search(query_vector: list, category: str, max_price: float, top_k: int = 5):
    query_bytes = encode_vector(query_vector)

    # Pre-filter: only search within a category and price range
    filter_expr = f"(@category:{{{category}}} @price:[-inf {max_price}] @in_stock:{{yes}})"
    knn_expr = f"=>[KNN {top_k} @embedding $query_vec AS score]"
    query = f"{filter_expr}{knn_expr}"

    results = r.execute_command(
        "FT.SEARCH", "products",
        query,
        "PARAMS", "2", "query_vec", query_bytes,
        "SORTBY", "score",
        "RETURN", "4", "name", "price", "in_stock", "score",
        "DIALECT", "2"
    )
    return results

# Example: find electronics similar to a query, priced under $100
query_vec = [0.1] * 384  # replace with real embedding
results = hybrid_search(query_vec, "electronics", 100.0)
print(f"Found {results[0]} matching products")
```

## FLAT vs HNSW Index for Hybrid Search

| Index Type | Use Case |
|---|---|
| HNSW | Large datasets - approximate nearest neighbor, fast |
| FLAT | Small datasets - exact nearest neighbor, slower |

For hybrid search with many filters, HNSW with pre-filtering is more efficient because filters reduce the candidate set before vector comparison.

## Performance Tuning with EF_RUNTIME

For HNSW indexes, control the search expansion factor at query time:

```bash
FT.SEARCH products
  "(@category:{electronics} @price:[-inf 100])=>[KNN 10 @embedding $vec EF_RUNTIME 200]"
  PARAMS 2 vec <binary_vector>
  DIALECT 2
```

Higher `EF_RUNTIME` improves recall at the cost of latency.

## Use Cases for Hybrid Search

- **E-commerce**: "Find products similar to this item that are in stock under $50"
- **Content discovery**: "Find articles similar to this one published in the last 30 days"
- **Support tickets**: "Find tickets similar to this issue that are open and assigned to my team"
- **Recipe search**: "Find recipes similar to this one that are vegetarian and under 30 minutes"

## Summary

Hybrid search in RediSearch combines the power of vector similarity with structured filters in a single query pass. By using the `KNN` clause with pre-filter expressions and `DIALECT 2`, you can build semantic search features that are both contextually relevant and constrained to business-relevant criteria - delivering more useful, targeted results than either pure text search or pure vector search alone.
