# How to Run Multiple MongoDB Versions with Docker

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Docker, Version, Migration, Testing

Description: Run multiple MongoDB versions side by side using Docker to test compatibility, verify upgrades, and compare query behavior across releases.

---

## Overview

Testing against multiple MongoDB versions is useful when validating upgrade compatibility, running CI checks across supported versions, or maintaining applications that serve different customer environments. Docker makes it trivial to run MongoDB 5.0, 6.0, and 7.0 simultaneously on different ports without any version management tools.

## Running Multiple Versions Side by Side

Each MongoDB version gets its own named volume and a unique host port to avoid conflicts.

```yaml
version: "3.8"
services:
  mongo-5:
    image: mongo:5.0
    container_name: mongo-v5
    ports:
      - "27015:27017"
    volumes:
      - mongo5_data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: secret

  mongo-6:
    image: mongo:6.0
    container_name: mongo-v6
    ports:
      - "27016:27017"
    volumes:
      - mongo6_data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: secret

  mongo-7:
    image: mongo:7.0
    container_name: mongo-v7
    ports:
      - "27017:27017"
    volumes:
      - mongo7_data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: secret

volumes:
  mongo5_data:
  mongo6_data:
  mongo7_data:
```

## Connecting to Each Version

```bash
# MongoDB 5.0
mongosh "mongodb://admin:secret@localhost:27015"

# MongoDB 6.0
mongosh "mongodb://admin:secret@localhost:27016"

# MongoDB 7.0
mongosh "mongodb://admin:secret@localhost:27017"
```

## CI Matrix Testing with GitHub Actions

Run your test suite against all three versions in parallel using a matrix strategy.

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        mongo-version: ["5.0", "6.0", "7.0"]
    services:
      mongodb:
        image: mongo:${{ matrix.mongo-version }}
        ports:
          - 27017:27017
        env:
          MONGO_INITDB_ROOT_USERNAME: admin
          MONGO_INITDB_ROOT_PASSWORD: secret
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm ci
      - run: npm test
        env:
          MONGODB_URI: mongodb://admin:secret@localhost:27017
          MONGO_VERSION: ${{ matrix.mongo-version }}
```

## Version-Specific Feature Testing

Check which version is running and conditionally use new features.

```javascript
async function getServerVersion(db) {
  const info = await db.command({ buildInfo: 1 });
  return info.versionArray.slice(0, 2).join(".");
}

async function conditionalFeature(db) {
  const version = await getServerVersion(db);
  const [major, minor] = version.split(".").map(Number);

  if (major >= 5 && minor >= 0) {
    // Use $setWindowFields (MongoDB 5.0+)
    return db.collection("data").aggregate([
      {
        $setWindowFields: {
          sortBy: { date: 1 },
          output: { runningTotal: { $sum: "$amount", window: { documents: ["unbounded", "current"] } } },
        },
      },
    ]).toArray();
  }

  // Fallback for older versions
  return db.collection("data").find({}).toArray();
}
```

## Migrating Data Between Versions

Use `mongodump` and `mongorestore` to move data from an older container to a newer one.

```bash
# Dump from v5
docker exec mongo-v5 mongodump \
  --username admin --password secret \
  --authenticationDatabase admin \
  --out /tmp/dump

# Copy dump files to host
docker cp mongo-v5:/tmp/dump ./dump-v5

# Copy dump files to v7 container
docker cp ./dump-v5 mongo-v7:/tmp/dump

# Restore into v7
docker exec mongo-v7 mongorestore \
  --username admin --password secret \
  --authenticationDatabase admin \
  --dir /tmp/dump
```

## Summary

Docker makes it easy to run multiple MongoDB versions simultaneously by assigning each instance a unique host port and named volume. Use a Docker Compose file to manage all versions together, a GitHub Actions matrix to automate compatibility testing, and `mongodump`/`mongorestore` to transfer data between versions during upgrade validation.
