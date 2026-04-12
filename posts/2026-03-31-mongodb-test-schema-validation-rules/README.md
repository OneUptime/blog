# How to Test MongoDB Schema Validation Rules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Schema Validation, Testing, JSONSchema, Jest

Description: Learn how to test MongoDB JSON Schema validation rules to verify that your validators reject invalid documents and accept valid ones in integration tests.

---

## Why Test Schema Validation?

MongoDB schema validation rules defined with `$jsonSchema` are part of your data contract. Testing them ensures that the rules are syntactically correct, reject the documents they should reject, and do not over-restrict valid documents. Validation rules should be tested against a real MongoDB instance - validation logic is handled server-side.

## Setup

```bash
npm install --save-dev mongodb-memory-server mongodb jest
```

## Defining the Schema Under Test

```javascript
// src/schemas/orderSchema.js
const orderSchema = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['customerId', 'items', 'total'],
    properties: {
      customerId: { bsonType: 'string', description: 'must be a string' },
      items: {
        bsonType: 'array',
        minItems: 1,
        items: {
          bsonType: 'object',
          required: ['sku', 'qty'],
          properties: {
            sku: { bsonType: 'string' },
            qty: { bsonType: 'int', minimum: 1 },
          },
        },
      },
      total: { bsonType: 'double', minimum: 0 },
      status: { enum: ['pending', 'shipped', 'delivered', 'cancelled'] },
    },
  },
};

module.exports = orderSchema;
```

## Creating the Collection with Validation in Tests

```javascript
// tests/orderValidation.test.js
const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');
const orderSchema = require('../src/schemas/orderSchema');

let mongod, client, db, orders;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  client = new MongoClient(mongod.getUri());
  await client.connect();
  db = client.db('testdb');
});

afterAll(async () => {
  await client.close();
  await mongod.stop();
});

beforeEach(async () => {
  // Re-create collection with validator for each test
  await db.dropCollection('orders').catch(() => {});
  await db.createCollection('orders', {
    validator: orderSchema,
    validationAction: 'error',
    validationLevel: 'strict',
  });
  orders = db.collection('orders');
});
```

## Testing Valid Documents Are Accepted

```javascript
describe('Valid orders', () => {
  it('accepts a complete valid order', async () => {
    await expect(
      orders.insertOne({
        customerId: 'C001',
        items: [{ sku: 'W001', qty: 2 }],
        total: 39.98,
        status: 'pending',
      })
    ).resolves.toBeDefined();
  });

  it('accepts an order without optional status field', async () => {
    await expect(
      orders.insertOne({
        customerId: 'C002',
        items: [{ sku: 'W002', qty: 1 }],
        total: 19.99,
      })
    ).resolves.toBeDefined();
  });
});
```

## Testing Invalid Documents Are Rejected

```javascript
describe('Invalid orders', () => {
  it('rejects missing customerId', async () => {
    await expect(
      orders.insertOne({
        items: [{ sku: 'W001', qty: 1 }],
        total: 19.99,
      })
    ).rejects.toMatchObject({ code: 121 });
  });

  it('rejects empty items array', async () => {
    await expect(
      orders.insertOne({ customerId: 'C001', items: [], total: 0 })
    ).rejects.toMatchObject({ code: 121 });
  });

  it('rejects negative total', async () => {
    await expect(
      orders.insertOne({
        customerId: 'C001',
        items: [{ sku: 'W001', qty: 1 }],
        total: -5.50,
      })
    ).rejects.toMatchObject({ code: 121 });
  });

  it('rejects invalid status value', async () => {
    await expect(
      orders.insertOne({
        customerId: 'C001',
        items: [{ sku: 'W001', qty: 1 }],
        total: 19.99,
        status: 'unknown-status',
      })
    ).rejects.toMatchObject({ code: 121 });
  });
});
```

## Testing validationAction: 'warn'

```javascript
it('warns but accepts invalid doc with warn action', async () => {
  await db.dropCollection('orders').catch(() => {});
  await db.createCollection('orders', {
    validator: orderSchema,
    validationAction: 'warn', // log but allow
  });
  orders = db.collection('orders');

  // Should succeed even though customerId is missing
  await expect(
    orders.insertOne({ items: [{ sku: 'W001', qty: 1 }], total: 9.99 })
  ).resolves.toBeDefined();
});
```

## Summary

Test your MongoDB schema validation rules in integration tests by creating the collection with the validator and inserting both valid and invalid documents. Use `code: 121` to assert that `DocumentValidationFailure` is thrown for invalid data. Cover required fields, type constraints, minimum/maximum values, and enum restrictions to ensure your data quality rules work correctly.
