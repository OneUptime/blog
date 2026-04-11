# How to Use VSIM in Redis to Find Similar Vectors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Vector Set, Similarity Search, Nearest Neighbor, Embedding

Description: Learn how to use VSIM in Redis to perform approximate nearest-neighbor search and find the most similar vectors in a Vector Set.

---

## What Is VSIM?

`VSIM` performs approximate nearest-neighbor (ANN) search in a Redis Vector Set. Given a query vector or a reference element, it returns the K most similar vectors ranked by cosine similarity. This is the core retrieval command for building semantic search, recommendation systems, and duplicate detection pipelines.

## Prerequisites

- Redis 8.0 or later
- A Vector Set populated with `VADD`

## Syntax

```text
VSIM key (ELE element | FP32 vector | VALUES num val [val ...]) [WITHSCORES] [WITHATTRIBS] [COUNT count]
  [EPSILON delta] [EF ef] [FILTER filter] [FILTER-EF filteref] [TRUTH] [NOTHREAD]
```

Key options:
- `ELE element` - find vectors similar to an existing element in the set
- `VALUES dim val...` - find vectors similar to a raw query vector
- `WITHSCORES` - include similarity scores in results
- `COUNT n` - return top n results (default 10)

## Basic Usage: Search by Element

```bash
# Add some vectors first
VADD docs doc1 VALUES 4 0.1 0.2 0.3 0.4
VADD docs doc2 VALUES 4 0.11 0.21 0.31 0.41
VADD docs doc3 VALUES 4 0.9 0.8 0.7 0.6
VADD docs doc4 VALUES 4 0.12 0.22 0.32 0.42

# Find 3 most similar to doc1
VSIM docs ELE doc1 COUNT 3
# 1) "doc1"
# 2) "doc2"
# 3) "doc4"
```

## Search by Raw Query Vector

```bash
# Search using a query vector directly (same dimensions as stored vectors)
VSIM docs VALUES 4 0.1 0.2 0.3 0.4 COUNT 3
# Returns most similar vectors to the given embedding
```

## Using WITHSCORES

```bash
VSIM docs ELE doc1 COUNT 3 WITHSCORES
# 1) "doc1"
# 2) "1"          (score = 1.0 = perfect match)
# 3) "doc2"
# 4) "0.999..."   (very similar)
# 5) "doc4"
# 6) "0.998..."
```

Scores are rescaled cosine similarities in the range 0.0 to 1.0, where 1.0 means identical direction, 0.5 means orthogonal, and 0.0 means opposite direction.

## Python Example: Semantic Search System

```python
import redis
import numpy as np

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def normalize(vec: list) -> list:
    arr = np.array(vec, dtype=np.float32)
    norm = np.linalg.norm(arr)
    if norm == 0:
        return vec
    return (arr / norm).tolist()

def index_document(key: str, doc_id: str, embedding: list):
    dim = len(embedding)
    cmd = ["VADD", key, doc_id, "VALUES", str(dim)] + [str(v) for v in embedding]
    r.execute_command(*cmd)

def search_similar(key: str, query_embedding: list, top_k: int = 5) -> list:
    """Find top_k most similar documents to a query embedding."""
    dim = len(query_embedding)
    cmd = (
        ["VSIM", key, "VALUES", str(dim)]
        + [str(v) for v in query_embedding]
        + ["COUNT", str(top_k), "WITHSCORES"]
    )
    result = r.execute_command(*cmd)

    # Parse interleaved [item, score, item, score, ...] results
    items = []
    for i in range(0, len(result), 2):
        items.append({
            "id": result[i],
            "score": float(result[i + 1])
        })
    return items

# Seed some documents
dim = 8
np.random.seed(42)
documents = {
    "redis-intro": normalize(np.random.randn(dim).tolist()),
    "redis-cluster": normalize(np.random.randn(dim).tolist()),
    "python-basics": normalize(np.random.randn(dim).tolist()),
    "ml-overview": normalize(np.random.randn(dim).tolist()),
    "vector-search": normalize(np.random.randn(dim).tolist()),
}

for doc_id, embedding in documents.items():
    index_document("docs:index", doc_id, embedding)

# Simulate a query: search for docs similar to "redis-intro"
query_vec = documents["redis-intro"]
results = search_similar("docs:index", query_vec, top_k=3)

print("Search results:")
for r_ in results:
    print(f"  {r_['id']}: similarity={r_['score']:.4f}")
```

## Filtering Results

Use FILTER to narrow results by metadata attributes (requires SETATTR):

```bash
# Add vectors with attributes
VADD catalog item:1 VALUES 4 0.1 0.2 0.3 0.4 SETATTR '{"category":"electronics","price":99}'
VADD catalog item:2 VALUES 4 0.11 0.21 0.31 0.41 SETATTR '{"category":"books","price":15}'
VADD catalog item:3 VALUES 4 0.12 0.22 0.32 0.42 SETATTR '{"category":"electronics","price":149}'

# Search for similar electronics only
VSIM catalog ELE item:1 COUNT 5 FILTER '.category == "electronics"'
```

## Adjusting Search Quality with EF

The `EF` parameter controls search accuracy vs speed:

```bash
# Default search (balanced)
VSIM docs ELE doc1 COUNT 10

# Higher EF = more accurate, slower
VSIM docs ELE doc1 COUNT 10 EF 200

# Lower EF = faster, less accurate
VSIM docs ELE doc1 COUNT 10 EF 10
```

## Building a Recommendation API

```python
from flask import Flask, jsonify, request

app = Flask(__name__)

@app.route("/api/recommend/<item_id>")
def recommend(item_id: str):
    top_k = int(request.args.get("limit", 5))

    results = r.execute_command(
        "VSIM", "items:vectors", "ELE", item_id,
        "COUNT", str(top_k + 1),  # +1 because item itself is returned
        "WITHSCORES"
    )

    recommendations = []
    for i in range(0, len(results), 2):
        candidate_id = results[i]
        score = float(results[i + 1])
        if candidate_id != item_id:  # Skip the query item itself
            recommendations.append({"id": candidate_id, "score": score})

    return jsonify({"item": item_id, "recommendations": recommendations[:top_k]})
```

## Summary

`VSIM` performs approximate nearest-neighbor search in a Redis Vector Set, returning the most similar vectors ranked by cosine similarity. Use `ELE` to search relative to an existing element or `VALUES` for raw query vectors. The `WITHSCORES` option provides similarity scores, `COUNT` controls result count, and `EF` tunes the accuracy-performance trade-off. Combined with `VADD`, VSIM forms the foundation for semantic search, recommendations, and AI-powered retrieval systems in Redis.
