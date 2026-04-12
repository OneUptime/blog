# How to Build a Semantic Search Application with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Vector Search, Semantic Search, Python, AI

Description: Learn how to build an end-to-end semantic search application using MongoDB Atlas Vector Search, sentence transformers, and a FastAPI backend for similarity-based document retrieval.

---

## Overview

Semantic search finds documents that are conceptually similar to a query, not just keyword matches. By combining sentence transformer embeddings with MongoDB Atlas Vector Search, you can build a semantic search application that understands meaning and intent rather than exact terms.

## Architecture

```text
User Query
    |
    v
[FastAPI Backend]
    |-> Embed query with sentence-transformers
    |-> Run $vectorSearch aggregation in Atlas
    |-> Return ranked results
    |
    v
[MongoDB Atlas] - stores documents + embeddings
```

## Installation

```bash
pip install fastapi uvicorn pymongo sentence-transformers python-dotenv
```

## Generating and Storing Embeddings

```python
from pymongo import MongoClient
from sentence_transformers import SentenceTransformer
import os

client = MongoClient(os.environ["MONGODB_URI"])
collection = client["search"]["articles"]

model = SentenceTransformer("all-MiniLM-L6-v2")  # 384 dimensions

documents = [
    {"title": "Introduction to MongoDB", "content": "MongoDB is a document database that stores data in flexible JSON-like documents."},
    {"title": "Vector Search Explained", "content": "Vector search finds similar items by comparing high-dimensional embeddings."},
    {"title": "Building RAG Applications", "content": "Retrieval-augmented generation combines document retrieval with language model generation."},
]

for doc in documents:
    doc["embedding"] = model.encode(doc["content"]).tolist()

collection.insert_many(documents)
print(f"Inserted {len(documents)} documents with embeddings")
```

## Creating the Atlas Vector Search Index

In the Atlas UI, create an index named `semantic_index`:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 384,
      "similarity": "cosine"
    }
  ]
}
```

## Running a Vector Search Query

```python
def semantic_search(query_text, top_k=5):
    query_embedding = model.encode(query_text).tolist()

    pipeline = [
        {
            "$vectorSearch": {
                "index": "semantic_index",
                "path": "embedding",
                "queryVector": query_embedding,
                "numCandidates": top_k * 10,
                "limit": top_k
            }
        },
        {
            "$project": {
                "title": 1,
                "content": 1,
                "score": {"$meta": "vectorSearchScore"},
                "_id": 0
            }
        }
    ]

    return list(collection.aggregate(pipeline))

results = semantic_search("how does document storage work?")
for r in results:
    print(f"Score: {r['score']:.4f} | {r['title']}")
```

## Building the FastAPI Backend

```python
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Semantic Search API")

class SearchRequest(BaseModel):
    query: str
    top_k: int = 5

class SearchResult(BaseModel):
    title: str
    content: str
    score: float

@app.post("/search", response_model=list[SearchResult])
async def search(request: SearchRequest):
    return semantic_search(request.query, request.top_k)

@app.post("/index")
async def add_document(title: str, content: str):
    embedding = model.encode(content).tolist()
    collection.insert_one({"title": title, "content": content, "embedding": embedding})
    return {"status": "indexed"}
```

Run the API:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Combining Semantic and Keyword Search

You can filter vector search results by keyword using a `$match` stage with a regular expression:

```python
filtered_pipeline = [
    {
        "$vectorSearch": {
            "index": "semantic_index",
            "path": "embedding",
            "queryVector": model.encode(query).tolist(),
            "numCandidates": 50,
            "limit": 10
        }
    },
    {
        "$match": {
            "content": {"$regex": keyword, "$options": "i"}
        }
    }
]
```

For true hybrid search that scores and merges results from both vector and full-text search, use `$rankFusion` (MongoDB 8.0+):

```python
hybrid_pipeline = [
    {
        "$rankFusion": {
            "input": {
                "pipelines": {
                    "vector": [
                        {
                            "$vectorSearch": {
                                "index": "semantic_index",
                                "path": "embedding",
                                "queryVector": model.encode(query).tolist(),
                                "numCandidates": 50,
                                "limit": 10
                            }
                        }
                    ],
                    "fulltext": [
                        {
                            "$search": {
                                "index": "text_index",
                                "text": {
                                    "query": query,
                                    "path": "content"
                                }
                            }
                        },
                        {"$limit": 10}
                    ]
                }
            }
        }
    }
]
```

## Best Practices

- Use `numCandidates` at 10x-20x your `limit` for better recall - Atlas evaluates more candidates before returning the top-k results.
- Normalize embeddings to unit length before insertion if using dot product similarity.
- Cache embeddings for popular queries using Redis to reduce inference latency.
- Re-embed documents when you upgrade your embedding model - old and new embeddings are not comparable across model versions.

## Summary

Building a semantic search application with MongoDB Atlas combines sentence transformer embeddings stored in Atlas Vector Search with a FastAPI query layer. The `$vectorSearch` aggregation stage returns semantically ranked results, enabling meaning-based search without keyword matching.
