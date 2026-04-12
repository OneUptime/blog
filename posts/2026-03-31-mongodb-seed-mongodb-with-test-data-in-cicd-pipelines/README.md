# How to Seed MongoDB with Test Data in CI/CD Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, CI/CD, Seeding, Testing, Automation

Description: Learn strategies for seeding MongoDB with test data in CI/CD pipelines including mongoimport, custom scripts, and idempotent seed operations.

---

## Introduction

Seeding MongoDB with test data in CI/CD ensures your integration tests always run against a known dataset. The key requirements are speed, idempotency (safe to run multiple times), and determinism. This guide covers several seeding strategies suited for different pipeline scenarios.

## Using mongoimport for Quick Seeding

The `mongoimport` tool is the fastest way to load bulk data:

```bash
# Seed a single collection
mongoimport \
  --uri="mongodb://localhost:27017/testdb" \
  --collection=products \
  --file=seeds/products.json \
  --jsonArray \
  --drop

# Seed multiple collections in a loop
for file in seeds/*.json; do
  collection=$(basename "$file" .json)
  mongoimport \
    --uri="mongodb://localhost:27017/testdb" \
    --collection="$collection" \
    --file="$file" \
    --jsonArray \
    --drop
  echo "Seeded $collection"
done
```

## Idempotent Seed Script in Node.js

An idempotent seed is safe to run repeatedly without duplicating data:

```javascript
// scripts/seed.js
const { MongoClient } = require("mongodb")

const SEEDS = {
  categories: [
    { _id: "cat-1", name: "Electronics", slug: "electronics" },
    { _id: "cat-2", name: "Books", slug: "books" }
  ],
  products: [
    { _id: "prod-1", name: "Laptop", price: 999, categoryId: "cat-1" },
    { _id: "prod-2", name: "JavaScript Guide", price: 39, categoryId: "cat-2" }
  ]
}

async function seed() {
  const client = new MongoClient(process.env.MONGODB_URI)
  await client.connect()
  const db = client.db()

  for (const [collection, docs] of Object.entries(SEEDS)) {
    // Upsert each document by _id for idempotency
    const ops = docs.map(doc => ({
      replaceOne: {
        filter: { _id: doc._id },
        replacement: doc,
        upsert: true
      }
    }))
    const result = await db.collection(collection).bulkWrite(ops)
    console.log(`${collection}: upserted=${result.upsertedCount}, modified=${result.modifiedCount}`)
  }

  await client.close()
}

seed().catch(err => {
  console.error(err)
  process.exit(1)
})
```

## Python Seeding with pymongo

```python
# scripts/seed.py
from pymongo import MongoClient, ReplaceOne
import os
import json
import glob

def seed():
    client = MongoClient(os.environ["MONGODB_URI"])
    db = client.testdb

    for filepath in glob.glob("seeds/*.json"):
        collection_name = os.path.splitext(os.path.basename(filepath))[0]
        with open(filepath) as f:
            documents = json.load(f)

        operations = [
            ReplaceOne({"_id": doc["_id"]}, doc, upsert=True)
            for doc in documents
        ]
        result = db[collection_name].bulk_write(operations)
        print(f"{collection_name}: upserted={result.upserted_count}")

    client.close()

if __name__ == "__main__":
    seed()
```

## GitHub Actions Integration

```yaml
- name: Seed test data
  run: node scripts/seed.js
  env:
    MONGODB_URI: mongodb://localhost:27017/testdb

- name: Run integration tests
  run: npm test
  env:
    MONGODB_URI: mongodb://localhost:27017/testdb
```

## Using Docker Entrypoint for Auto-Seeding

For a self-contained test container, seed via `docker-entrypoint-initdb.d`:

```javascript
// seeds/init-db.js (mounted into /docker-entrypoint-initdb.d/)
db = db.getSiblingDB("testdb")
db.users.drop()
db.users.insertMany([
  { name: "Alice", role: "admin" },
  { name: "Bob", role: "user" }
])
print("Database seeded successfully")
```

```yaml
services:
  mongodb:
    image: mongo:7.0
    volumes:
      - ./seeds/init-db.js:/docker-entrypoint-initdb.d/init-db.js:ro
```

## Summary

The best CI/CD seeding strategy uses upsert-based bulk operations for idempotency rather than drop-and-insert, making it safe to retry failed pipelines. Store seed data in version-controlled JSON files, run seeding as a dedicated step before tests, and use fixed `_id` values to ensure referential integrity between collections. For Docker-based pipelines, `docker-entrypoint-initdb.d` provides automatic seeding on first container startup.
