# How to Set Up a MongoDB Replica Set with Docker Compose

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Docker, Replica Set, Docker Compose, DevOps

Description: Step-by-step guide to running a 3-node MongoDB replica set locally with Docker Compose, including initialization, connection string, and health check configuration.

---

## Overview

A MongoDB replica set is required for change streams, transactions, and high availability. Running a replica set locally with Docker Compose is the standard way to develop and test features that require replication without spinning up Atlas. This guide sets up a 3-node replica set using Docker Compose.

## Docker Compose Configuration

Create a `docker-compose.yml` with three MongoDB nodes and a shared Docker network:

```yaml
version: "3.8"

services:
  mongo1:
    image: mongo:7.0
    container_name: mongo1
    hostname: mongo1
    ports:
      - "27017:27017"
    volumes:
      - mongo1-data:/data/db
    networks:
      - mongo-net
    command: ["mongod", "--replSet", "rs0", "--bind_ip_all"]
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping').ok", "--quiet"]
      interval: 10s
      timeout: 5s
      retries: 5

  mongo2:
    image: mongo:7.0
    container_name: mongo2
    hostname: mongo2
    ports:
      - "27018:27018"
    volumes:
      - mongo2-data:/data/db
    networks:
      - mongo-net
    command: ["mongod", "--replSet", "rs0", "--bind_ip_all", "--port", "27018"]

  mongo3:
    image: mongo:7.0
    container_name: mongo3
    hostname: mongo3
    ports:
      - "27019:27019"
    volumes:
      - mongo3-data:/data/db
    networks:
      - mongo-net
    command: ["mongod", "--replSet", "rs0", "--bind_ip_all", "--port", "27019"]

  mongo-init:
    image: mongo:7.0
    depends_on:
      mongo1:
        condition: service_healthy
    networks:
      - mongo-net
    entrypoint: >
      bash -c "
        mongosh --host mongo1:27017 --eval '
          rs.initiate({
            _id: \"rs0\",
            members: [
              { _id: 0, host: \"mongo1:27017\", priority: 2 },
              { _id: 1, host: \"mongo2:27018\", priority: 1 },
              { _id: 2, host: \"mongo3:27019\", priority: 1 }
            ]
          });
        '
      "
    restart: on-failure

volumes:
  mongo1-data:
  mongo2-data:
  mongo3-data:

networks:
  mongo-net:
    driver: bridge
```

## Add /etc/hosts Entries for Local Development

Docker container hostnames (`mongo1`, `mongo2`, `mongo3`) are resolved inside the Docker network. For connections from your host machine, add the following to `/etc/hosts`:

```text
127.0.0.1  mongo1
127.0.0.1  mongo2
127.0.0.1  mongo3
```

## Start and Initialize the Replica Set

```bash
# Start all services
docker-compose up -d

# Wait for mongo-init to complete (watch logs)
docker-compose logs -f mongo-init

# Expected output:
# { ok: 1 }
```

Verify the replica set status:

```bash
docker exec -it mongo1 mongosh --eval "rs.status()" | grep -E "name|stateStr"
# name: 'mongo1:27017', stateStr: 'PRIMARY'
# name: 'mongo2:27018', stateStr: 'SECONDARY'
# name: 'mongo3:27019', stateStr: 'SECONDARY'
```

## Connection String

Connect from your host machine using the replica set URI:

```javascript
const { MongoClient } = require("mongodb");
const client = new MongoClient(
  "mongodb://mongo1:27017,mongo2:27018,mongo3:27019/mydb?replicaSet=rs0"
);

const db = client.db("mydb");
await db.collection("test").insertOne({ hello: "replica set!" });
```

## Test Change Streams

Change streams require a replica set. Test them with this snippet:

```javascript
const changeStream = db.collection("test").watch();
changeStream.on("change", (change) => {
  console.log("Change detected:", change.operationType, change.documentKey);
});

// Insert a document to trigger the change stream
await db.collection("test").insertOne({ event: "test" });
```

## Test Transactions

Multi-document transactions also require a replica set:

```javascript
const session = client.startSession();
session.startTransaction();
try {
  await db.collection("accounts").updateOne({ _id: "acc-a" }, { $inc: { balance: -50 } }, { session });
  await db.collection("accounts").updateOne({ _id: "acc-b" }, { $inc: { balance: 50 } }, { session });
  await session.commitTransaction();
  console.log("Transaction committed");
} catch (e) {
  await session.abortTransaction();
  console.error("Transaction aborted:", e.message);
} finally {
  await session.endSession();
}
```

## Summary

A 3-node MongoDB replica set in Docker Compose provides a local environment for developing and testing change streams, transactions, and replication features. Use the `mongo-init` service to automatically initialize the replica set, add hostname entries to `/etc/hosts` for host machine access, and connect using the `replicaSet=rs0` parameter in your connection string.
