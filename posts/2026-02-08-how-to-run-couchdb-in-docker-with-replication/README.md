# How to Run CouchDB in Docker with Replication

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, CouchDB, Databases, NoSQL, Replication, DevOps

Description: Complete guide to running Apache CouchDB in Docker with master-master replication and document management

---

Apache CouchDB is a document-oriented NoSQL database that uses JSON for documents, HTTP for its API, and JavaScript for MapReduce queries. Its standout feature is built-in master-master replication, meaning every node can accept writes and sync with every other node. Running CouchDB in Docker makes it easy to set up replicated clusters for development and testing.

## What Makes CouchDB Different

CouchDB takes a different approach from most databases. Instead of forcing consistency at all times, it embraces eventual consistency and provides conflict resolution mechanisms. Every interaction happens over HTTP - there is no proprietary binary protocol. You create, read, update, and delete documents using standard HTTP verbs. This makes CouchDB approachable from any language or tool that can make HTTP requests, including curl.

The replication protocol is another key differentiator. CouchDB can replicate between any two databases, whether they are on the same server, across data centers, or between a server and a mobile device running PouchDB.

## Quick Start

Run a single CouchDB instance.

```bash
# Start CouchDB with admin credentials
docker run -d \
  --name couchdb \
  -p 5984:5984 \
  -e COUCHDB_USER=admin \
  -e COUCHDB_PASSWORD=password \
  -v couchdb_data:/opt/couchdb/data \
  couchdb:3
```

Verify it is running by hitting the root endpoint.

```bash
# CouchDB should respond with version info
curl http://admin:password@localhost:5984/
```

## Docker Compose Setup

A production-style configuration with persistent storage and configuration.

```yaml
# docker-compose.yml
version: "3.8"

services:
  couchdb:
    image: couchdb:3
    container_name: couchdb
    restart: unless-stopped
    ports:
      - "5984:5984"
    environment:
      COUCHDB_USER: admin
      COUCHDB_PASSWORD: s3curepass
    volumes:
      - couchdb_data:/opt/couchdb/data
      - couchdb_config:/opt/couchdb/etc/local.d
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5984/_up"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  couchdb_data:
  couchdb_config:
```

```bash
docker compose up -d
```

## Working with Documents

CouchDB's API is entirely HTTP-based. Create a database and add documents using curl.

```bash
# Create a new database
curl -X PUT http://admin:s3curepass@localhost:5984/myapp

# Insert a document
curl -X POST http://admin:s3curepass@localhost:5984/myapp \
  -H "Content-Type: application/json" \
  -d '{
    "type": "user",
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "role": "engineer",
    "created_at": "2025-01-15T10:30:00Z"
  }'

# Insert another document with a specific ID
curl -X PUT http://admin:s3curepass@localhost:5984/myapp/user-002 \
  -H "Content-Type: application/json" \
  -d '{
    "type": "user",
    "name": "Bob Smith",
    "email": "bob@example.com",
    "role": "designer",
    "created_at": "2025-02-20T14:00:00Z"
  }'
```

Fetch a document by its ID.

```bash
# Retrieve a specific document
curl http://admin:s3curepass@localhost:5984/myapp/user-002
```

## Creating Views with MapReduce

CouchDB uses design documents to define views. Views are MapReduce functions written in JavaScript.

```bash
# Create a design document with views
curl -X PUT http://admin:s3curepass@localhost:5984/myapp/_design/users \
  -H "Content-Type: application/json" \
  -d '{
    "views": {
      "by_role": {
        "map": "function(doc) { if (doc.type === \"user\") { emit(doc.role, { name: doc.name, email: doc.email }); } }"
      },
      "count_by_role": {
        "map": "function(doc) { if (doc.type === \"user\") { emit(doc.role, 1); } }",
        "reduce": "_count"
      }
    }
  }'
```

Query the views.

```bash
# Get all users grouped by role
curl http://admin:s3curepass@localhost:5984/myapp/_design/users/_view/by_role

# Get user counts by role
curl http://admin:s3curepass@localhost:5984/myapp/_design/users/_view/count_by_role?group=true
```

## Setting Up Master-Master Replication

This is where CouchDB truly shines. Set up two CouchDB instances that replicate bidirectionally.

```yaml
# docker-compose-replication.yml
version: "3.8"

services:
  couchdb-primary:
    image: couchdb:3
    container_name: couchdb-primary
    ports:
      - "5984:5984"
    environment:
      COUCHDB_USER: admin
      COUCHDB_PASSWORD: s3curepass
    volumes:
      - couch_primary:/opt/couchdb/data
    networks:
      - couch-net

  couchdb-replica:
    image: couchdb:3
    container_name: couchdb-replica
    ports:
      - "5985:5984"
    environment:
      COUCHDB_USER: admin
      COUCHDB_PASSWORD: s3curepass
    volumes:
      - couch_replica:/opt/couchdb/data
    networks:
      - couch-net

networks:
  couch-net:
    driver: bridge

volumes:
  couch_primary:
  couch_replica:
```

Start both nodes.

```bash
docker compose -f docker-compose-replication.yml up -d
```

Create the same database on both nodes, then set up continuous replication in both directions.

```bash
# Create the database on both nodes
curl -X PUT http://admin:s3curepass@localhost:5984/shared_db
curl -X PUT http://admin:s3curepass@localhost:5985/shared_db

# Set up continuous replication: primary -> replica
curl -X POST http://admin:s3curepass@localhost:5984/_replicator \
  -H "Content-Type: application/json" \
  -d '{
    "_id": "primary-to-replica",
    "source": "http://admin:s3curepass@couchdb-primary:5984/shared_db",
    "target": "http://admin:s3curepass@couchdb-replica:5984/shared_db",
    "continuous": true
  }'

# Set up continuous replication: replica -> primary
curl -X POST http://admin:s3curepass@localhost:5985/_replicator \
  -H "Content-Type: application/json" \
  -d '{
    "_id": "replica-to-primary",
    "source": "http://admin:s3curepass@couchdb-replica:5984/shared_db",
    "target": "http://admin:s3curepass@couchdb-primary:5984/shared_db",
    "continuous": true
  }'
```

Test the replication by writing to one node and reading from the other.

```bash
# Write to the primary node
curl -X PUT http://admin:s3curepass@localhost:5984/shared_db/test-doc-001 \
  -H "Content-Type: application/json" \
  -d '{"message": "Written to primary", "timestamp": "2025-03-01T12:00:00Z"}'

# Wait a moment for replication, then read from the replica
sleep 2
curl http://admin:s3curepass@localhost:5985/shared_db/test-doc-001
```

The document should appear on both nodes within seconds.

## Handling Conflicts

With master-master replication, conflicts can occur when the same document is modified on both nodes simultaneously. CouchDB does not lose data in this case. Instead, it picks a deterministic winner and stores the losing revision as a conflict.

```bash
# Check for conflicts on a document
curl http://admin:s3curepass@localhost:5984/shared_db/test-doc-001?conflicts=true
```

Resolve conflicts programmatically by fetching conflicting revisions and choosing which one to keep.

```bash
# Get all revisions including conflicts
curl http://admin:s3curepass@localhost:5984/shared_db/test-doc-001?revs_info=true
```

## Monitoring Replication

Check the status of active replications.

```bash
# View active replication tasks
curl http://admin:s3curepass@localhost:5984/_active_tasks

# Check the replicator database for replication document status
curl http://admin:s3curepass@localhost:5984/_replicator/primary-to-replica
```

## Mango Queries

CouchDB 2.0+ includes Mango, a declarative JSON query language inspired by MongoDB.

```bash
# Create an index for faster queries
curl -X POST http://admin:s3curepass@localhost:5984/myapp/_index \
  -H "Content-Type: application/json" \
  -d '{
    "index": {
      "fields": ["type", "role"]
    },
    "name": "type-role-index"
  }'

# Query using the Mango syntax
curl -X POST http://admin:s3curepass@localhost:5984/myapp/_find \
  -H "Content-Type: application/json" \
  -d '{
    "selector": {
      "type": "user",
      "role": "engineer"
    },
    "fields": ["name", "email", "role"],
    "limit": 25
  }'
```

## Backup Strategy

Back up CouchDB by replicating to a backup database or using file-level snapshots.

```bash
# Replicate a database to a backup (one-time replication)
curl -X POST http://admin:s3curepass@localhost:5984/_replicate \
  -H "Content-Type: application/json" \
  -d '{
    "source": "myapp",
    "target": "myapp_backup_20250301",
    "create_target": true
  }'

# List all databases to verify
curl http://admin:s3curepass@localhost:5984/_all_dbs
```

## Summary

CouchDB in Docker gives you an HTTP-native document database with built-in master-master replication. The REST API makes it accessible from any language or tool. Set up bidirectional continuous replication between nodes using the `_replicator` database, and handle conflicts gracefully using CouchDB's revision system. For development, a single node is sufficient. For production testing, run at least two nodes with continuous replication to simulate real-world sync scenarios. The Mango query language provides a familiar JSON-based syntax for document retrieval without needing to write MapReduce views.
