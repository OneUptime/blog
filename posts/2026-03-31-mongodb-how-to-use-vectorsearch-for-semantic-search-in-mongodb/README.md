# How to Use $vectorSearch for Semantic Search in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Vector Search, Semantic Search, Atlas, Machine Learning

Description: Learn how to use MongoDB's $vectorSearch aggregation stage to perform semantic similarity searches using vector embeddings in Atlas.

---

## What Is $vectorSearch?

`$vectorSearch` is a MongoDB aggregation stage available in Atlas that enables approximate nearest neighbor (ANN) and exact nearest neighbor (ENN) searches over vector embeddings. Instead of matching exact keywords, it finds semantically similar documents based on numeric vector representations.

This is the foundation of modern AI-powered search, recommendation engines, and retrieval-augmented generation (RAG) systems.

## Prerequisites

- MongoDB Atlas cluster (M10 or higher for dedicated, or Atlas Vector Search-enabled)
- An Atlas Vector Search index on the collection
- Vector embeddings stored in a document field

## Step 1: Store Vector Embeddings

Each document must contain a field with a vector (array of floating-point numbers). Use a model like OpenAI `text-embedding-3-small` or Sentence Transformers to generate embeddings.

```javascript
db.articles.insertOne({
  title: "Introduction to machine learning",
  content: "Machine learning is a subset of artificial intelligence...",
  embedding: [0.023, -0.145, 0.087, /* ... 1536 dimensions total */]
})
```

## Step 2: Create an Atlas Vector Search Index

In the Atlas UI, navigate to your collection and select "Search Indexes", then create a Vector Search index:

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

Available similarity metrics:
- `cosine` - good for normalized text embeddings
- `euclidean` - good for non-normalized vectors
- `dotProduct` - fast, use when vectors are unit-normalized

## Step 3: Run a $vectorSearch Query

```javascript
const queryEmbedding = [0.021, -0.143, 0.089, /* ... */]; // embed your query

db.articles.aggregate([
  {
    $vectorSearch: {
      index: "vector_index",
      path: "embedding",
      queryVector: queryEmbedding,
      numCandidates: 150,
      limit: 10
    }
  },
  {
    $project: {
      _id: 0,
      title: 1,
      content: 1,
      score: { $meta: "vectorSearchScore" }
    }
  }
])
```

`numCandidates` must be greater than or equal to `limit`. Higher values improve recall at the cost of performance.

## Step 4: Retrieve the Relevance Score

Use `{ $meta: "vectorSearchScore" }` in a `$project` stage to include the similarity score:

```javascript
db.articles.aggregate([
  {
    $vectorSearch: {
      index: "vector_index",
      path: "embedding",
      queryVector: queryEmbedding,
      numCandidates: 200,
      limit: 5
    }
  },
  {
    $project: {
      title: 1,
      score: { $meta: "vectorSearchScore" }
    }
  }
])
```

Output:

```text
{ title: "Introduction to machine learning", score: 0.9823 }
{ title: "Deep learning fundamentals", score: 0.9701 }
{ title: "Neural networks explained", score: 0.9645 }
```

## Step 5: Add Pre-Filters for Hybrid Filtering

Combine semantic similarity with exact filters using the `filter` option:

```javascript
db.articles.aggregate([
  {
    $vectorSearch: {
      index: "vector_index",
      path: "embedding",
      queryVector: queryEmbedding,
      numCandidates: 200,
      limit: 10,
      filter: { category: "technology", published: true }
    }
  },
  {
    $project: {
      title: 1,
      category: 1,
      score: { $meta: "vectorSearchScore" }
    }
  }
])
```

For filters to work efficiently, define filter fields in the index definition:

```json
{
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
      "path": "published"
    }
  ]
}
```

## Step 6: Full Node.js Example with OpenAI Embeddings

```javascript
const { MongoClient } = require('mongodb');
const OpenAI = require('openai');

const client = new MongoClient(process.env.MONGODB_URI);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function semanticSearch(query) {
  await client.connect();
  const db = client.db('mydb');
  const collection = db.collection('articles');

  // Generate embedding for the search query
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query
  });
  const queryVector = response.data[0].embedding;

  const results = await collection.aggregate([
    {
      $vectorSearch: {
        index: 'vector_index',
        path: 'embedding',
        queryVector,
        numCandidates: 150,
        limit: 5
      }
    },
    {
      $project: {
        title: 1,
        content: 1,
        score: { $meta: 'vectorSearchScore' }
      }
    }
  ]).toArray();

  return results;
}

semanticSearch("How does backpropagation work?").then(console.log);
```

## Exact Nearest Neighbor (ENN) vs Approximate (ANN)

By default, `$vectorSearch` uses ANN for performance. For exact results on smaller datasets, use `exact: true`:

```javascript
{
  $vectorSearch: {
    index: "vector_index",
    path: "embedding",
    queryVector: queryEmbedding,
    exact: true,
    limit: 5
  }
}
```

ENN scans all vectors - use it only when perfect recall matters more than speed.

## Summary

`$vectorSearch` enables semantic search in MongoDB Atlas by querying vector embeddings with ANN or ENN algorithms. You define a Vector Search index, store embeddings in documents, and run aggregation pipelines with `$vectorSearch` to retrieve semantically similar results. Combine it with `filter` fields and `$meta: "vectorSearchScore"` to build powerful AI-driven search applications.
