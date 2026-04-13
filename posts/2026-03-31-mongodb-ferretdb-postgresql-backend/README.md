# How to Set Up FerretDB with PostgreSQL Backend

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, FerretDB, PostgreSQL, Database, Docker

Description: Step-by-step guide to deploying FerretDB with a PostgreSQL backend, giving you a MongoDB-compatible API on top of PostgreSQL storage.

---

## What Is FerretDB?

FerretDB is an open-source proxy that translates the MongoDB wire protocol into SQL queries executed against a PostgreSQL database. Applications using MongoDB drivers connect to FerretDB exactly as they would connect to MongoDB, while all data is stored in PostgreSQL as JSONB columns.

This setup is useful when you want MongoDB compatibility for your application but prefer PostgreSQL's ACID guarantees, backup ecosystem, or licensing model.

## Prerequisites

- Docker and Docker Compose installed
- Basic familiarity with MongoDB connection strings

## Docker Compose Setup

Create a `docker-compose.yml` file:

```yaml
version: "3.9"
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: ferretdb
      POSTGRES_PASSWORD: ferretdbpassword
      POSTGRES_DB: ferretdb
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ferretdb"]
      interval: 5s
      timeout: 5s
      retries: 5

  ferretdb:
    image: ghcr.io/ferretdb/ferretdb:latest
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - "27017:27017"
    environment:
      FERRETDB_POSTGRESQL_URL: postgres://ferretdb:ferretdbpassword@postgres:5432/ferretdb

volumes:
  pgdata:
```

Start the stack:

```bash
docker compose up -d
```

## Connect Using mongosh

FerretDB listens on port 27017 and accepts standard MongoDB connections:

```bash
mongosh "mongodb://ferretdb:ferretdbpassword@localhost:27017/mydb"
```

You can now run MongoDB commands:

```javascript
db.users.insertOne({ name: "Alice", role: "admin" });
db.users.find({ role: "admin" });
```

## Connect Using a MongoDB Driver

The connection string is identical to a standard MongoDB connection:

```python
import pymongo

client = pymongo.MongoClient("mongodb://ferretdb:ferretdbpassword@localhost:27017/")
db = client["mydb"]
collection = db["users"]

collection.insert_one({"name": "Bob", "role": "viewer"})
docs = list(collection.find({"role": "viewer"}))
print(docs)
```

## Inspect Data in PostgreSQL

Because FerretDB stores data as JSONB, you can query it directly from PostgreSQL:

```sql
SELECT
  _jsonb->>'name' AS name,
  _jsonb->>'role' AS role
FROM ferretdb.mydb."users"
LIMIT 10;
```

This dual-access capability is a unique advantage over native MongoDB - your DBA team can use standard SQL tooling for reporting while application code uses the MongoDB driver.

## Configure Logging

FerretDB supports structured logging for observability:

```yaml
ferretdb:
  environment:
    FERRETDB_LOG_LEVEL: info
    FERRETDB_TELEMETRY: disable
```

Pipe these logs into your observability platform to track query patterns and errors.

## Known Limitations

FerretDB does not implement the full MongoDB API. Check compatibility before migrating:

```bash
# Start FerretDB in diff-normal mode to compare responses against MongoDB
docker run --rm ghcr.io/ferretdb/ferretdb:latest \
  --mode=diff-normal \
  --proxy-addr=mongodb://localhost:27017 \
  --postgresql-url=postgres://ferretdb:ferretdbpassword@postgres:5432/ferretdb
```

As of early 2026, FerretDB supports most CRUD operations, basic aggregation, and standard indexes but lacks some advanced aggregation operators and Atlas-specific features.

## Summary

Setting up FerretDB with a PostgreSQL backend requires only a Docker Compose file with two services: a PostgreSQL instance and the FerretDB proxy. Applications connect using standard MongoDB drivers with no code changes. Data is stored in PostgreSQL as JSONB, making it inspectable with SQL tools and compatible with PostgreSQL backup and replication infrastructure.
