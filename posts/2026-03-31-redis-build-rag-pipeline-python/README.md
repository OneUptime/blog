# How to Build a RAG Pipeline in Python with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Python, RAG, Vector Search, LLM

Description: Learn how to build a Retrieval-Augmented Generation pipeline in Python using Redis as the vector store for document retrieval and LLM-powered responses.

---

Retrieval-Augmented Generation (RAG) combines a vector database with a language model: relevant documents are retrieved from the store and injected into the LLM prompt. Redis, with its vector search capabilities, makes an efficient and low-latency vector store for this pattern.

## Architecture

```text
User Question
     |
     v
Embed Question (SentenceTransformer)
     |
     v
Redis KNN Search --> Top-K Documents
     |
     v
Build Prompt (question + documents)
     |
     v
LLM API (OpenAI / local model)
     |
     v
Answer
```

## Setup

```bash
pip install redis sentence-transformers numpy openai
docker run -d -p 6379:6379 redis/redis-stack-server:latest
```

## Step 1 - Index Your Documents

```python
import redis
import numpy as np
from sentence_transformers import SentenceTransformer
from redis.commands.search.field import VectorField, TextField
from redis.commands.search.indexDefinition import IndexDefinition, IndexType

r = redis.Redis(host="localhost", port=6379, decode_responses=False)
model = SentenceTransformer("all-MiniLM-L6-v2")

# Create index
schema = (
    TextField("content"),
    TextField("source"),
    VectorField("embedding", "HNSW", {
        "TYPE": "FLOAT32", "DIM": 384,
        "DISTANCE_METRIC": "COSINE"
    })
)
r.ft("idx:docs").create_index(
    schema,
    definition=IndexDefinition(prefix=["doc:"], index_type=IndexType.HASH)
)

# Ingest documents
docs = [
    {"id": 1, "content": "Redis is an in-memory data structure store.", "source": "redis-docs"},
    {"id": 2, "content": "Redis supports strings, hashes, lists, sets, and sorted sets.", "source": "redis-docs"},
    {"id": 3, "content": "Redis Sentinel provides high availability for Redis.", "source": "redis-docs"},
]

pipe = r.pipeline()
for doc in docs:
    emb = model.encode(doc["content"]).astype(np.float32).tobytes()
    pipe.hset(f"doc:{doc['id']}", mapping={
        "content": doc["content"],
        "source": doc["source"],
        "embedding": emb
    })
pipe.execute()
```

## Step 2 - Retrieve Relevant Documents

```python
from redis.commands.search.query import Query

def retrieve(question: str, k: int = 3) -> list[str]:
    q_vec = model.encode(question).astype(np.float32).tobytes()
    query = (
        Query(f"*=>[KNN {k} @embedding $vec AS score]")
        .sort_by("score")
        .return_fields("content", "source", "score")
        .dialect(2)
    )
    results = r.ft("idx:docs").search(query, query_params={"vec": q_vec})
    return [doc.content for doc in results.docs]
```

## Step 3 - Generate an Answer

```python
from openai import OpenAI

client = OpenAI()

def answer(question: str) -> str:
    context_docs = retrieve(question, k=3)
    context = "\n".join(f"- {d}" for d in context_docs)

    prompt = f"""Answer the question using only the context below.

Context:
{context}

Question: {question}
Answer:"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content

print(answer("What data types does Redis support?"))
```

## Step 4 - Add Semantic Caching

Avoid redundant LLM calls by caching responses in Redis:

```python
def answer_with_cache(question: str) -> str:
    # Check cache (simplified exact-match - use redisvl SemanticCache for production)
    cached = r.get(f"cache:{question}")
    if cached:
        return cached.decode()
    result = answer(question)
    r.setex(f"cache:{question}", 3600, result)
    return result
```

## Summary

Redis serves as an effective vector store for RAG pipelines due to its low latency, native KNN search, and ability to combine vector retrieval with metadata filtering. The pattern involves embedding documents at ingest time, performing KNN retrieval at query time, and injecting results into an LLM prompt. Adding semantic caching on top further reduces cost and latency for repeated or similar questions.
