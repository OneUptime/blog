# How to Clean Up Test Data After MongoDB Tests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Testing, Cleanup, Jest, Test Isolation

Description: Learn strategies for cleaning up MongoDB test data between tests to ensure test isolation, prevent interference, and keep your test database in a known state.

---

## Why Clean Up Matters

Dirty test data from previous runs causes flaky tests, false positives, and debugging nightmares. A test that passes in isolation but fails as part of a full suite usually has a test isolation problem. Consistent cleanup between tests is non-negotiable for a reliable test suite.

## Strategy 1: Delete All Documents Before Each Test

The simplest approach - fast and straightforward for small collections:

```javascript
beforeEach(async () => {
  await db.collection('users').deleteMany({});
  await db.collection('orders').deleteMany({});
  await db.collection('products').deleteMany({});
});
```

For multiple collections:

```javascript
const TEST_COLLECTIONS = ['users', 'orders', 'products', 'sessions'];

beforeEach(async () => {
  await Promise.all(
    TEST_COLLECTIONS.map((name) => db.collection(name).deleteMany({}))
  );
});
```

## Strategy 2: Drop All Collections

More thorough - removes collections and their indexes. Useful when tests create dynamic collections:

```javascript
afterEach(async () => {
  const collections = await db.collections();
  await Promise.all(collections.map((col) => col.drop()));
});
```

Note: dropping collections removes indexes too, so you need to recreate indexes in `beforeEach` if your tests depend on them.

## Strategy 3: Drop and Recreate the Entire Database

The most complete isolation - each test or test file gets a fresh database:

```javascript
const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');

let mongod, client;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  client = new MongoClient(mongod.getUri());
  await client.connect();
});

afterAll(async () => {
  await client.close();
  await mongod.stop();
});

// Each test gets a fresh database
let db;
beforeEach(async () => {
  const dbName = `testdb_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  db = client.db(dbName);
  // Recreate schema/indexes
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
});

afterEach(async () => {
  await db.dropDatabase();
});
```

## Strategy 4: Tagged Test Documents

Insert test documents with a flag and delete only those:

```javascript
const TEST_TAG = { _testRun: 'integration-test' };

async function seedUsers(collection, users) {
  return collection.insertMany(users.map((u) => ({ ...u, ...TEST_TAG })));
}

afterEach(async () => {
  // Only remove documents tagged with the test run marker
  await db.collection('users').deleteMany(TEST_TAG);
});
```

This approach works well in shared test databases where you cannot wipe everything.

## Strategy 5: Transactions for Test Rollback

Run each test inside a transaction and abort it at the end. Requires a replica set:

```javascript
let session;

beforeEach(async () => {
  session = client.startSession();
  session.startTransaction();
});

afterEach(async () => {
  await session.abortTransaction();
  await session.endSession();
});

it('does not persist data after test', async () => {
  await db.collection('users').insertOne({ name: 'Temp' }, { session });
  const count = await db.collection('users').countDocuments({}, { session });
  expect(count).toBe(1);
  // Transaction is aborted in afterEach - nothing is persisted
});
```

## Choosing the Right Strategy

```text
deleteMany before each test   - fast, works on standalone, good default
drop all collections          - thorough, recreates fresh schema
unique database per test      - maximum isolation, slightly slower
tagged documents              - good for shared environments
transaction rollback          - elegant but requires replica set
```

## Summary

Choose `deleteMany({})` in `beforeEach` as your default strategy - it is fast, simple, and sufficient for most test suites. Use unique databases per test or transaction rollback for tests that require stronger isolation. Always clean up after tests, not before, so that failing tests leave data behind for inspection during debugging.
