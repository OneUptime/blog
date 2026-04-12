# How to Use Testcontainers for MongoDB Integration Tests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Testcontainers, Docker, Integration Test, Testing

Description: Learn how to use Testcontainers to spin up a real MongoDB Docker container for integration tests that are fully isolated and reproducible across environments.

---

## What Is Testcontainers?

Testcontainers is a library that programmatically manages Docker containers during tests. For MongoDB, it spins up a real MongoDB container before your tests run and tears it down afterward. This gives you a production-like MongoDB instance with no manual setup, and tests are fully reproducible on any machine with Docker.

## Node.js Setup

```bash
npm install --save-dev @testcontainers/mongodb mongodb jest
```

```javascript
// tests/mongo.container.test.js
const { MongoDBContainer } = require('@testcontainers/mongodb');
const { MongoClient } = require('mongodb');

let container;
let client;
let db;

beforeAll(async () => {
  // Start a MongoDB 7 container
  container = await new MongoDBContainer('mongo:7').start();
  client = new MongoClient(container.getConnectionString());
  await client.connect();
  db = client.db('testdb');
}, 60000); // allow 60s for container start

afterAll(async () => {
  await client.close();
  await container.stop();
});

beforeEach(async () => {
  const collections = await db.collections();
  for (const col of collections) {
    await col.deleteMany({});
  }
});
```

## Writing Tests Against the Container

```javascript
describe('Product repository with Testcontainers', () => {
  it('inserts and finds a product', async () => {
    const products = db.collection('products');
    await products.insertOne({ sku: 'T-001', name: 'Widget', price: 19.99 });
    const found = await products.findOne({ sku: 'T-001' });
    expect(found.name).toBe('Widget');
  });

  it('enforces unique index', async () => {
    const products = db.collection('products');
    await products.createIndex({ sku: 1 }, { unique: true });
    await products.insertOne({ sku: 'T-002' });
    await expect(products.insertOne({ sku: 'T-002' }))
      .rejects.toMatchObject({ code: 11000 });
  });

  it('validates schema rules', async () => {
    await db.createCollection('orders', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['customerId', 'total'],
          properties: {
            total: { bsonType: 'double', minimum: 0 },
          },
        },
      },
    });
    const orders = db.collection('orders');
    await expect(orders.insertOne({ total: 100 }))
      .rejects.toMatchObject({ code: 121 }); // missing customerId
  });
});
```

## Java (JUnit 5) Setup

```java
import org.testcontainers.containers.MongoDBContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import org.junit.jupiter.api.Test;

@Testcontainers
class ProductRepositoryTest {

    @Container
    static MongoDBContainer mongoDBContainer =
        new MongoDBContainer("mongo:7");

    @Test
    void testInsertAndFind() {
        String uri = mongoDBContainer.getConnectionString();
        try (MongoClient client = MongoClients.create(uri)) {
            var db = client.getDatabase("testdb");
            var products = db.getCollection("products");
            var doc = new org.bson.Document("sku", "J001").append("name", "Sprocket");
            products.insertOne(doc);
            var found = products.find(new org.bson.Document("sku", "J001")).first();
            assert found != null;
            assert "Sprocket".equals(found.getString("name"));
        }
    }
}
```

## Python Setup with pytest

```python
import pytest
from testcontainers.mongodb import MongoDbContainer
from pymongo import MongoClient

@pytest.fixture(scope="session")
def mongo_container():
    with MongoDbContainer("mongo:7") as container:
        yield container

@pytest.fixture
def db(mongo_container):
    client = MongoClient(mongo_container.get_connection_url())
    database = client["testdb"]
    yield database
    for col in database.list_collection_names():
        database[col].delete_many({})
    client.close()

def test_insert_product(db):
    db.products.insert_one({"sku": "P001", "name": "Gear"})
    result = db.products.find_one({"sku": "P001"})
    assert result["name"] == "Gear"
```

## Summary

Testcontainers provides production-identical MongoDB instances for integration tests with zero manual setup. Tests are fully isolated, reproducible on CI and local machines, and automatically clean up after themselves. Use Testcontainers when `mongodb-memory-server` is not sufficient (e.g., when testing replica set features or running integration tests in Java or Python environments).
