# How to Use mongodb-memory-server for In-Memory Testing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Testing, In-Memory, Jest, Node.js

Description: Learn how to use mongodb-memory-server to run an in-memory MongoDB instance in your test suite for fast, isolated integration tests with no external dependencies.

---

## What Is mongodb-memory-server?

`mongodb-memory-server` is an npm package that downloads and runs a real MongoDB binary in memory during your tests. Unlike mocking, it gives you a true MongoDB instance, which means indexes, schema validation, aggregations, and transactions all work as expected - but without requiring a separate database server.

## Installation

```bash
npm install --save-dev mongodb-memory-server mongodb
```

The first run downloads the MongoDB binary. Subsequent runs use the cached binary.

## Basic Setup with Jest

```javascript
// tests/mongoSetup.js
const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');

let mongod;
let client;

module.exports.connect = async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  client = new MongoClient(uri);
  await client.connect();
  return client;
};

module.exports.disconnect = async () => {
  await client.close();
  await mongod.stop();
};

module.exports.clearDatabase = async () => {
  const db = client.db();
  const collections = await db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
};
```

## Writing Tests with the In-Memory Server

```javascript
// tests/product.test.js
const { connect, disconnect, clearDatabase } = require('./mongoSetup');

let client;
let db;

beforeAll(async () => {
  client = await connect();
  db = client.db();
  // Create indexes like production
  await db.collection('products').createIndex({ sku: 1 }, { unique: true });
});

afterAll(async () => { await disconnect(); });
beforeEach(async () => { await clearDatabase(); });

describe('Product collection', () => {
  it('inserts and retrieves a product', async () => {
    const products = db.collection('products');
    await products.insertOne({ sku: 'ABC-001', name: 'Widget', price: 9.99 });
    const found = await products.findOne({ sku: 'ABC-001' });
    expect(found.name).toBe('Widget');
    expect(found.price).toBe(9.99);
  });

  it('throws on duplicate SKU', async () => {
    const products = db.collection('products');
    await products.insertOne({ sku: 'ABC-001', name: 'Widget' });
    await expect(
      products.insertOne({ sku: 'ABC-001', name: 'Widget Copy' })
    ).rejects.toMatchObject({ code: 11000 });
  });

  it('runs aggregation pipeline correctly', async () => {
    const products = db.collection('products');
    await products.insertMany([
      { category: 'tools', price: 20 },
      { category: 'tools', price: 30 },
      { category: 'toys', price: 15 },
    ]);
    const result = await products.aggregate([
      { $group: { _id: '$category', avgPrice: { $avg: '$price' } } },
      { $sort: { _id: 1 } },
    ]).toArray();
    expect(result).toEqual([
      { _id: 'tools', avgPrice: 25 },
      { _id: 'toys', avgPrice: 15 },
    ]);
  });
});
```

## Configuring the MongoDB Version

```javascript
// jest.config.js or package.json
{
  "mongodbMemoryServer": {
    "version": "7.0.4"
  }
}
```

Or programmatically:

```javascript
const mongod = await MongoMemoryServer.create({
  binary: { version: '7.0.4' },
  instance: { dbName: 'myTestDb' },
});
```

## Using with Jest Global Setup

```javascript
// jest.config.js
module.exports = {
  globalSetup: './tests/globalSetup.js',
  globalTeardown: './tests/globalTeardown.js',
  testEnvironment: 'node',
};
```

```javascript
// tests/globalSetup.js
const { MongoMemoryServer } = require('mongodb-memory-server');
module.exports = async () => {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  global.__MONGOD__ = mongod;
};
```

## Summary

`mongodb-memory-server` gives you the benefits of real integration tests - actual MongoDB behavior including indexes, validation, and aggregations - with the simplicity of in-process testing. Use it as the primary testing tool for Node.js MongoDB projects, clearing collections between tests to ensure isolation.
