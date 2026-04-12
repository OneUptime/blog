# How to Create Test Fixtures and Seed Data for MongoDB Tests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Testing, Fixture, Seed Data, Jest

Description: Learn how to create reusable test fixtures and seed data helpers for MongoDB tests to reduce boilerplate and keep your test suite maintainable.

---

## Why Fixtures and Seed Data?

Every test that touches MongoDB needs a known starting state. Without a structured approach, tests are cluttered with setup code, have duplicated document definitions, and are fragile when schemas change. Centralized fixtures and seed helpers let you define documents once, reuse them across tests, and update them in one place when the schema evolves.

## Defining Fixture Factories

A fixture factory is a function that creates a valid document with sensible defaults, optionally accepting overrides:

```javascript
// tests/fixtures/userFixture.js
const { ObjectId } = require('mongodb');

const buildUser = (overrides = {}) => ({
  _id: new ObjectId(),
  name: 'Test User',
  email: `test-${Date.now()}@example.com`,
  role: 'member',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
});

const buildAdminUser = (overrides = {}) =>
  buildUser({ role: 'admin', ...overrides });

module.exports = { buildUser, buildAdminUser };
```

```javascript
// tests/fixtures/productFixture.js
const { ObjectId } = require('mongodb');

const buildProduct = (overrides = {}) => ({
  _id: new ObjectId(),
  sku: `SKU-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
  name: 'Test Product',
  price: 9.99,
  category: 'general',
  inStock: true,
  ...overrides,
});

module.exports = { buildProduct };
```

## Seed Helper Functions

Seed helpers insert fixtures into the database and return the inserted documents:

```javascript
// tests/helpers/seed.js
const { buildUser } = require('../fixtures/userFixture');
const { buildProduct } = require('../fixtures/productFixture');

async function seedUsers(collection, count = 1, overrides = {}) {
  const users = Array.from({ length: count }, () => buildUser(overrides));
  await collection.insertMany(users);
  return users;
}

async function seedProducts(collection, items = []) {
  const products = items.length
    ? items.map((item) => buildProduct(item))
    : [buildProduct()];
  await collection.insertMany(products);
  return products;
}

module.exports = { seedUsers, seedProducts };
```

## Using Fixtures in Tests

```javascript
// tests/productSearch.test.js
const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');
const { seedProducts } = require('./helpers/seed');

let mongod, client, db;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  client = new MongoClient(mongod.getUri());
  await client.connect();
  db = client.db('test');
});

afterAll(async () => {
  await client.close();
  await mongod.stop();
});

beforeEach(async () => {
  await db.collection('products').deleteMany({});
});

it('finds products by category', async () => {
  await seedProducts(db.collection('products'), [
    { category: 'tools', name: 'Hammer' },
    { category: 'tools', name: 'Wrench' },
    { category: 'toys', name: 'Ball' },
  ]);

  const tools = await db.collection('products')
    .find({ category: 'tools' })
    .toArray();

  expect(tools).toHaveLength(2);
  expect(tools.map((p) => p.name)).toEqual(
    expect.arrayContaining(['Hammer', 'Wrench'])
  );
});
```

## Loading Fixtures from JSON Files

For large seed datasets, store fixtures in JSON files:

```json
[
  { "sku": "A001", "name": "Anchor", "category": "marine", "price": 49.99 },
  { "sku": "B002", "name": "Buoy", "category": "marine", "price": 12.99 }
]
```

```javascript
// tests/helpers/loadFixture.js
const path = require('path');

async function loadFixture(collection, fixtureName) {
  const data = require(path.join(__dirname, '../fixtures', `${fixtureName}.json`));
  await collection.insertMany(data);
  return data;
}

module.exports = { loadFixture };
```

## Keeping Fixtures in Sync with Schema

When schema changes, update the fixture factory functions first. Tests that use the factory will automatically reflect the change, catching any field that your service layer relies on:

```bash
# Running all tests after a schema change quickly reveals breakages
npx jest --testPathPattern="tests/"
```

## Summary

Centralize test document creation in fixture factories and seed helpers. Use factory functions with defaults and overrides to keep tests expressive and concise. Store large reference datasets in JSON files and load them via a helper. This approach reduces boilerplate, makes tests readable, and minimizes the maintenance burden when your MongoDB schema evolves.
