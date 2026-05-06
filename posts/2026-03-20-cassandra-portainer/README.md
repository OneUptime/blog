# How to Deploy Cassandra via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Cassandra, NoSQL, Distributed Database, Wide Column

Description: Deploy an Apache Cassandra cluster with data replication and Cassandra Web UI using Portainer for wide-column NoSQL storage.

## Introduction

Apache Cassandra is a distributed NoSQL database designed for handling large amounts of data across multiple nodes with no single point of failure. It excels at write-heavy workloads and globally distributed data. This guide deploys a 3-node Cassandra cluster using Portainer.

## Step 1: Deploy the Cassandra Cluster

```yaml
# docker-compose.yml - Apache Cassandra Cluster

networks:
  cassandra_net:
    driver: bridge
    ipam:
      config:
        - subnet: 172.33.0.0/24

volumes:
  cassandra1_data:
  cassandra2_data:
  cassandra3_data:

services:
  # Cassandra Seed Node 1
  cassandra1:
    image: cassandra:4.1
    container_name: cassandra1
    restart: unless-stopped
    hostname: cassandra1
    entrypoint: ["/bin/bash", "-lc"]
    command: >
      sed -ri 's/^(authenticator:).*/\1 PasswordAuthenticator/' /etc/cassandra/cassandra.yaml &&
      sed -ri 's/^(authorizer:).*/\1 CassandraAuthorizer/' /etc/cassandra/cassandra.yaml &&
      exec /usr/local/bin/docker-entrypoint.sh cassandra -f
    networks:
      cassandra_net:
        ipv4_address: 172.33.0.10
    ports:
      - "9042:9042"    # CQL native transport
      - "7000:7000"    # Inter-node communication
    environment:
      - CASSANDRA_CLUSTER_NAME=MyCluster
      - CASSANDRA_NUM_TOKENS=256
      - CASSANDRA_DC=dc1
      - CASSANDRA_RACK=rack1
      - CASSANDRA_ENDPOINT_SNITCH=GossipingPropertyFileSnitch
      - CASSANDRA_SEEDS=172.33.0.10,172.33.0.11
      # Tune memory for Docker
      - MAX_HEAP_SIZE=512M
      - HEAP_NEWSIZE=128M
    volumes:
      - cassandra1_data:/var/lib/cassandra
    healthcheck:
      test: ["CMD-SHELL", "cqlsh -u cassandra -p cassandra -e 'DESCRIBE CLUSTER'"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 60s

  # Cassandra Seed Node 2
  cassandra2:
    image: cassandra:4.1
    container_name: cassandra2
    restart: unless-stopped
    hostname: cassandra2
    entrypoint: ["/bin/bash", "-lc"]
    command: >
      sed -ri 's/^(authenticator:).*/\1 PasswordAuthenticator/' /etc/cassandra/cassandra.yaml &&
      sed -ri 's/^(authorizer:).*/\1 CassandraAuthorizer/' /etc/cassandra/cassandra.yaml &&
      exec /usr/local/bin/docker-entrypoint.sh cassandra -f
    networks:
      cassandra_net:
        ipv4_address: 172.33.0.11
    ports:
      - "9043:9042"
    environment:
      - CASSANDRA_CLUSTER_NAME=MyCluster
      - CASSANDRA_DC=dc1
      - CASSANDRA_RACK=rack1
      - CASSANDRA_ENDPOINT_SNITCH=GossipingPropertyFileSnitch
      - CASSANDRA_SEEDS=172.33.0.10,172.33.0.11
      - MAX_HEAP_SIZE=512M
      - HEAP_NEWSIZE=128M
    volumes:
      - cassandra2_data:/var/lib/cassandra
    healthcheck:
      test: ["CMD-SHELL", "cqlsh -u cassandra -p cassandra -e 'DESCRIBE CLUSTER'"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 60s
    depends_on:
      cassandra1:
        condition: service_healthy

  # Cassandra Node 3
  cassandra3:
    image: cassandra:4.1
    container_name: cassandra3
    restart: unless-stopped
    hostname: cassandra3
    entrypoint: ["/bin/bash", "-lc"]
    command: >
      sed -ri 's/^(authenticator:).*/\1 PasswordAuthenticator/' /etc/cassandra/cassandra.yaml &&
      sed -ri 's/^(authorizer:).*/\1 CassandraAuthorizer/' /etc/cassandra/cassandra.yaml &&
      exec /usr/local/bin/docker-entrypoint.sh cassandra -f
    networks:
      cassandra_net:
        ipv4_address: 172.33.0.12
    ports:
      - "9044:9042"
    environment:
      - CASSANDRA_CLUSTER_NAME=MyCluster
      - CASSANDRA_DC=dc1
      - CASSANDRA_RACK=rack1
      - CASSANDRA_ENDPOINT_SNITCH=GossipingPropertyFileSnitch
      - CASSANDRA_SEEDS=172.33.0.10,172.33.0.11
      - MAX_HEAP_SIZE=512M
      - HEAP_NEWSIZE=128M
    volumes:
      - cassandra3_data:/var/lib/cassandra
    healthcheck:
      test: ["CMD-SHELL", "cqlsh -u cassandra -p cassandra -e 'DESCRIBE CLUSTER'"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 60s
    depends_on:
      cassandra2:
        condition: service_healthy

  # Cassandra Web UI
  cassandra_web:
    image: dcagatay/cassandra-web:latest
    container_name: cassandra_web
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - CASSANDRA_HOST_IPS=172.33.0.10,172.33.0.11,172.33.0.12
      - CASSANDRA_PORT=9042
      - CASSANDRA_USERNAME=cassandra
      - CASSANDRA_PASSWORD=cassandra
    networks:
      - cassandra_net
    depends_on:
      cassandra1:
        condition: service_healthy
```

## Step 2: Initialize Keyspace and Tables

```bash
# Connect to Cassandra
docker exec -it cassandra1 cqlsh -u cassandra -p cassandra

# Or run CQL commands directly
docker exec cassandra1 cqlsh -u cassandra -p cassandra -e "
-- Replicate authentication data across the cluster
ALTER KEYSPACE system_auth
WITH replication = {
  'class': 'NetworkTopologyStrategy',
  'dc1': 3
};

-- Create application keyspace with replication factor 3
CREATE KEYSPACE IF NOT EXISTS myapp
WITH replication = {
  'class': 'NetworkTopologyStrategy',
  'dc1': 3
} AND durable_writes = true;

-- Use the keyspace
USE myapp;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY,
    email TEXT,
    name TEXT,
    created_at TIMESTAMP,
    metadata MAP<TEXT, TEXT>
);

-- Create secondary index for email lookups
CREATE INDEX IF NOT EXISTS ON users (email);

-- Time-series events table (optimized for write-heavy workloads)
CREATE TABLE IF NOT EXISTS user_events (
    user_id UUID,
    event_time TIMESTAMP,
    event_type TEXT,
    data TEXT,
    PRIMARY KEY (user_id, event_time)
) WITH CLUSTERING ORDER BY (event_time DESC)
AND compaction = {
    'class': 'TimeWindowCompactionStrategy',
    'compaction_window_unit': 'DAYS',
    'compaction_window_size': 1
};

-- Create application user
CREATE ROLE IF NOT EXISTS appuser WITH PASSWORD = 'app_secure_password' AND LOGIN = true;
GRANT ALL PERMISSIONS ON KEYSPACE myapp TO appuser;
"

# Distribute the updated system_auth replication to all nodes
docker exec cassandra1 nodetool repair --full -pr system_auth
docker exec cassandra2 nodetool repair --full -pr system_auth
docker exec cassandra3 nodetool repair --full -pr system_auth
```

## Step 3: Connect Applications

```python
# Python - Cassandra with cassandra-driver
from cassandra import ConsistencyLevel
from cassandra.cluster import Cluster
from cassandra.auth import PlainTextAuthProvider
from cassandra.policies import DCAwareRoundRobinPolicy
import uuid
from datetime import datetime, timezone

# Run this from another container attached to cassandra_net
auth_provider = PlainTextAuthProvider(username='appuser', password='app_secure_password')

cluster = Cluster(
    contact_points=['cassandra1'],
    port=9042,
    auth_provider=auth_provider,
    # Local DC for topology-aware routing
    load_balancing_policy=DCAwareRoundRobinPolicy(local_dc='dc1')
)

session = cluster.connect('myapp')

# Prepare statements for better performance
insert_user = session.prepare("""
    INSERT INTO users (user_id, email, name, created_at)
    VALUES (?, ?, ?, ?)
""")

# Insert with QUORUM consistency (majority of replicas must acknowledge)
insert_user.consistency_level = ConsistencyLevel.QUORUM

user_id = uuid.uuid4()
session.execute(insert_user, (
    user_id,
    "alice@example.com",
    "Alice",
    datetime.now(timezone.utc)
))

# Read with LOCAL_QUORUM in the local datacenter
select_user = session.prepare("""
    SELECT * FROM users WHERE user_id = ?
""")
select_user.consistency_level = ConsistencyLevel.LOCAL_QUORUM

row = session.execute(select_user, [user_id]).one()
print(f"Found user: {row.name}")

# Write time-series events (fast inserts)
insert_event = session.prepare("""
    INSERT INTO user_events (user_id, event_time, event_type, data)
    VALUES (?, ?, ?, ?)
""")

session.execute(insert_event, (
    user_id,
    datetime.now(timezone.utc),
    "page_view",
    '{"page": "/dashboard"}'
))

cluster.shutdown()
```

## Step 4: Monitor Cluster Health

```bash
# Check cluster status
docker exec cassandra1 nodetool status

# Check ring topology
docker exec cassandra1 nodetool ring

# View table statistics
docker exec cassandra1 nodetool tablestats myapp.users

# Repair inconsistencies
docker exec cassandra1 nodetool repair myapp

# Compact all SSTables
docker exec cassandra1 nodetool compact myapp
```

## Step 5: Backup Cassandra

```bash
#!/bin/bash
# backup-cassandra.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups/cassandra"
mkdir -p "$BACKUP_DIR"

# Take snapshot on all nodes
docker exec cassandra1 nodetool snapshot -t "$DATE" myapp
docker exec cassandra2 nodetool snapshot -t "$DATE" myapp
docker exec cassandra3 nodetool snapshot -t "$DATE" myapp

# Archive only the snapshot directories from each node
for NODE in cassandra1 cassandra2 cassandra3; do
    docker exec "$NODE" sh -c "
        cd /var/lib/cassandra/data &&
        find myapp -type d -path '*/snapshots/$DATE' -print0 |
        tar --null -czf - --files-from -
    " > "$BACKUP_DIR/${NODE}_${DATE}.tar.gz"
done

# Clean up snapshots in containers
docker exec cassandra1 nodetool clearsnapshot -t "$DATE" myapp
docker exec cassandra2 nodetool clearsnapshot -t "$DATE" myapp
docker exec cassandra3 nodetool clearsnapshot -t "$DATE" myapp

echo "Cassandra backup: $DATE"
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -delete
```

## Conclusion

Apache Cassandra running in Docker via Portainer gives you a scalable NoSQL database with replication across three nodes. With replication factor 3 and QUORUM or LOCAL_QUORUM operations, this cluster can continue serving requests if one Cassandra node fails. Because all three containers run on the same Docker host in this example, the host itself is still a single point of failure. The consistency level controls let you tune the trade-off between consistency and availability on a per-query basis. Portainer makes it easy to monitor all three nodes and run maintenance tasks like repairs and compactions via the container exec feature.
