# How to Use redis-om-node for Object Mapping

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Node.js, RedisOM, Object Mapping

Description: Learn how to use redis-om-node to define entity models backed by Redis, enabling type-safe CRUD operations and full-text search in Node.js.

---

redis-om-node is the Node.js counterpart of redis-om-python. It provides an entity-model layer on top of Redis, supporting JSON storage, automatic indexing, and a fluent query API without writing raw Redis commands.

## Installation

```bash
npm install redis-om redis
```

Requires Redis Stack or Redis with RedisJSON and RediSearch:

```bash
docker run -d -p 6379:6379 redis/redis-stack-server:latest
```

## Defining a Schema and Repository

```javascript
import { createClient } from 'redis';
import { Schema, Repository } from 'redis-om';

const redis = createClient();
await redis.connect();

const productSchema = new Schema('product', {
  name: { type: 'text' },
  price: { type: 'number' },
  category: { type: 'string' },
  inStock: { type: 'boolean' },
  tags: { type: 'string[]' },
});

const productRepo = new Repository(productSchema, redis);
await productRepo.createIndex();
```

## Creating Entities

```javascript
import { EntityId } from 'redis-om';

const product = await productRepo.save({
  name: 'Wireless Keyboard',
  price: 49.99,
  category: 'electronics',
  inStock: true,
  tags: ['keyboard', 'wireless', 'usb'],
});

const id = product[EntityId];
console.log('Saved with ID:', id);
```

## Fetching and Updating

```javascript
// Fetch by ID
const found = await productRepo.fetch(id);
console.log(found.name);

// Update
found.price = 44.99;
await productRepo.save(found);
```

## Searching

```javascript
// Find all in-stock electronics
const results = await productRepo.search()
  .where('category').equals('electronics')
  .and('inStock').true()
  .return.all();

for (const p of results) {
  console.log(p.name, p.price);
}
```

## Full-Text Search

```javascript
// Full-text search on 'name' field (type: 'text')
const keyboards = await productRepo.search()
  .where('name').matches('keyboard')
  .return.all();
```

## Sorted and Paginated Results

```javascript
const page = await productRepo.search()
  .where('category').equals('electronics')
  .sortBy('price', 'ASC')
  .return.page(0, 10); // offset, count
```

## Expiring Entities (TTL)

```javascript
// Set entity to expire in 1 hour
await productRepo.expire(id, 3600);
```

## Deleting Entities

```javascript
await productRepo.remove(id);
```

## TypeScript Example

```typescript
import { createClient } from 'redis';
import { Schema, Repository, Entity } from 'redis-om';

interface Product extends Entity {
  name: string;
  price: number;
  category: string;
}

const schema = new Schema<Product>('product', {
  name: { type: 'text' },
  price: { type: 'number' },
  category: { type: 'string' },
});

const redis = createClient();
await redis.connect();
const repo = new Repository<Product>(schema, redis);
await repo.createIndex();
```

## Summary

redis-om-node provides a schema-driven object model over Redis, letting Node.js developers define entities with typed fields, save them as JSON documents, and query them with a fluent API. It eliminates boilerplate Redis commands for common CRUD patterns and supports full-text search, sorting, and pagination through the RediSearch module.
