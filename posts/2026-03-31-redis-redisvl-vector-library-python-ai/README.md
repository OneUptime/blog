# How to Use RedisVL (Vector Library) in Python for AI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Python, Vector Search, AI, RedisVL

Description: Learn how to use RedisVL, the Python vector library for Redis, to store and query vector embeddings for AI and semantic search applications.

---

RedisVL (Redis Vector Library) is a Python client that wraps Redis vector search capabilities with a developer-friendly API. It handles index creation, vector ingestion, and similarity search - making it easy to build semantic search, recommendation engines, and RAG pipelines.

## Installation

```bash
pip install redisvl
```

Start Redis Stack for vector support:

```bash
docker run -d -p 6379:6379 redis/redis-stack-server:latest
```

## Defining a Schema

Create a YAML schema file that describes your index:

```yaml
# schema.yaml
index:
  name: products
  prefix: product
  storage_type: hash

fields:
  - name: name
    type: text
  - name: category
    type: tag
  - name: embedding
    type: vector
    attrs:
      algorithm: flat
      dims: 384
      distance_metric: cosine
      datatype: float32
```

## Creating the Index

```python
from redisvl.index import SearchIndex

index = SearchIndex.from_yaml("schema.yaml", redis_url="redis://localhost:6379")
index.create(overwrite=True)
```

## Loading Data

```python
from sentence_transformers import SentenceTransformer
import numpy as np

model = SentenceTransformer("all-MiniLM-L6-v2")

products = [
    {"name": "Wireless Keyboard", "category": "electronics"},
    {"name": "Coffee Maker", "category": "kitchen"},
    {"name": "Running Shoes", "category": "sports"},
]

data = []
for p in products:
    embedding = model.encode(p["name"]).astype(np.float32).tobytes()
    data.append({**p, "embedding": embedding})

index.load(data)
```

## Vector Similarity Search

```python
from redisvl.query import VectorQuery

query_text = "mechanical keyboard"
query_vector = model.encode(query_text).astype(np.float32).tobytes()

query = VectorQuery(
    vector=query_vector,
    vector_field_name="embedding",
    return_fields=["name", "category"],
    num_results=3
)

results = index.query(query)
for r in results:
    print(r["name"], r["vector_distance"])
```

## Hybrid Search (Vector + Filter)

```python
from redisvl.query.filter import Tag

tag_filter = Tag("category") == "electronics"

query = VectorQuery(
    vector=query_vector,
    vector_field_name="embedding",
    return_fields=["name", "category"],
    filter_expression=tag_filter,
    num_results=5
)

results = index.query(query)
```

## Using Vectorizers

RedisVL includes built-in vectorizers so you don't need to manage embedding calls manually:

```python
from redisvl.extensions.cache.llm.semantic import SemanticCache

cache = SemanticCache(
    name="llm_cache",
    redis_url="redis://localhost:6379",
    distance_threshold=0.1
)

cache.store(
    prompt="What is the capital of France?",
    response="Paris"
)

hit = cache.check("Capital of France?")
print(hit)  # Returns cached response if semantically similar
```

## Summary

RedisVL simplifies building AI-powered features on top of Redis by providing schema management, vector ingestion, similarity queries, and hybrid search in a clean Python API. It also includes higher-level abstractions like semantic caching and session management, making it a strong choice for LLM and RAG application backends.
