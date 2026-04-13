# How to Set Up Atlas Vector Search Indexes in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Search, Vector Search, AI

Description: Learn how to create and query Atlas Vector Search indexes in MongoDB for semantic search, recommendation systems, and AI-powered similarity search using embeddings.

---

## Overview

MongoDB Atlas Vector Search enables semantic similarity search using vector embeddings. Unlike traditional text search that matches keywords, vector search finds documents that are semantically similar to a query - even if they use completely different words. This powers use cases like semantic document search, product recommendations, image similarity, and question answering over your data.

## How Vector Search Works

1. Documents are stored with an embedding field - an array of floats representing the document's semantic meaning
2. A vector search index is created on this embedding field
3. When querying, the search query is converted to an embedding using the same model
4. Atlas finds documents whose embeddings are nearest to the query embedding

```text
User query: "wireless audio devices"
           |
     Embedding model
           |
    [0.23, -0.45, 0.78, ...]  (1536-dimensional vector)
           |
    Atlas Vector Search
           |
    Nearest neighbors in vector space
           |
    Results: headphones, earbuds, Bluetooth speakers
    (Even though these words were never in the query)
```

## Step 1 - Generate and Store Embeddings

First, add embeddings to your documents. Use OpenAI, Cohere, or any embedding model:

```python
# Python script to add embeddings to MongoDB documents
import os
from pymongo import MongoClient
from openai import OpenAI

mongo_client = MongoClient(os.environ['MONGODB_URI'])
openai_client = OpenAI(api_key=os.environ['OPENAI_API_KEY'])

db = mongo_client['mydb']
collection = db['products']

def get_embedding(text):
    response = openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return response.data[0].embedding

# Add embeddings to existing documents
for product in collection.find({ "embedding": { "$exists": False } }):
    # Create text to embed
    text = f"{product['name']} {product.get('description', '')} {product.get('category', '')}"
    
    # Get embedding
    embedding = get_embedding(text)
    
    # Update document with embedding
    collection.update_one(
        { "_id": product["_id"] },
        { "$set": { "embedding": embedding } }
    )
    print(f"Added embedding for: {product['name']}")

print("Done adding embeddings")
```

## Step 2 - Create the Vector Search Index

Create the index in Atlas UI or via the Atlas Administration API:

### Using the Atlas UI

1. Go to your Atlas cluster
2. Click "Atlas Search" tab
3. Click "Create Search Index"
4. Select "Atlas Vector Search"
5. Choose JSON editor and enter:

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

Key options:
- `numDimensions` - must match your embedding model's output size (OpenAI text-embedding-3-small: 1536, text-embedding-3-large: 3072)
- `similarity` - distance metric: `cosine`, `euclidean`, or `dotProduct`

### Using the Atlas API

```bash
curl -X POST   "https://cloud.mongodb.com/api/atlas/v2/groups/{GROUP_ID}/clusters/{CLUSTER_NAME}/search/indexes"   -H "Content-Type: application/json"   -u "${PUBLIC_KEY}:${PRIVATE_KEY}"   --digest   -d '{
    "collectionName": "products",
    "database": "mydb",
    "name": "vector_index",
    "type": "vectorSearch",
    "definition": {
      "fields": [
        {
          "type": "vector",
          "path": "embedding",
          "numDimensions": 1536,
          "similarity": "cosine"
        },
        {
          "type": "filter",
          "path": "category"
        },
        {
          "type": "filter",
          "path": "inStock"
        }
      ]
    }
  }'
```

## Step 3 - Query with $vectorSearch

```javascript
// Basic vector similarity search
db.products.aggregate([
  {
    $vectorSearch: {
      index: "vector_index",
      path: "embedding",
      queryVector: [0.23, -0.45, 0.78, ...],  // your query embedding
      numCandidates: 100,  // number of candidates to consider (>= limit)
      limit: 10            // number of results to return
    }
  },
  {
    $project: {
      name: 1,
      category: 1,
      price: 1,
      score: { $meta: "vectorSearchScore" }
    }
  }
])
```

## Step 4 - Full Semantic Search Implementation

```python
# semantic-search.py
import os
from pymongo import MongoClient
from openai import OpenAI

mongo_client = MongoClient(os.environ['MONGODB_URI'])
openai_client = OpenAI(api_key=os.environ['OPENAI_API_KEY'])

db = mongo_client['mydb']
collection = db['products']

def semantic_search(query_text, limit=10, filters=None):
    # Convert query to embedding
    response = openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=query_text
    )
    query_vector = response.data[0].embedding
    
    # Build vector search stage
    vector_search_stage = {
        "$vectorSearch": {
            "index": "vector_index",
            "path": "embedding",
            "queryVector": query_vector,
            "numCandidates": limit * 10,
            "limit": limit
        }
    }
    
    # Add pre-filters if provided
    if filters:
        vector_search_stage["$vectorSearch"]["filter"] = filters
    
    # Run aggregation
    results = collection.aggregate([
        vector_search_stage,
        {
            "$project": {
                "name": 1,
                "description": 1,
                "category": 1,
                "price": 1,
                "score": { "$meta": "vectorSearchScore" }
            }
        }
    ])
    
    return list(results)

# Example usage
results = semantic_search("wireless audio for working out")
for r in results:
    print(f"{r['score']:.4f} - {r['name']} (${r['price']})")

# With filters (only in-stock items)
results = semantic_search(
    "comfortable headphones for travel",
    filters={"inStock": True}
)
```

## Pre-Filtering with Vector Search

Filter documents before the vector similarity computation:

```javascript
db.products.aggregate([
  {
    $vectorSearch: {
      index: "vector_index",
      path: "embedding",
      queryVector: queryEmbedding,
      numCandidates: 150,
      limit: 10,
      filter: {
        $and: [
          { inStock: true },
          { price: { $lte: 500 } }
        ]
      }
    }
  },
  {
    $project: {
      name: 1,
      price: 1,
      score: { $meta: "vectorSearchScore" }
    }
  }
])
```

Pre-filter fields must be indexed as `filter` type in the vector index definition.

## Combining Vector Search with Keyword Search (Hybrid Search)

```javascript
// Run both vector search and text search, then combine scores
db.products.aggregate([
  {
    $search: {
      index: "text_index",
      text: { query: userQuery, path: "name" }
    }
  },
  { $addFields: { textScore: { $meta: "searchScore" } } },
  { $limit: 50 },
  // Combine with vector scores using $lookup or post-processing
])
```

## Summary

MongoDB Atlas Vector Search enables semantic similarity search by storing embedding vectors alongside documents and indexing them with approximate nearest neighbor (ANN) algorithms. The `$vectorSearch` aggregation stage finds documents whose embeddings are most similar to a query vector, measured by cosine similarity, Euclidean distance, or dot product. Pre-filter fields in the index definition enable combining semantic search with structured filters like price ranges and availability. This unlocks AI-powered search, recommendation, and question-answering use cases directly within your existing MongoDB data layer.
