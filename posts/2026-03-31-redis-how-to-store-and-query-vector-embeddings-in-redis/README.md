# How to Store and Query Vector Embeddings in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Vector Search, Embedding, AI, Semantic Search

Description: Learn how to store vector embeddings in Redis and perform semantic similarity searches using cosine or L2 distance with the RediSearch vector index.

---

## What Are Vector Embeddings

Vector embeddings are numerical representations of text, images, or other data produced by machine learning models. Similar items have embeddings that are close together in vector space, enabling semantic search - finding documents that are conceptually similar rather than keyword-matched.

## Setting Up Redis Stack

Redis Stack includes the vector search capability:

```bash
docker run -d --name redis-stack -p 6379:6379 redis/redis-stack-server:latest
```

## Creating a Vector Index

```bash
FT.CREATE idx:docs
  ON HASH
  PREFIX 1 doc:
  SCHEMA
    title TEXT
    content TEXT
    embedding VECTOR HNSW 6
      TYPE FLOAT32
      DIM 1536
      DISTANCE_METRIC COSINE
```

## Python Implementation with OpenAI Embeddings

```python
import numpy as np
import struct
from redis import Redis
from redis.commands.search.field import TextField, VectorField
from redis.commands.search.indexDefinition import IndexDefinition, IndexType
from redis.commands.search.query import Query
import openai

r = Redis(decode_responses=False)  # Binary data - must use bytes

VECTOR_DIM = 1536

def create_index():
    try:
        r.ft("idx:docs").info()
    except Exception:
        r.ft("idx:docs").create_index(
            [
                TextField("title"),
                TextField("content"),
                VectorField(
                    "embedding",
                    "HNSW",
                    {
                        "TYPE": "FLOAT32",
                        "DIM": VECTOR_DIM,
                        "DISTANCE_METRIC": "COSINE"
                    }
                )
            ],
            definition=IndexDefinition(
                prefix=["doc:"],
                index_type=IndexType.HASH
            )
        )

def get_embedding(text: str) -> list[float]:
    response = openai.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return response.data[0].embedding

def embed_to_bytes(embedding: list[float]) -> bytes:
    return struct.pack(f"{len(embedding)}f", *embedding)

def store_document(doc_id: int, title: str, content: str):
    embedding = get_embedding(f"{title} {content}")
    r.hset(f"doc:{doc_id}", mapping={
        "title": title.encode(),
        "content": content.encode(),
        "embedding": embed_to_bytes(embedding)
    })
```

## Similarity Search

```python
def semantic_search(query_text: str, top_k: int = 5) -> list:
    query_embedding = get_embedding(query_text)
    query_bytes = embed_to_bytes(query_embedding)

    q = Query(f"*=>[KNN {top_k} @embedding $vec AS score]") \
        .sort_by("score") \
        .return_fields("title", "content", "score") \
        .paging(0, top_k) \
        .dialect(2)

    results = r.ft("idx:docs").search(q, query_params={"vec": query_bytes})

    return [
        {
            "id": doc.id.replace("doc:", ""),
            "title": doc.title.decode() if isinstance(doc.title, bytes) else doc.title,
            "score": float(doc.score)
        }
        for doc in results.docs
    ]
```

## Using Sentence Transformers (No API Required)

```python
from sentence_transformers import SentenceTransformer
import numpy as np

model = SentenceTransformer("all-MiniLM-L6-v2")
VECTOR_DIM = 384

def get_local_embedding(text: str) -> list[float]:
    embedding = model.encode(text, normalize_embeddings=True)
    return embedding.tolist()

def store_document_local(doc_id: int, title: str, content: str):
    embedding = get_local_embedding(f"{title} {content}")
    r.hset(f"doc:{doc_id}", mapping={
        "title": title.encode(),
        "content": content.encode(),
        "embedding": np.array(embedding, dtype=np.float32).tobytes()
    })
```

## Filtered Vector Search

Combine vector similarity with metadata filters. The index must include the filter field, so add a TAG field for category:

```bash
FT.CREATE idx:docs_filtered
  ON HASH
  PREFIX 1 doc:
  SCHEMA
    title TEXT
    content TEXT
    category TAG
    embedding VECTOR HNSW 6
      TYPE FLOAT32
      DIM 1536
      DISTANCE_METRIC COSINE
```

```bash
# Only search within a specific category
FT.SEARCH idx:docs_filtered
  "(@category:{technology})=>[KNN 5 @embedding $vec AS score]"
  PARAMS 2 vec <binary_vector>
  SORTBY score
  DIALECT 2
```

```python
def semantic_search_filtered(query_text: str, category: str, top_k: int = 5) -> list:
    query_bytes = embed_to_bytes(get_embedding(query_text))
    q = Query(f"(@category:{{{category}}})=>[KNN {top_k} @embedding $vec AS score]") \
        .sort_by("score") \
        .return_fields("title", "score") \
        .paging(0, top_k) \
        .dialect(2)
    results = r.ft("idx:docs_filtered").search(q, query_params={"vec": query_bytes})
    return [{"title": doc.title, "score": float(doc.score)} for doc in results.docs]
```

## Summary

Redis vector search stores embeddings as binary FLOAT32 fields in Hashes and indexes them with HNSW for approximate nearest-neighbor queries. The KNN syntax retrieves the most semantically similar documents in a single Redis command. Combining vector search with TAG or TEXT filters enables context-aware semantic search without scanning the full index.
