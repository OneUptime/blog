# How to Store and Query Embeddings from Hugging Face Models in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Vector Search, Hugging Face

Description: Generate vector embeddings with Hugging Face sentence-transformers and store them in MongoDB to enable semantic search with Atlas Vector Search - without the OpenAI API.

---

Hugging Face hosts many open-source embedding models that run locally or on your infrastructure. Using sentence-transformers eliminates per-call API costs and gives you full control over embedding quality and privacy.

## Setup

```bash
pip install pymongo sentence-transformers
```

## Choosing a Model

Popular sentence-transformer models and their dimensions:

```text
all-MiniLM-L6-v2          384 dims  - Fast, lightweight, good quality
all-mpnet-base-v2          768 dims  - Higher quality, slower
multi-qa-MiniLM-L6-cos-v1 384 dims  - Tuned for Q&A retrieval
paraphrase-multilingual-MiniLM-L12-v2  384 dims  - Multilingual
BAAI/bge-large-en-v1.5   1024 dims  - High accuracy, English
```

## Generating Embeddings

```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("all-MiniLM-L6-v2")

def embed(texts: list[str]) -> list[list[float]]:
    # Batch encode - much faster than one at a time
    embeddings = model.encode(texts, normalize_embeddings=True)
    return embeddings.tolist()

def embed_single(text: str) -> list[float]:
    return embed([text])[0]

# Test
vec = embed_single("MongoDB Atlas makes search easy")
print(f"Dimensions: {len(vec)}")  # 384
```

## Storing Documents with Embeddings

```python
from pymongo import MongoClient

client = MongoClient("mongodb+srv://user:pass@cluster.mongodb.net/")
collection = client["knowledge"]["articles"]

articles = [
    {"title": "Introduction to NoSQL Databases", "content": "NoSQL databases provide flexible schemas..."},
    {"title": "MongoDB Index Optimization", "content": "Proper indexing dramatically improves query speed..."},
    {"title": "Replica Set Configuration", "content": "MongoDB replica sets provide high availability..."}
]

# Batch embed all articles for efficiency
texts = [f"{a['title']}. {a['content']}" for a in articles]
embeddings = embed(texts)

for article, emb in zip(articles, embeddings):
    article["embedding"] = emb

collection.insert_many(articles)
print(f"Stored {len(articles)} articles with embeddings")
```

## Batch Processing Large Collections

```python
import pymongo

def backfill_embeddings(collection, batch_size: int = 256):
    docs_to_update = list(collection.find(
        {"embedding": {"$exists": False}},
        {"_id": 1, "title": 1, "content": 1}
    ))

    print(f"Processing {len(docs_to_update)} documents")

    for i in range(0, len(docs_to_update), batch_size):
        batch = docs_to_update[i:i + batch_size]
        texts = [f"{d['title']}. {d['content']}" for d in batch]
        embeddings = embed(texts)

        updates = [
            {"_id": d["_id"], "embedding": emb}
            for d, emb in zip(batch, embeddings)
        ]
        collection.bulk_write([
            pymongo.UpdateOne({"_id": u["_id"]}, {"$set": {"embedding": u["embedding"]}})
            for u in updates
        ])
        print(f"Updated {min(i + batch_size, len(docs_to_update))}/{len(docs_to_update)}")
```

## Create the Atlas Vector Search Index

For 384-dimensional embeddings from all-MiniLM-L6-v2:

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

## Querying Semantically

```python
def semantic_search(query: str, limit: int = 5) -> list:
    query_vec = embed_single(query)

    results = collection.aggregate([
        {
            "$vectorSearch": {
                "index": "vector_index",
                "path": "embedding",
                "queryVector": query_vec,
                "numCandidates": limit * 10,
                "limit": limit
            }
        },
        {
            "$project": {
                "title": 1,
                "content": 1,
                "score": {"$meta": "vectorSearchScore"}
            }
        }
    ])
    return list(results)

results = semantic_search("how to speed up MongoDB queries")
for r in results:
    print(f"[{r['score']:.4f}] {r['title']}")
```

## Running the Model on GPU

If you have a CUDA-capable GPU, sentence-transformers will use it automatically:

```python
model = SentenceTransformer("BAAI/bge-large-en-v1.5", device="cuda")
```

This reduces embedding time for large collections from hours to minutes.

## Summary

Hugging Face sentence-transformers provide a self-hosted alternative to the OpenAI embeddings API. Choose a model based on your dimension and quality requirements, batch-encode documents for efficiency, store the resulting vectors in MongoDB document fields, and create an Atlas vector search index matching the model's output dimensions. Semantic search then works identically to OpenAI-backed embeddings.
