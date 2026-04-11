# How to Use RediSearch in Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Node.js, RediSearch, Full-Text Search, ioredis

Description: Learn how to use RediSearch in Node.js to create search indexes over Redis hashes, perform full-text search queries, and filter by numeric and tag fields.

---

## What Is RediSearch?

RediSearch adds full-text search, secondary indexing, and aggregation to Redis. It indexes Redis Hash or JSON documents and supports:

- Full-text search with TF-IDF ranking
- Numeric and geo range filters
- Tag field filtering
- Aggregations and faceted search
- Auto-complete

## Setup

```bash
# Redis Stack includes RediSearch
docker run -p 6379:6379 redis/redis-stack:latest

npm install ioredis
```

## Creating an Index

Use raw `FT.CREATE` commands with ioredis:

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function createProductIndex() {
  try {
    await redis.call(
      'FT.CREATE', 'idx:products',
      'ON', 'HASH',
      'PREFIX', '1', 'product:',
      'SCHEMA',
      'title', 'TEXT', 'WEIGHT', '5.0',
      'description', 'TEXT',
      'price', 'NUMERIC', 'SORTABLE',
      'category', 'TAG',
      'rating', 'NUMERIC', 'SORTABLE'
    );
    console.log('Index created');
  } catch (err) {
    if (err.message.includes('Index already exists')) {
      console.log('Index already exists');
    } else {
      throw err;
    }
  }
}

createProductIndex();
```

## Indexing Documents

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function indexProducts() {
  const products = [
    { key: 'product:1', title: 'Wireless Bluetooth Headphones', description: 'Premium sound with noise cancellation', price: 79.99, category: 'electronics', rating: 4.5 },
    { key: 'product:2', title: 'Ergonomic Office Chair', description: 'Lumbar support and adjustable height', price: 299.00, category: 'furniture', rating: 4.2 },
    { key: 'product:3', title: 'Portable Bluetooth Speaker', description: 'Waterproof speaker with 20h battery', price: 49.99, category: 'electronics', rating: 4.7 },
    { key: 'product:4', title: 'Standing Desk', description: 'Electric height adjustable desk', price: 499.00, category: 'furniture', rating: 4.8 },
  ];

  const pipeline = redis.pipeline();
  for (const p of products) {
    pipeline.hset(p.key, {
      title: p.title,
      description: p.description,
      price: p.price.toString(),
      category: p.category,
      rating: p.rating.toString()
    });
  }
  await pipeline.exec();
  console.log(`Indexed ${products.length} products`);
}

indexProducts();
```

## Basic Search

```javascript
const Redis = require('ioredis');
const redis = new Redis();

function parseSearchResults(raw) {
  const total = raw[0];
  const docs = [];

  for (let i = 1; i < raw.length; i += 2) {
    const docId = raw[i];
    const fields = raw[i + 1];
    const doc = { id: docId };

    for (let j = 0; j < fields.length; j += 2) {
      doc[fields[j]] = fields[j + 1];
    }
    docs.push(doc);
  }

  return { total, docs };
}

async function searchProducts(query) {
  const raw = await redis.call('FT.SEARCH', 'idx:products', query, 'LIMIT', '0', '10');
  return parseSearchResults(raw);
}

async function main() {
  const results = await searchProducts('bluetooth');
  console.log(`Found ${results.total} products`);
  results.docs.forEach(doc => console.log(`  ${doc.id}: ${doc.title}`));
}

main();
```

## Filtered Searches

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function filteredSearch() {
  // Search with price filter
  const affordable = await redis.call(
    'FT.SEARCH', 'idx:products',
    'bluetooth',
    'FILTER', 'price', '0', '100',
    'LIMIT', '0', '10'
  );
  console.log('Bluetooth under $100:', affordable[0], 'results');

  // Tag filter for category
  const electronics = await redis.call(
    'FT.SEARCH', 'idx:products',
    '@category:{electronics}',
    'LIMIT', '0', '10'
  );
  console.log('Electronics:', electronics[0], 'results');

  // Combined text + tag + numeric filter
  const combined = await redis.call(
    'FT.SEARCH', 'idx:products',
    'speaker @category:{electronics}',
    'FILTER', 'rating', '4', '5',
    'LIMIT', '0', '10'
  );
  console.log('Top-rated speakers:', combined[0], 'results');
}

filteredSearch();
```

## Sorting Results

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function sortedSearch() {
  // Sort by price ascending
  const byPriceAsc = await redis.call(
    'FT.SEARCH', 'idx:products', '*',
    'SORTBY', 'price', 'ASC',
    'LIMIT', '0', '5'
  );

  // Sort by rating descending
  const byRatingDesc = await redis.call(
    'FT.SEARCH', 'idx:products', '*',
    'SORTBY', 'rating', 'DESC',
    'LIMIT', '0', '5'
  );

  console.log('By price:', byPriceAsc);
  console.log('By rating:', byRatingDesc);
}
```

## Aggregations

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function aggregate() {
  // Count and average price per category
  const result = await redis.call(
    'FT.AGGREGATE', 'idx:products', '*',
    'GROUPBY', '1', '@category',
    'REDUCE', 'COUNT', '0', 'AS', 'count',
    'REDUCE', 'AVG', '1', '@price', 'AS', 'avg_price',
    'SORTBY', '2', '@count', 'DESC'
  );

  console.log('Products per category:');
  // result[0] is count, rest are rows
  for (let i = 1; i < result.length; i++) {
    const row = result[i];
    const category = row[1];
    const count = row[3];
    const avgPrice = parseFloat(row[5]).toFixed(2);
    console.log(`  ${category}: ${count} products, avg $${avgPrice}`);
  }
}

aggregate();
```

## Dropping an Index

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function dropIndex() {
  // Drop index but keep documents
  await redis.call('FT.DROPINDEX', 'idx:products');

  // Drop index and delete indexed documents (documents with matching prefixes)
  await redis.call('FT.DROPINDEX', 'idx:products', 'DD');
}

dropIndex();
```

## Summary

RediSearch in Node.js uses ioredis `call()` to invoke `FT.CREATE`, `FT.SEARCH`, and `FT.AGGREGATE` commands. Create indexes with schema definitions for TEXT, NUMERIC, and TAG fields, store documents as Redis Hashes with matching prefixes, then search with full-text queries combined with filters and sorting. Parse the raw array response from `FT.SEARCH` by iterating in pairs to extract document IDs and field values.
