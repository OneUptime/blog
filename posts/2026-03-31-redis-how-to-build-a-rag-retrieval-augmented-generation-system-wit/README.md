# How to Build a RAG System with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RAG, Vector Search, LLM, AI, Retrieval Augmented Generation

Description: Learn how to build a Retrieval-Augmented Generation system using Redis as the vector store to ground LLM responses in your own documents.

---

## What Is RAG

Retrieval-Augmented Generation (RAG) combines a vector search system with a large language model. When a user asks a question, the system first retrieves the most relevant documents from a knowledge base, then passes those documents as context to an LLM to generate a grounded, accurate answer.

Redis serves as a fast, in-memory vector store that can retrieve relevant chunks in under 10ms.

## Architecture Overview

```text
User query
    -> Embed query
    -> Vector search Redis (top-K chunks)
    -> Build prompt = system_prompt + chunks + query
    -> LLM (OpenAI GPT-4, Anthropic Claude, etc.)
    -> Return answer
```

## Setting Up Redis Stack

```bash
docker run -d --name redis-stack -p 6379:6379 redis/redis-stack-server:latest
pip install redis sentence-transformers openai
```

## Indexing Documents

```python
import numpy as np
from redis import Redis
from redis.commands.search.field import TextField, VectorField, NumericField
from redis.commands.search.indexDefinition import IndexDefinition, IndexType
from sentence_transformers import SentenceTransformer
import hashlib
import json

r = Redis(decode_responses=False)
model = SentenceTransformer("all-MiniLM-L6-v2")
VECTOR_DIM = 384

def create_rag_index():
    try:
        r.ft("idx:knowledge").info()
    except Exception:
        r.ft("idx:knowledge").create_index(
            [
                TextField("source"),
                TextField("chunk_text"),
                NumericField("chunk_index"),
                VectorField(
                    "embedding",
                    "HNSW",
                    {"TYPE": "FLOAT32", "DIM": VECTOR_DIM, "DISTANCE_METRIC": "COSINE"}
                )
            ],
            definition=IndexDefinition(prefix=["chunk:"], index_type=IndexType.HASH)
        )

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    words = text.split()
    chunks = []
    start = 0
    while start < len(words):
        end = start + chunk_size
        chunks.append(" ".join(words[start:end]))
        start += chunk_size - overlap
    return chunks

def index_document(source: str, content: str):
    chunks = chunk_text(content)
    for i, chunk in enumerate(chunks):
        embedding = model.encode(chunk, normalize_embeddings=True)
        chunk_id = hashlib.md5(f"{source}:{i}".encode()).hexdigest()[:12]
        key = f"chunk:{chunk_id}"
        r.hset(key, mapping={
            "source": source.encode(),
            "chunk_text": chunk.encode(),
            "chunk_index": i,
            "embedding": np.array(embedding, dtype=np.float32).tobytes()
        })
```

## Retrieval Function

```python
from redis.commands.search.query import Query

def retrieve_context(query: str, top_k: int = 5) -> list[dict]:
    query_embedding = model.encode(query, normalize_embeddings=True)
    query_bytes = np.array(query_embedding, dtype=np.float32).tobytes()

    q = Query(f"*=>[KNN {top_k} @embedding $vec AS score]") \
        .sort_by("score") \
        .return_fields("source", "chunk_text", "score") \
        .paging(0, top_k) \
        .dialect(2)

    results = r.ft("idx:knowledge").search(q, query_params={"vec": query_bytes})

    return [
        {
            "source": doc.source.decode() if isinstance(doc.source, bytes) else doc.source,
            "text": doc.chunk_text.decode() if isinstance(doc.chunk_text, bytes) else doc.chunk_text,
            "score": float(doc.score)
        }
        for doc in results.docs
    ]
```

## RAG Pipeline with OpenAI

```python
from openai import OpenAI

client = OpenAI()

def rag_query(user_question: str) -> dict:
    # Step 1: Retrieve relevant chunks
    chunks = retrieve_context(user_question, top_k=5)

    # Step 2: Build context string
    context = "\n\n".join([
        f"[Source: {c['source']}]\n{c['text']}"
        for c in chunks
    ])

    # Step 3: Build prompt
    system_prompt = (
        "You are a helpful assistant. Answer the user's question based only on "
        "the provided context. If the answer is not in the context, say so."
    )
    prompt = f"Context:\n{context}\n\nQuestion: {user_question}"

    # Step 4: Generate answer
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        max_tokens=500
    )

    return {
        "answer": response.choices[0].message.content,
        "sources": [c["source"] for c in chunks],
        "chunks_used": len(chunks)
    }
```

## Caching RAG Responses

Cache identical questions to avoid repeated LLM calls:

```python
import hashlib
import json

def cached_rag_query(question: str, cache_ttl: int = 3600) -> dict:
    cache_key = f"rag:cache:{hashlib.md5(question.encode()).hexdigest()}"
    cached = r.get(cache_key)
    if cached:
        return json.loads(cached)

    result = rag_query(question)
    r.set(cache_key, json.dumps(result), ex=cache_ttl)
    return result
```

## FastAPI Endpoint

```python
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class QueryRequest(BaseModel):
    question: str

@app.on_event("startup")
def startup():
    create_rag_index()

@app.post("/ask")
def ask(req: QueryRequest):
    return cached_rag_query(req.question)

@app.post("/ingest")
def ingest(source: str, content: str):
    index_document(source, content)
    return {"status": "indexed", "source": source}
```

## Summary

A Redis-backed RAG system uses vector search to retrieve relevant document chunks and passes them as context to an LLM, dramatically reducing hallucinations. Chunking documents with overlap preserves semantic continuity across boundaries. Caching LLM responses for repeated questions reduces cost and latency significantly.
