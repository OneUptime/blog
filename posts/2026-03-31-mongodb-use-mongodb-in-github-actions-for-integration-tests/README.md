# How to Use MongoDB in GitHub Actions for Integration Tests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, GitHub Action, CI/CD, Testing, Integration Test

Description: Configure GitHub Actions workflows to spin up a MongoDB service container for running integration tests against a real database instance.

---

## Introduction

Integration tests that exercise real database behavior are more reliable than purely mocked tests. GitHub Actions supports service containers, making it easy to spin up a real MongoDB instance alongside your test runner. This guide shows how to configure MongoDB as a service in your workflow.

## Basic Workflow with MongoDB Service

```yaml
name: Integration Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      mongodb:
        image: mongo:7.0
        ports:
          - 27017:27017
        options: >-
          --health-cmd "mongosh --eval 'db.adminCommand(\"ping\")'"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run integration tests
        env:
          MONGODB_URI: mongodb://localhost:27017/testdb
        run: npm run test:integration
```

## Adding Authentication

For a secure MongoDB setup in CI:

```yaml
services:
  mongodb:
    image: mongo:7.0
    ports:
      - 27017:27017
    env:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: testpassword
    options: >-
      --health-cmd "mongosh -u admin -p testpassword --eval 'db.adminCommand(\"ping\")'"
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
```

```yaml
steps:
  - name: Run tests
    env:
      MONGODB_URI: mongodb://admin:testpassword@localhost:27017/testdb?authSource=admin
    run: npm run test:integration
```

## Seeding Test Data

Add a seeding step before your tests run:

```yaml
steps:
  - name: Install mongosh
    run: npm install -g mongosh

  - name: Seed test data
    run: |
      mongosh mongodb://localhost:27017/testdb --file ./test/fixtures/seed.js
```

```javascript
// test/fixtures/seed.js
db.users.insertMany([
  { name: "Alice", email: "alice@example.com", role: "admin" },
  { name: "Bob", email: "bob@example.com", role: "user" }
])

db.products.insertMany([
  { name: "Widget", price: 9.99, stock: 100 },
  { name: "Gadget", price: 24.99, stock: 50 }
])
```

## Caching with Matrix Strategy

Run tests against multiple MongoDB versions:

```yaml
strategy:
  matrix:
    mongodb-version: ["6.0", "7.0"]

services:
  mongodb:
    image: mongo:${{ matrix.mongodb-version }}
    ports:
      - 27017:27017
```

## Storing Test Results

```yaml
- name: Run tests with coverage
  env:
    MONGODB_URI: mongodb://localhost:27017/testdb
  run: npm run test:integration -- --coverage

- name: Upload coverage
  uses: codecov/codecov-action@v4
  with:
    file: ./coverage/lcov.info
```

## Summary

GitHub Actions service containers provide an easy way to run integration tests against a real MongoDB instance without managing external infrastructure. Configure health checks to ensure MongoDB is ready before tests start, add authentication for production-like environments, and seed test data in a dedicated step. Using matrix strategies allows you to verify compatibility across MongoDB versions in a single workflow.
