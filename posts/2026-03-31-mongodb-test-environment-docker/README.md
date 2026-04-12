# How to Set Up a MongoDB Test Environment with Docker

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Docker, Testing, Integration Test, CI

Description: Learn how to set up a reproducible MongoDB test environment using Docker and Docker Compose for local development and CI/CD pipeline integration testing.

---

## Why Use Docker for MongoDB Testing?

Docker provides a consistent, reproducible MongoDB environment across developer machines and CI/CD pipelines. Unlike `mongodb-memory-server`, Docker runs a full MongoDB binary with the exact version you want, supports replica sets, and mirrors production configuration more closely.

## Quick Start: Docker CLI

Run a MongoDB instance for testing in one command:

```bash
# Start a MongoDB 7 container on a non-standard port to avoid conflicts
docker run -d \
  --name mongo-test \
  -p 27018:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=testuser \
  -e MONGO_INITDB_ROOT_PASSWORD=testpass \
  mongo:7

# Run your tests
MONGODB_URI="mongodb://testuser:testpass@localhost:27018/testdb?authSource=admin" npm test

# Tear down when done
docker rm -f mongo-test
```

## Docker Compose Setup

Create a `docker-compose.test.yml` for a complete test environment:

```yaml
version: "3.9"
services:
  mongo:
    image: mongo:7
    ports:
      - "27018:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: testuser
      MONGO_INITDB_ROOT_PASSWORD: testpass
      MONGO_INITDB_DATABASE: testdb
    volumes:
      - ./tests/mongo-init.js:/docker-entrypoint-initdb.d/init.js:ro
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.runCommand('ping').ok", "--quiet"]
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 10s
```

## Database Initialization Script

```javascript
// tests/mongo-init.js
db = db.getSiblingDB('testdb');
db.createUser({
  user: 'appuser',
  pwd: 'apppass',
  roles: [{ role: 'readWrite', db: 'testdb' }],
});
db.createCollection('products');
db.products.createIndex({ sku: 1 }, { unique: true });
```

## npm Scripts for Test Lifecycle

```json
{
  "scripts": {
    "test:start-db": "docker compose -f docker-compose.test.yml up -d --wait mongo",
    "test:stop-db": "docker compose -f docker-compose.test.yml down -v",
    "test:integration": "npm run test:start-db && MONGODB_URI=mongodb://appuser:apppass@localhost:27018/testdb npm test; npm run test:stop-db"
  }
}
```

## CI/CD Pipeline (GitHub Actions)

```yaml
name: Integration Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      mongodb:
        image: mongo:7
        ports:
          - 27017:27017
        env:
          MONGO_INITDB_ROOT_USERNAME: testuser
          MONGO_INITDB_ROOT_PASSWORD: testpass
        options: >-
          --health-cmd "mongosh --eval \"db.runCommand('ping').ok\" --quiet"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm test
        env:
          MONGODB_URI: mongodb://testuser:testpass@localhost:27017/testdb?authSource=admin
```

## Replica Set Docker Compose

For testing transactions and change streams, use a replica set:

```yaml
version: "3.9"
services:
  mongo1:
    image: mongo:7
    command: mongod --replSet rs0 --port 27017
    ports:
      - "27017:27017"
  mongo-setup:
    image: mongo:7
    depends_on: [mongo1]
    command: >
      bash -c "sleep 5 && mongosh --host mongo1:27017 --eval
      'rs.initiate({_id: \"rs0\", members: [{_id: 0, host: \"mongo1:27017\"}]})'"
```

## Summary

Docker and Docker Compose provide a production-faithful MongoDB test environment that works identically on every developer machine and in CI pipelines. Use the health check to ensure MongoDB is ready before tests start, mount initialization scripts to pre-create collections and indexes, and use GitHub Actions service containers for seamless CI integration.
