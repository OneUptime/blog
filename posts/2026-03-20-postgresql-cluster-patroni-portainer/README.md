# How to Deploy a PostgreSQL Cluster with Patroni via Portainer - Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, PostgreSQL, Patroni, High Availability, Database, Clustering

Description: Deploy a highly available PostgreSQL cluster using Patroni for automatic failover and HAProxy for connection pooling via Portainer.

## Introduction

Patroni is the most popular tool for managing highly available PostgreSQL clusters. It uses etcd (or Consul/ZooKeeper) as a distributed configuration store to elect a leader and manage failover. This guide deploys a 3-node Patroni cluster backed by a 3-node etcd cluster, with HAProxy as a connection router, managed through Portainer.

## Architecture

```text
Applications
    │
    ▼
HAProxy (routes writes to primary, reads to replicas)
    │
    ├──▶ PostgreSQL Primary (Leader)
    ├──▶ PostgreSQL Replica 1 (Standby)
    └──▶ PostgreSQL Replica 2 (Standby)

Patroni nodes coordinate through etcd quorum:
    ├──▶ etcd 1
    ├──▶ etcd 2
    └──▶ etcd 3
```

## Step 1: Deploy the Patroni Stack

```yaml
# docker-compose.yml - Patroni PostgreSQL Cluster

version: "3.8"

networks:
  patroni_net:
    driver: bridge
    ipam:
      config:
        - subnet: 172.29.0.0/24

volumes:
  etcd1_data:
  etcd2_data:
  etcd3_data:
  pg1_data:
  pg2_data:
  pg3_data:

services:
  # etcd - distributed coordination quorum
  etcd1:
    image: quay.io/coreos/etcd:v3.5.0
    container_name: etcd1
    restart: unless-stopped
    networks:
      patroni_net:
        ipv4_address: 172.29.0.10
    ports:
      - "2379:2379"
    environment:
      - ETCD_NAME=etcd1
      - ETCD_DATA_DIR=/etcd-data
      - ETCD_LISTEN_CLIENT_URLS=http://0.0.0.0:2379
      - ETCD_ADVERTISE_CLIENT_URLS=http://172.29.0.10:2379
      - ETCD_LISTEN_PEER_URLS=http://0.0.0.0:2380
      - ETCD_INITIAL_ADVERTISE_PEER_URLS=http://172.29.0.10:2380
      - ETCD_INITIAL_CLUSTER=etcd1=http://172.29.0.10:2380,etcd2=http://172.29.0.20:2380,etcd3=http://172.29.0.30:2380
      - ETCD_INITIAL_CLUSTER_TOKEN=patroni-cluster
      - ETCD_INITIAL_CLUSTER_STATE=new
    volumes:
      - etcd1_data:/etcd-data

  etcd2:
    image: quay.io/coreos/etcd:v3.5.0
    container_name: etcd2
    restart: unless-stopped
    networks:
      patroni_net:
        ipv4_address: 172.29.0.20
    environment:
      - ETCD_NAME=etcd2
      - ETCD_DATA_DIR=/etcd-data
      - ETCD_LISTEN_CLIENT_URLS=http://0.0.0.0:2379
      - ETCD_ADVERTISE_CLIENT_URLS=http://172.29.0.20:2379
      - ETCD_LISTEN_PEER_URLS=http://0.0.0.0:2380
      - ETCD_INITIAL_ADVERTISE_PEER_URLS=http://172.29.0.20:2380
      - ETCD_INITIAL_CLUSTER=etcd1=http://172.29.0.10:2380,etcd2=http://172.29.0.20:2380,etcd3=http://172.29.0.30:2380
      - ETCD_INITIAL_CLUSTER_TOKEN=patroni-cluster
      - ETCD_INITIAL_CLUSTER_STATE=new
    volumes:
      - etcd2_data:/etcd-data

  etcd3:
    image: quay.io/coreos/etcd:v3.5.0
    container_name: etcd3
    restart: unless-stopped
    networks:
      patroni_net:
        ipv4_address: 172.29.0.30
    environment:
      - ETCD_NAME=etcd3
      - ETCD_DATA_DIR=/etcd-data
      - ETCD_LISTEN_CLIENT_URLS=http://0.0.0.0:2379
      - ETCD_ADVERTISE_CLIENT_URLS=http://172.29.0.30:2379
      - ETCD_LISTEN_PEER_URLS=http://0.0.0.0:2380
      - ETCD_INITIAL_ADVERTISE_PEER_URLS=http://172.29.0.30:2380
      - ETCD_INITIAL_CLUSTER=etcd1=http://172.29.0.10:2380,etcd2=http://172.29.0.20:2380,etcd3=http://172.29.0.30:2380
      - ETCD_INITIAL_CLUSTER_TOKEN=patroni-cluster
      - ETCD_INITIAL_CLUSTER_STATE=new
    volumes:
      - etcd3_data:/etcd-data

  # PostgreSQL Node 1
  pg1:
    image: patroni/patroni:3.2.2
    container_name: pg1
    restart: unless-stopped
    hostname: pg1
    networks:
      patroni_net:
        ipv4_address: 172.29.0.11
    ports:
      - "5433:5432"
      - "8009:8008"   # Patroni REST API
    environment:
      - PATRONI_NAME=pg1
      - PATRONI_RESTAPI_LISTEN=0.0.0.0:8008
      - PATRONI_RESTAPI_CONNECT_ADDRESS=172.29.0.11:8008
      - PATRONI_POSTGRESQL_LISTEN=0.0.0.0:5432
      - PATRONI_POSTGRESQL_CONNECT_ADDRESS=172.29.0.11:5432
      - PATRONI_ETCD3_HOSTS=172.29.0.10:2379,172.29.0.20:2379,172.29.0.30:2379
      - PATRONI_SUPERUSER_USERNAME=postgres
      - PATRONI_SUPERUSER_PASSWORD=postgres_super_password
      - PATRONI_REPLICATION_USERNAME=replicator
      - PATRONI_REPLICATION_PASSWORD=replication_password
      - PATRONI_SCOPE=postgres-ha
    volumes:
      - pg1_data:/home/postgres/data
    depends_on:
      - etcd1
      - etcd2
      - etcd3

  # PostgreSQL Node 2
  pg2:
    image: patroni/patroni:3.2.2
    container_name: pg2
    restart: unless-stopped
    hostname: pg2
    networks:
      patroni_net:
        ipv4_address: 172.29.0.12
    ports:
      - "5434:5432"
      - "8010:8008"
    environment:
      - PATRONI_NAME=pg2
      - PATRONI_RESTAPI_LISTEN=0.0.0.0:8008
      - PATRONI_RESTAPI_CONNECT_ADDRESS=172.29.0.12:8008
      - PATRONI_POSTGRESQL_LISTEN=0.0.0.0:5432
      - PATRONI_POSTGRESQL_CONNECT_ADDRESS=172.29.0.12:5432
      - PATRONI_ETCD3_HOSTS=172.29.0.10:2379,172.29.0.20:2379,172.29.0.30:2379
      - PATRONI_SUPERUSER_USERNAME=postgres
      - PATRONI_SUPERUSER_PASSWORD=postgres_super_password
      - PATRONI_REPLICATION_USERNAME=replicator
      - PATRONI_REPLICATION_PASSWORD=replication_password
      - PATRONI_SCOPE=postgres-ha
    volumes:
      - pg2_data:/home/postgres/data
    depends_on:
      - etcd1
      - etcd2
      - etcd3

  # PostgreSQL Node 3
  pg3:
    image: patroni/patroni:3.2.2
    container_name: pg3
    restart: unless-stopped
    hostname: pg3
    networks:
      patroni_net:
        ipv4_address: 172.29.0.13
    ports:
      - "5435:5432"
      - "8011:8008"
    environment:
      - PATRONI_NAME=pg3
      - PATRONI_RESTAPI_LISTEN=0.0.0.0:8008
      - PATRONI_RESTAPI_CONNECT_ADDRESS=172.29.0.13:8008
      - PATRONI_POSTGRESQL_LISTEN=0.0.0.0:5432
      - PATRONI_POSTGRESQL_CONNECT_ADDRESS=172.29.0.13:5432
      - PATRONI_ETCD3_HOSTS=172.29.0.10:2379,172.29.0.20:2379,172.29.0.30:2379
      - PATRONI_SUPERUSER_USERNAME=postgres
      - PATRONI_SUPERUSER_PASSWORD=postgres_super_password
      - PATRONI_REPLICATION_USERNAME=replicator
      - PATRONI_REPLICATION_PASSWORD=replication_password
      - PATRONI_SCOPE=postgres-ha
    volumes:
      - pg3_data:/home/postgres/data
    depends_on:
      - etcd1
      - etcd2
      - etcd3

  # HAProxy for connection routing
  haproxy:
    image: haproxy:2.8
    container_name: pg_haproxy
    restart: unless-stopped
    ports:
      - "5432:5000"   # Read-write (primary only)
      - "5431:5001"   # Read-only (all replicas)
      - "7000:7000"   # HAProxy stats
    volumes:
      - ./haproxy/haproxy.cfg:/usr/local/etc/haproxy/haproxy.cfg
    networks:
      - patroni_net
    depends_on:
      - pg1
      - pg2
      - pg3
```

## Step 2: HAProxy Configuration

```ini
# haproxy/haproxy.cfg
global
    maxconn 100

defaults
    log     global
    mode    tcp
    retries 3
    timeout client  30m
    timeout connect 4s
    timeout server  30m
    option  clitcpka

# Stats page
listen stats
    mode http
    bind *:7000
    stats enable
    stats uri /

# Read-write endpoint (primary only)
# Uses Patroni REST API for health checks
listen postgres_primary
    bind *:5000
    option httpchk GET /primary
    http-check expect status 200
    default-server inter 3s fall 3 rise 2 on-marked-down shutdown-sessions
    server pg1 172.29.0.11:5432 maxconn 100 check port 8008
    server pg2 172.29.0.12:5432 maxconn 100 check port 8008
    server pg3 172.29.0.13:5432 maxconn 100 check port 8008

# Read-only endpoint (all replicas)
listen postgres_replicas
    bind *:5001
    option httpchk GET /replica
    http-check expect status 200
    default-server inter 3s fall 3 rise 2 on-marked-down shutdown-sessions
    server pg1 172.29.0.11:5432 maxconn 100 check port 8008
    server pg2 172.29.0.12:5432 maxconn 100 check port 8008
    server pg3 172.29.0.13:5432 maxconn 100 check port 8008
```

## Step 3: Check Cluster Status

```bash
# Check cluster status via Patroni REST API
curl http://localhost:8009/cluster | jq .

# Check which node is leader
curl http://localhost:8009/primary

# Check replica status
curl http://localhost:8010/replica

# Use patronictl
docker exec pg1 patronictl -c /home/postgres/postgres0.yml list

# Manual switchover to pg2
docker exec pg1 patronictl -c /home/postgres/postgres0.yml switchover \
  postgres-ha \
  --leader pg1 \
  --candidate pg2 \
  --force
```

## Step 4: Connect Applications

```python
# Python with psycopg2 - connect via HAProxy
import psycopg2
from psycopg2.pool import ThreadedConnectionPool

# Write connection (primary)
write_pool = ThreadedConnectionPool(
    minconn=2,
    maxconn=10,
    host="haproxy",
    port=5000,  # Read-write port
    database="myapp",
    user="appuser",
    password="app_password"
)

# Read connection (replicas)
read_pool = ThreadedConnectionPool(
    minconn=2,
    maxconn=20,
    host="haproxy",
    port=5001,  # Read-only port
    database="myapp",
    user="appuser",
    password="app_password"
)
```

## Step 5: PgBouncer Connection Pooling

```yaml
# Add PgBouncer for connection pooling
services:
  pgbouncer:
    image: bitnami/pgbouncer:latest
    container_name: pgbouncer
    restart: unless-stopped
    ports:
      - "6432:6432"
    environment:
      - POSTGRESQL_HOST=haproxy
      - POSTGRESQL_PORT=5000
      - POSTGRESQL_USERNAME=postgres
      - POSTGRESQL_PASSWORD=postgres_super_password
      - POSTGRESQL_DATABASE=myapp
      - PGBOUNCER_POOL_MODE=transaction
      - PGBOUNCER_MAX_CLIENT_CONN=100
      - PGBOUNCER_DEFAULT_POOL_SIZE=20
    networks:
      - patroni_net
```

## Conclusion

Your PostgreSQL cluster now has automatic failover with Patroni. When the primary fails, Patroni holds an election via etcd and promotes a replica in seconds. HAProxy uses Patroni's REST API to route connections only to the healthy primary for writes and distributes reads across all replicas. Portainer makes it easy to monitor all components, view replication logs, and restart any failed nodes. PgBouncer handles connection pooling to prevent connection exhaustion under load.
