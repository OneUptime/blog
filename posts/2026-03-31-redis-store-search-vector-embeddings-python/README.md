# How to Store and Search Vector Embeddings in Redis with Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Python, Vector Search, Embedding, AI

Description: Learn how to store vector embeddings in Redis and perform similarity searches using Python and the redis-py client with RediSearch vector fields.

---

Redis supports vector similarity search natively through the RediSearch module. You can store embeddings as binary blobs in Hash or JSON documents and query them using KNN (k-nearest neighbor) search. This guide uses `redis-py` directly for full control.

## Setup

```bash
pip install redis sentence-transformers numpy
```

```bash
docker run -d -p 6379:6379 redis/redis-stack-server:latest
```

## Creating a Vector Index

```python
import redis
from redis.commands.search.field import VectorField, TextField, TagField
from redis.commands.search.indexDefinition import IndexDefinition, IndexType

r = redis.Redis(host="localhost", port=6379, decode_responses=False)

schema = (
    TextField("title"),
    TagField("genre"),
    VectorField(
        "embedding",
        "FLAT",
        {
            "TYPE": "FLOAT32",
            "DIM": 384,
            "DISTANCE_METRIC": "COSINE",
        }
    )
)

r.ft("idx:movies").create_index(
    schema,
    definition=IndexDefinition(prefix=["movie:"], index_type=IndexType.HASH)
)
```

## Storing Embeddings

```python
from sentence_transformers import SentenceTransformer
import numpy as np

model = SentenceTransformer("all-MiniLM-L6-v2")

movies = [
    {"id": 1, "title": "Inception", "genre": "sci-fi"},
    {"id": 2, "title": "The Dark Knight", "genre": "action"},
    {"id": 3, "title": "Interstellar", "genre": "sci-fi"},
]

pipe = r.pipeline()
for movie in movies:
    embedding = model.encode(movie["title"]).astype(np.float32).tobytes()
    pipe.hset(f"movie:{movie['id']}", mapping={
        "title": movie["title"],
        "genre": movie["genre"],
        "embedding": embedding
    })
pipe.execute()
```

## Performing KNN Search

```python
from redis.commands.search.query import Query

query_text = "space travel and time"
query_vector = model.encode(query_text).astype(np.float32).tobytes()

k = 3
q = (
    Query(f"*=>[KNN {k} @embedding $vec AS score]")
    .sort_by("score")
    .return_fields("title", "genre", "score")
    .dialect(2)
)

results = r.ft("idx:movies").search(q, query_params={"vec": query_vector})

for doc in results.docs:
    print(f"{doc.title} ({doc.genre}) - score: {doc.score}")
```

## Hybrid Search with Filters

```python
q = (
    Query(f"(@genre:{{sci-fi}})=>[KNN {k} @embedding $vec AS score]")
    .sort_by("score")
    .return_fields("title", "genre", "score")
    .dialect(2)
)

results = r.ft("idx:movies").search(q, query_params={"vec": query_vector})
```

## Using HNSW for Large Datasets

For better performance with millions of vectors, use HNSW instead of FLAT:

```python
VectorField(
    "embedding",
    "HNSW",
    {
        "TYPE": "FLOAT32",
        "DIM": 384,
        "DISTANCE_METRIC": "COSINE",
        "M": 16,
        "EF_CONSTRUCTION": 200,
    }
)
```

HNSW offers approximate nearest-neighbor search with much faster query times at scale, at the cost of a slightly higher memory footprint.

## Summary

Redis provides first-class vector storage and similarity search through its FLAT and HNSW index types. Using redis-py, you can store embeddings directly in Hash documents, create a RediSearch vector index, and run KNN queries with optional tag or text filters. This approach is well suited for semantic search, recommendation systems, and retrieval-augmented generation pipelines.
