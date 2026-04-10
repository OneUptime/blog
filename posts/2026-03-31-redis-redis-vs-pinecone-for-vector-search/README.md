# Redis vs Pinecone for Vector Search

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Pinecone, Vector Search, Machine Learning, Embedding

Description: Compare Redis Vector Search and Pinecone for storing and querying vector embeddings, covering indexing algorithms, query performance, and cost trade-offs.

---

## Overview

Vector databases store high-dimensional embeddings and enable similarity search - the foundation of semantic search, recommendation systems, and RAG (Retrieval-Augmented Generation) pipelines. Redis Stack and Pinecone both offer vector search, but they differ significantly in their architecture and trade-offs.

## Redis Vector Search

Redis Stack includes a vector similarity search capability using HNSW (Hierarchical Navigable Small World) or flat indexing.

```bash
# Create an index with a vector field (HNSW)
FT.CREATE idx:embeddings ON HASH PREFIX 1 "doc:" \
  SCHEMA \
    content TEXT \
    embedding VECTOR HNSW 6 \
      TYPE FLOAT32 \
      DIM 1536 \
      DISTANCE_METRIC COSINE

# Store a document with embedding
HSET doc:1 content "Redis is an in-memory database" \
  embedding <binary_float32_vector>
```

```python
import redis
import numpy as np

r = redis.Redis()

def store_embedding(doc_id: str, content: str, embedding: list[float]):
    vector_bytes = np.array(embedding, dtype=np.float32).tobytes()
    r.hset(f"doc:{doc_id}", mapping={
        "content": content,
        "embedding": vector_bytes
    })

def search_similar(query_embedding: list[float], top_k: int = 5):
    query_bytes = np.array(query_embedding, dtype=np.float32).tobytes()
    query = (
        f"*=>[KNN {top_k} @embedding $vec AS score]"
    )
    results = r.ft("idx:embeddings").search(
        query,
        query_params={"vec": query_bytes}
    )
    return results.docs
```

## Pinecone Vector Search

Pinecone is a managed, purpose-built vector database with a simple API.

```python
from pinecone import Pinecone, ServerlessSpec

pc = Pinecone(api_key="your-api-key")

# Create an index
pc.create_index(
    name="embeddings",
    dimension=1536,
    metric="cosine",
    spec=ServerlessSpec(cloud="aws", region="us-east-1")
)

index = pc.Index("embeddings")

# Upsert vectors
index.upsert(vectors=[
    {
        "id": "doc:1",
        "values": [0.1, 0.2, ...],  # 1536-dim vector
        "metadata": {"content": "Redis is an in-memory database"}
    }
])

# Query
results = index.query(
    vector=[0.1, 0.2, ...],
    top_k=5,
    include_metadata=True
)
```

## Index Algorithm Comparison

### Redis: HNSW vs Flat

```bash
# Flat index - exact search, slower for large datasets
FT.CREATE idx:flat ON HASH PREFIX 1 "doc:" \
  SCHEMA embedding VECTOR FLAT 6 \
    TYPE FLOAT32 DIM 1536 DISTANCE_METRIC COSINE

# HNSW - approximate search, faster with slight accuracy trade-off
FT.CREATE idx:hnsw ON HASH PREFIX 1 "doc:" \
  SCHEMA embedding VECTOR HNSW 10 \
    TYPE FLOAT32 DIM 1536 DISTANCE_METRIC COSINE \
    M 16 EF_CONSTRUCTION 200
```

Pinecone uses its own proprietary index internally, optimized for serverless and pod-based deployments.

## Filtered Vector Search

Both support pre-filtering to combine vector similarity with metadata filters.

```python
# Redis: filter + KNN
query = "@category:{electronics}=>[KNN 10 @embedding $vec AS score]"
results = r.ft("idx:embeddings").search(
    query,
    query_params={"vec": query_bytes}
)

# Pinecone: metadata filter
results = index.query(
    vector=query_embedding,
    top_k=10,
    filter={"category": {"$eq": "electronics"}},
    include_metadata=True
)
```

## Scalability

Pinecone is serverless-first and handles billions of vectors with automatic scaling. It manages replication, sharding, and index maintenance transparently.

Redis vector search is bounded by available RAM. A 1536-dimensional float32 vector takes about 6KB. One million vectors require roughly 6GB of RAM plus overhead.

```python
# Estimate Redis memory for vector index
dim = 1536
num_vectors = 1_000_000
bytes_per_vector = dim * 4  # float32
total_gb = (bytes_per_vector * num_vectors) / (1024**3)
print(f"Estimated memory: {total_gb:.1f} GB")
# Estimated memory: 5.7 GB
```

## RAG Pipeline Integration

```python
from openai import OpenAI
import redis

openai_client = OpenAI()
r = redis.Redis()

def rag_query(user_question: str) -> str:
    # Get embedding for user question
    response = openai_client.embeddings.create(
        input=user_question,
        model="text-embedding-3-small"
    )
    query_vec = response.data[0].embedding

    # Search Redis for similar docs
    similar_docs = search_similar(query_vec, top_k=3)
    context = "\n".join([doc.content for doc in similar_docs])

    # Generate answer
    completion = openai_client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": f"Context:\n{context}"},
            {"role": "user", "content": user_question}
        ]
    )
    return completion.choices[0].message.content
```

## When to Use Redis Vector Search

- Your vector dataset fits in memory (under a few hundred million vectors)
- You want to colocate vector search with your existing Redis data
- You need extremely low latency (sub-millisecond)
- You want to avoid managing a separate vector database service

## When to Use Pinecone

- You need to store billions of vectors
- You want fully managed, serverless scaling with no ops overhead
- Your team needs a dedicated vector database with enterprise SLAs
- You need multi-region replication for vector data

## Summary

Redis vector search is ideal for low-latency use cases where vectors fit in memory and colocating with operational data is valuable. Pinecone provides a fully managed, horizontally scalable vector database that handles billions of vectors without infrastructure concerns. For most RAG and semantic search prototypes, Redis is a fast starting point; for production scale beyond available RAM, Pinecone or similar dedicated vector databases are worth the added cost.
