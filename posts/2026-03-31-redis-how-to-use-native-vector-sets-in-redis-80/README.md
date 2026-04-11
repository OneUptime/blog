# How to Use Native Vector Sets in Redis 8.0+

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Vector Set, Similarity Search, Redis 8.0, Machine Learning

Description: Use Redis 8.0 native Vector Sets with VADD, VDIM, and VSIM commands to store and search high-dimensional vectors for similarity and recommendation systems.

---

## What Are Redis Vector Sets

Redis 8.0 introduced native Vector Sets as a first-class data type for storing and searching high-dimensional vectors. Unlike RediSearch's vector search (which requires a module), Vector Sets are built into Redis 8.0 core.

Key commands:
- `VADD key VALUES numElements val1 val2 ... element` - add a vector
- `VDIM key` - get vector dimensionality
- `VCARD key` - get count of vectors
- `VEMB key element` - retrieve a vector by element name
- `VSIM key ELE element [COUNT n] [WITHSCORES]` - find similar vectors by element
- `VSIM key VALUES numElements val1 val2 ... [COUNT n] [WITHSCORES]` - find similar vectors by raw vector
- `VREM key element` - delete a vector
- `VISMEMBER key element` - check if element exists

## Adding Vectors

```bash
# Add a 3-dimensional vector
redis-cli VADD myvectors VALUES 3 0.1 0.2 0.3 item1
redis-cli VADD myvectors VALUES 3 0.4 0.5 0.6 item2
redis-cli VADD myvectors VALUES 3 0.1 0.21 0.31 item3

# Check dimensionality
redis-cli VDIM myvectors
# Output: 3

# Count vectors
redis-cli VCARD myvectors
# Output: 3
```

## Similarity Search

```bash
# Find the 2 most similar vectors to item1
redis-cli VSIM myvectors ELE item1 COUNT 2 WITHSCORES

# Output (cosine similarity):
# 1) "item1"
# 2) "1.0"
# 3) "item3"
# 4) "0.9998"
```

## Node.js with ioredis

```javascript
const Redis = require('ioredis');
const redis = new Redis({ host: process.env.REDIS_HOST || 'localhost' });

// Helper to add a vector
async function addVector(setKey, element, vector) {
  const dims = vector.length;
  await redis.call(
    'VADD', setKey, 'VALUES', dims,
    ...vector.map(String),
    element
  );
}

// Helper to find similar items
async function findSimilar(setKey, element, count = 10) {
  const results = await redis.call(
    'VSIM', setKey, 'ELE', element,
    'COUNT', count,
    'WITHSCORES'
  );

  // Parse results: [element, score, element, score, ...]
  const pairs = [];
  for (let i = 0; i < results.length; i += 2) {
    pairs.push({
      element: results[i],
      score: parseFloat(results[i + 1]),
    });
  }

  return pairs;
}

// Example: Product recommendation vectors
const PRODUCT_VECTORS = 'product:vectors';

// Add product embeddings (usually from ML model)
await addVector(PRODUCT_VECTORS, 'product:1', [0.1, 0.5, 0.3, 0.7, 0.2]);
await addVector(PRODUCT_VECTORS, 'product:2', [0.2, 0.4, 0.3, 0.8, 0.1]);
await addVector(PRODUCT_VECTORS, 'product:3', [0.9, 0.1, 0.8, 0.1, 0.3]);
await addVector(PRODUCT_VECTORS, 'product:4', [0.1, 0.6, 0.2, 0.7, 0.3]);

// Find products similar to product:1
const similar = await findSimilar(PRODUCT_VECTORS, 'product:1', 3);
console.log('Similar products:', similar);
// Similar products: [
//   { element: 'product:1', score: 1.0 },
//   { element: 'product:4', score: 0.9987 },
//   { element: 'product:2', score: 0.9956 },
// ]
```

## Vector Search by Raw Vector

Search for items similar to a query vector (not just existing elements):

```bash
# Search by providing a raw vector (using VSIM with VALUES instead of ELE)
redis-cli VSIM myvectors VALUES 3 0.11 0.21 0.29 COUNT 5
```

## Real-World Use Case: Semantic Search

```javascript
const Redis = require('ioredis');
const redis = new Redis({ host: process.env.REDIS_HOST || 'localhost' });

const ARTICLE_VECTORS = 'articles:vectors';

async function indexArticle(articleId, embedding) {
  await redis.call(
    'VADD', ARTICLE_VECTORS, 'VALUES', embedding.length,
    ...embedding.map(String),
    `article:${articleId}`
  );
}

async function semanticSearch(queryEmbedding, topK = 5) {
  // Use VSIM VALUES to search by raw vector
  const results = await redis.call(
    'VSIM', ARTICLE_VECTORS,
    'VALUES', queryEmbedding.length,
    ...queryEmbedding.map(String),
    'COUNT', topK,
    'WITHSCORES'
  );

  const parsed = [];
  for (let i = 0; i < results.length; i += 2) {
    const articleId = results[i].replace('article:', '');
    parsed.push({ articleId, similarity: parseFloat(results[i + 1]) });
  }

  return parsed;
}

// Index articles with their embeddings
await indexArticle('redis-basics', [0.2, 0.8, 0.1, 0.5, 0.3]);
await indexArticle('redis-cluster', [0.3, 0.7, 0.2, 0.6, 0.2]);
await indexArticle('mysql-tutorial', [0.8, 0.1, 0.7, 0.1, 0.9]);

// Search for articles similar to a query
const queryVector = [0.25, 0.75, 0.15, 0.55, 0.25];
const results = await semanticSearch(queryVector, 3);
console.log('Relevant articles:', results);
```

## Comparing with RediSearch Vector Search

```text
Redis 8.0 Vector Sets:
- Native data type, no module required
- Simple VADD/VSIM API
- Best for moderate-scale similarity search
- Integrated with Redis eviction and persistence

RediSearch VSS (Vector Similarity Search):
- Module-based, more features
- HNSW and FLAT index types
- Better for large-scale production deployments
- More advanced filtering options
```

## Managing Vector Sets

```bash
# Get a specific vector by element name
redis-cli VEMB myvectors item1

# Check if an element exists
redis-cli VISMEMBER myvectors item1
# Returns: 1 (exists) or 0 (not found)

# Delete a specific vector
redis-cli VREM myvectors item1

# Delete the entire vector set
redis-cli DEL myvectors
```

## Summary

Redis 8.0 native Vector Sets provide a built-in solution for vector similarity search without requiring external modules. Use VADD to store embeddings, VSIM to find similar items by element name or raw vector, and VCARD/VDIM to inspect the vector set. For production semantic search, recommendation systems, or anomaly detection at moderate scale, Vector Sets offer a simpler alternative to the RediSearch module-based approach.
