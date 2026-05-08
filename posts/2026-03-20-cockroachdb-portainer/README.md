# How to Deploy CockroachDB via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, CockroachDB, Distributed Database, PostgreSQL, SQL

Description: Deploy a CockroachDB distributed SQL cluster using Portainer for globally distributed, PostgreSQL-compatible database workloads.

## Introduction

CockroachDB is a distributed SQL database compatible with PostgreSQL. It provides horizontal scaling, automatic replication, and survives node failures without downtime. This guide covers deploying a 3-node CockroachDB cluster using Portainer.

## Step 1: Deploy CockroachDB Cluster

```yaml
# docker-compose.yml - CockroachDB 3-node cluster

networks:
  cockroach_net:
    driver: bridge
    ipam:
      config:
        - subnet: 172.32.0.0/24

volumes:
  crdb1_data:
  crdb2_data:
  crdb3_data:

services:
  # CockroachDB Node 1
  crdb1:
    image: cockroachdb/cockroach:v25.2.18
    container_name: crdb1
    restart: unless-stopped
    hostname: crdb1
    networks:
      cockroach_net:
        ipv4_address: 172.32.0.10
    ports:
      - "26257:26257"  # SQL port
      - "8080:8080"    # Admin UI
    volumes:
      - crdb1_data:/cockroach/cockroach-data
    command: >
      start
      --insecure
      --advertise-addr=crdb1:26357
      --listen-addr=crdb1:26357
      --sql-addr=crdb1:26257
      --http-addr=crdb1:8080
      --join=crdb1:26357,crdb2:26357,crdb3:26357
      --locality=region=us-east1,zone=us-east1-a
      --cache=256MiB
      --max-sql-memory=256MiB
    healthcheck:
      test: ["CMD", "curl", "-f", "http://crdb1:8080/health"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

  # CockroachDB Node 2
  crdb2:
    image: cockroachdb/cockroach:v25.2.18
    container_name: crdb2
    restart: unless-stopped
    hostname: crdb2
    networks:
      cockroach_net:
        ipv4_address: 172.32.0.11
    ports:
      - "26258:26258"
      - "8081:8081"
    volumes:
      - crdb2_data:/cockroach/cockroach-data
    command: >
      start
      --insecure
      --advertise-addr=crdb2:26357
      --listen-addr=crdb2:26357
      --sql-addr=crdb2:26258
      --http-addr=crdb2:8081
      --join=crdb1:26357,crdb2:26357,crdb3:26357
      --locality=region=us-west1,zone=us-west1-a
      --cache=256MiB
      --max-sql-memory=256MiB

  # CockroachDB Node 3
  crdb3:
    image: cockroachdb/cockroach:v25.2.18
    container_name: crdb3
    restart: unless-stopped
    hostname: crdb3
    networks:
      cockroach_net:
        ipv4_address: 172.32.0.12
    ports:
      - "26259:26259"
      - "8082:8082"
    volumes:
      - crdb3_data:/cockroach/cockroach-data
    command: >
      start
      --insecure
      --advertise-addr=crdb3:26357
      --listen-addr=crdb3:26357
      --sql-addr=crdb3:26259
      --http-addr=crdb3:8082
      --join=crdb1:26357,crdb2:26357,crdb3:26357
      --locality=region=europe-west1,zone=europe-west1-a
      --cache=256MiB
      --max-sql-memory=256MiB

  # CockroachDB cluster initializer
  crdb_init:
    image: cockroachdb/cockroach:v25.2.18
    container_name: crdb_init
    restart: "no"
    networks:
      - cockroach_net
    command: >
      init
      --insecure
      --host=crdb1:26357
    depends_on:
      crdb1:
        condition: service_healthy
```

## Step 2: Initialize and Configure the Cluster

```bash
# After stack deployment, check cluster status
docker exec crdb1 ./cockroach node status --host=crdb1:26257 --insecure

# Create application database and user
docker exec crdb1 ./cockroach sql --host=crdb1:26257 --insecure --execute="
CREATE DATABASE myapp;
ALTER DATABASE myapp SET PRIMARY REGION \"us-east1\";
ALTER DATABASE myapp ADD REGION \"us-west1\";
ALTER DATABASE myapp ADD REGION \"europe-west1\";
CREATE USER appuser;
GRANT ALL ON DATABASE myapp TO appuser;
"

# Set cluster-wide settings
docker exec crdb1 ./cockroach sql --host=crdb1:26257 --insecure --execute="
SET CLUSTER SETTING sql.telemetry.query_sampling.enabled = false;
SET CLUSTER SETTING cluster.organization = 'My Company';
-- Set enterprise.license only if you have a CockroachDB license key.
"
```

## Step 3: Connect Applications (PostgreSQL-Compatible)

```python
# Python - CockroachDB is PostgreSQL-compatible
import psycopg2

# Connect to any node (all are equal in CockroachDB)
conn = psycopg2.connect(
    host="crdb1",
    port=26257,
    database="myapp",
    user="appuser",
    # Enable SSL for production
    sslmode="disable"  # Use "verify-full" and sslrootcert in production
)

cursor = conn.cursor()

# Create a table
cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name STRING NOT NULL,
        email STRING UNIQUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
    )
""")

# Insert with CockroachDB-specific types
cursor.execute(
    "INSERT INTO users (name, email) VALUES (%s, %s) RETURNING id",
    ("Alice", "alice@example.com")
)
user_id = cursor.fetchone()[0]
conn.commit()

print(f"Created user with ID: {user_id}")
```

## Step 4: CockroachDB-Specific Features

```sql
-- CockroachDB geospatial data
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name STRING,
    coords GEOGRAPHY(POINT, 4326)
);

INSERT INTO locations (name, coords) VALUES (
    'New York',
    ST_SetSRID(ST_MakePoint(-74.0060, 40.7128), 4326)::GEOGRAPHY
);

-- Find locations within 100km of a point
SELECT name FROM locations
WHERE ST_DWithin(coords, ST_SetSRID(ST_MakePoint(-74.0060, 40.7128), 4326)::GEOGRAPHY, 100000);

-- Multi-region table configuration
ALTER TABLE users SET LOCALITY GLOBAL;

-- Table partitioned across regions
ALTER TABLE locations SET LOCALITY REGIONAL BY ROW;
```

## Step 5: Monitor CockroachDB

```bash
# Check cluster health
docker exec crdb1 ./cockroach node status --host=crdb1:26257 --insecure

# View Prometheus-format SQL metrics
curl -s http://localhost:8080/_status/vars | grep '^sql_query_count'

# Check for range issues
docker exec crdb1 ./cockroach node status --host=crdb1:26257 --ranges --insecure

# View active queries
docker exec crdb1 ./cockroach sql --host=crdb1:26257 --insecure --execute="
SELECT * FROM crdb_internal.cluster_queries
ORDER BY start DESC LIMIT 10;
"
```

## Step 6: Production Considerations

```yaml
# Production configuration with TLS
services:
  crdb1:
    command: >
      start
      --certs-dir=/cockroach/certs
      --advertise-addr=crdb1:26357
      --listen-addr=crdb1:26357
      --sql-addr=crdb1:26257
      --http-addr=crdb1:8080
      --join=crdb1:26357,crdb2:26357,crdb3:26357
    volumes:
      - crdb1_data:/cockroach/cockroach-data
      - /opt/certs:/cockroach/certs:ro
```

```bash
# Generate TLS certificates
docker run --rm -v /opt/certs:/certs cockroachdb/cockroach:v25.2.18 cert create-ca \
  --certs-dir=/certs --ca-key=/certs/ca.key

docker run --rm -v /opt/certs:/certs cockroachdb/cockroach:v25.2.18 cert create-node \
  crdb1 crdb2 crdb3 localhost 127.0.0.1 \
  --certs-dir=/certs --ca-key=/certs/ca.key

docker run --rm -v /opt/certs:/certs cockroachdb/cockroach:v25.2.18 cert create-client root \
  --certs-dir=/certs --ca-key=/certs/ca.key
```

## Conclusion

CockroachDB gives you a horizontally scalable, PostgreSQL-compatible database that can survive node failures without data loss. The distributed architecture means writes can go to any node and are automatically replicated. Portainer makes managing the multi-container cluster straightforward, with visibility into each node's health and logs. The Admin UI at port 8080 provides detailed metrics on query performance, replication, and cluster health.
