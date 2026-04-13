# How to Generate and Store Vector Embeddings with OpenAI in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, OpenAI, Vector Search

Description: Generate vector embeddings with the OpenAI API and store them in MongoDB documents to enable semantic search with Atlas Vector Search.

---

Vector embeddings convert text into dense numeric arrays that capture semantic meaning. Storing these embeddings alongside your documents in MongoDB enables semantic search - finding results based on meaning rather than keyword overlap.

## Setup

Install the required packages:

```bash
pip install pymongo openai
```

## Generating Embeddings with OpenAI

The `text-embedding-3-small` model produces 1536-dimensional vectors. For lower storage overhead, `text-embedding-3-small` with `dimensions=512` reduces size with minimal quality loss:

```python
from openai import OpenAI

client = OpenAI(api_key="YOUR_API_KEY")

def get_embedding(text: str, model: str = "text-embedding-3-small") -> list[float]:
    text = text.replace("\n", " ")
    response = client.embeddings.create(input=[text], model=model)
    return response.data[0].embedding
```

## Storing Documents with Embeddings

Generate and insert documents with their embedding vectors:

```python
from pymongo import MongoClient

mongo = MongoClient("mongodb+srv://user:pass@cluster.mongodb.net/")
db = mongo["mydb"]
collection = db["articles"]

articles = [
    {"title": "Getting Started with MongoDB", "body": "MongoDB is a document database..."},
    {"title": "Indexing Best Practices", "body": "Indexes improve query performance..."},
    {"title": "Aggregation Pipeline Guide", "body": "The aggregation pipeline processes..."}
]

for article in articles:
    text_to_embed = f"{article['title']} {article['body']}"
    article["embedding"] = get_embedding(text_to_embed)

collection.insert_many(articles)
print(f"Inserted {len(articles)} articles with embeddings")
```

## Batch Processing Existing Documents

For large collections, process documents in batches to respect rate limits:

```python
import time
from pymongo import UpdateOne

def backfill_embeddings(collection, batch_size=100):
    cursor = collection.find(
        {"embedding": {"$exists": False}},
        {"_id": 1, "title": 1, "body": 1}
    )

    batch = []
    for doc in cursor:
        batch.append(doc)
        if len(batch) == batch_size:
            process_batch(collection, batch)
            batch = []
            time.sleep(0.5)  # respect rate limits

    if batch:
        process_batch(collection, batch)

def process_batch(collection, docs):
    texts = [f"{d['title']} {d['body']}" for d in docs]
    response = client.embeddings.create(
        input=texts,
        model="text-embedding-3-small"
    )

    updates = []
    for doc, emb_data in zip(docs, response.data):
        updates.append(
            UpdateOne(
                {"_id": doc["_id"]},
                {"$set": {"embedding": emb_data.embedding}}
            )
        )
    collection.bulk_write(updates)
    print(f"Updated {len(updates)} documents")
```

## Creating the Atlas Vector Search Index

After storing embeddings, create a vector search index in Atlas UI or via the API:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1536,
      "similarity": "cosine"
    }
  ]
}
```

## Querying with $vectorSearch

Find semantically similar documents to a query string:

```python
def semantic_search(query: str, limit: int = 5):
    query_embedding = get_embedding(query)

    results = collection.aggregate([
        {
            "$vectorSearch": {
                "index": "vector_index",
                "path": "embedding",
                "queryVector": query_embedding,
                "numCandidates": 100,
                "limit": limit
            }
        },
        {
            "$project": {
                "title": 1,
                "score": {"$meta": "vectorSearchScore"}
            }
        }
    ])
    return list(results)

matches = semantic_search("how to optimize database queries")
for m in matches:
    print(m["title"], round(m["score"], 4))
```

## Summary

Generating and storing vector embeddings involves calling the OpenAI embeddings API per document, saving the resulting array to a MongoDB field, and creating a vector search index pointing to that field. Use batch processing with rate limiting for backfilling large collections, and use `text-embedding-3-small` with reduced dimensions to balance cost and quality.
