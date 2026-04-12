# What Is MongoDB Atlas Vector Search

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Vector Search, Embedding, AI, Semantic Search

Description: MongoDB Atlas Vector Search stores and queries high-dimensional vector embeddings to enable semantic similarity search for AI, recommendation, and RAG applications.

---

## Overview

MongoDB Atlas Vector Search is a capability that lets you store vector embeddings alongside your regular MongoDB documents and perform Approximate Nearest Neighbor (ANN) searches across those vectors. Vector embeddings are numerical representations of data (text, images, audio) produced by machine learning models. Two items with similar meaning or content will have vectors that are close together in high-dimensional space, enabling semantic search that understands intent rather than matching exact keywords.

Atlas Vector Search is commonly used for semantic search, recommendation engines, retrieval-augmented generation (RAG) with LLMs, image similarity, and anomaly detection.

## How Vector Search Works

1. You generate embeddings for your documents using a model (OpenAI, Cohere, sentence-transformers, etc.)
2. You store the embedding as an array field in the MongoDB document
3. You create a Vector Search index on that field
4. At query time, you embed the user's query and search for documents with the most similar vectors using cosine similarity or dot product

## Storing Vectors in MongoDB

```javascript
// Document with a vector embedding field
db.articles.insertOne({
  title: "Understanding Kubernetes",
  content: "...",
  embedding: [0.023, -0.041, 0.187, ...] // 1536-dimension vector from OpenAI
})
```

## Creating a Vector Search Index

Vector Search indexes are created via the Atlas UI, API, or CLI:

```json
{
  "name": "vector_index",
  "type": "vectorSearch",
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

Supported similarity functions: `cosine`, `euclidean`, `dotProduct`.

## Querying with $vectorSearch

```javascript
// Generate embedding for the user's query (in your application code)
const queryEmbedding = await openai.embeddings.create({
  model: "text-embedding-3-small",
  input: "how to scale microservices"
});

// Search for similar documents
const results = await db.collection("articles").aggregate([
  {
    $vectorSearch: {
      index: "vector_index",
      path: "embedding",
      queryVector: queryEmbedding.data[0].embedding,
      numCandidates: 100,
      limit: 5
    }
  },
  {
    $project: {
      title: 1,
      content: 1,
      score: { $meta: "vectorSearchScore" }
    }
  }
]).toArray();
```

## Hybrid Search: Combining Vector and Full-Text

Atlas Search and Atlas Vector Search can be combined to blend semantic and keyword relevance. The deprecated `knnBeta` operator has been replaced by the standalone `$vectorSearch` stage. You can use `$unionWith` to run both pipelines and merge results:

```javascript
db.articles.aggregate([
  {
    $vectorSearch: {
      index: "vector_index",
      path: "embedding",
      queryVector: queryEmbedding,
      numCandidates: 100,
      limit: 10
    }
  },
  { $addFields: { vs_score: { $meta: "vectorSearchScore" } } },
  {
    $unionWith: {
      coll: "articles",
      pipeline: [
        {
          $search: {
            index: "default",
            text: { query: "kubernetes scaling", path: "content" }
          }
        },
        { $limit: 10 },
        { $addFields: { fts_score: { $meta: "searchScore" } } }
      ]
    }
  }
])
```

## RAG Pattern with Atlas Vector Search

Vector Search is a core component of Retrieval-Augmented Generation (RAG):

```javascript
// Step 1: Embed the user's question
// Step 2: Find relevant documents with $vectorSearch
// Step 3: Pass retrieved documents as context to the LLM
const context = results.map(r => r.content).join("\n\n");
const answer = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [
    { role: "system", content: `Answer using this context:\n${context}` },
    { role: "user", content: userQuestion }
  ]
});
```

## Pre-Filtering

Narrow the search space before the ANN step using metadata filters:

```javascript
{
  $vectorSearch: {
    index: "vector_index",
    path: "embedding",
    queryVector: [...],
    numCandidates: 100,
    limit: 5,
    filter: { category: "kubernetes", publishedAfter: { $gte: new Date("2025-01-01") } }
  }
}
```

## Summary

MongoDB Atlas Vector Search enables storing and querying high-dimensional embeddings alongside regular document data. It powers semantic search, RAG pipelines, and recommendation systems by finding documents whose meaning is similar to a query vector. Combined with Atlas Search for hybrid queries, it provides a complete search and AI retrieval layer within your MongoDB cluster.
