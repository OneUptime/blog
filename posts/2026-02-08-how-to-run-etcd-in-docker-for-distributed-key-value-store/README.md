# How to Run etcd in Docker for Distributed Key-Value Store

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, etcd, Distributed Systems, Key-Value Store, Kubernetes, DevOps

Description: Deploy etcd distributed key-value store in Docker with clustering, watches, and lease-based TTLs for service discovery

---

etcd is a distributed key-value store that provides reliable data storage for critical system data. If you have used Kubernetes, you have used etcd, since it stores all cluster state. Beyond Kubernetes, etcd is widely used for service discovery, configuration management, distributed locking, and leader election. It uses the Raft consensus protocol to guarantee consistency across nodes. Docker makes it easy to run single-node or multi-node etcd clusters.

## What Makes etcd Special

etcd is not a general-purpose database. It is designed for small amounts of critical data that must be consistent and highly available. Think configuration files, service registries, and coordination primitives. Every write goes through Raft consensus, meaning a majority of nodes must agree before the write is committed. This gives you strong consistency guarantees at the cost of write latency.

The watch feature is particularly powerful. Clients can subscribe to key changes and get notified in real time, which makes etcd ideal for configuration distribution and service discovery.

## Quick Start - Single Node

Run a single etcd node for development.

```bash
# Start a single etcd node
docker run -d \
  --name etcd \
  -p 2379:2379 \
  -p 2380:2380 \
  -v etcd_data:/etcd-data \
  quay.io/coreos/etcd:v3.5.14 \
  etcd \
    --name node1 \
    --data-dir /etcd-data \
    --listen-client-urls http://0.0.0.0:2379 \
    --advertise-client-urls http://localhost:2379 \
    --listen-peer-urls http://0.0.0.0:2380 \
    --initial-advertise-peer-urls http://localhost:2380 \
    --initial-cluster node1=http://localhost:2380
```

Test with etcdctl.

```bash
# Put a key-value pair
docker exec etcd etcdctl put greeting "Hello from etcd"

# Get the value
docker exec etcd etcdctl get greeting

# List all keys
docker exec etcd etcdctl get "" --prefix --keys-only
```

## Three-Node Cluster with Docker Compose

A production-like etcd cluster requires an odd number of nodes (3, 5, or 7) for Raft consensus.

```yaml
# docker-compose.yml
version: "3.8"

services:
  etcd1:
    image: quay.io/coreos/etcd:v3.5.14
    container_name: etcd1
    command:
      - etcd
      - --name=etcd1
      - --data-dir=/etcd-data
      - --listen-client-urls=http://0.0.0.0:2379
      - --advertise-client-urls=http://etcd1:2379
      - --listen-peer-urls=http://0.0.0.0:2380
      - --initial-advertise-peer-urls=http://etcd1:2380
      - --initial-cluster=etcd1=http://etcd1:2380,etcd2=http://etcd2:2380,etcd3=http://etcd3:2380
      - --initial-cluster-state=new
      - --initial-cluster-token=etcd-cluster-1
    ports:
      - "2379:2379"
    volumes:
      - etcd1_data:/etcd-data
    networks:
      - etcd-net
    healthcheck:
      test: ["CMD", "etcdctl", "endpoint", "health"]
      interval: 10s
      timeout: 5s
      retries: 5

  etcd2:
    image: quay.io/coreos/etcd:v3.5.14
    container_name: etcd2
    command:
      - etcd
      - --name=etcd2
      - --data-dir=/etcd-data
      - --listen-client-urls=http://0.0.0.0:2379
      - --advertise-client-urls=http://etcd2:2379
      - --listen-peer-urls=http://0.0.0.0:2380
      - --initial-advertise-peer-urls=http://etcd2:2380
      - --initial-cluster=etcd1=http://etcd1:2380,etcd2=http://etcd2:2380,etcd3=http://etcd3:2380
      - --initial-cluster-state=new
      - --initial-cluster-token=etcd-cluster-1
    ports:
      - "2381:2379"
    volumes:
      - etcd2_data:/etcd-data
    networks:
      - etcd-net

  etcd3:
    image: quay.io/coreos/etcd:v3.5.14
    container_name: etcd3
    command:
      - etcd
      - --name=etcd3
      - --data-dir=/etcd-data
      - --listen-client-urls=http://0.0.0.0:2379
      - --advertise-client-urls=http://etcd3:2379
      - --listen-peer-urls=http://0.0.0.0:2380
      - --initial-advertise-peer-urls=http://etcd3:2380
      - --initial-cluster=etcd1=http://etcd1:2380,etcd2=http://etcd2:2380,etcd3=http://etcd3:2380
      - --initial-cluster-state=new
      - --initial-cluster-token=etcd-cluster-1
    ports:
      - "2382:2379"
    volumes:
      - etcd3_data:/etcd-data
    networks:
      - etcd-net

networks:
  etcd-net:
    driver: bridge

volumes:
  etcd1_data:
  etcd2_data:
  etcd3_data:
```

```bash
# Start the cluster
docker compose up -d

# Verify cluster health
docker exec etcd1 etcdctl endpoint health \
  --endpoints=etcd1:2379,etcd2:2379,etcd3:2379

# Check cluster members
docker exec etcd1 etcdctl member list --write-out=table
```

## Key-Value Operations

etcd organizes data in a flat key space. Prefix-based queries give you hierarchical behavior.

```bash
# Store configuration values with a hierarchical key structure
docker exec etcd1 etcdctl put /config/database/host "db.example.com"
docker exec etcd1 etcdctl put /config/database/port "5432"
docker exec etcd1 etcdctl put /config/database/name "myapp"
docker exec etcd1 etcdctl put /config/cache/host "redis.example.com"
docker exec etcd1 etcdctl put /config/cache/port "6379"

# Get all database config keys
docker exec etcd1 etcdctl get /config/database/ --prefix

# Get all config keys
docker exec etcd1 etcdctl get /config/ --prefix --keys-only

# Delete a key
docker exec etcd1 etcdctl del /config/cache/port

# Delete all keys under a prefix
docker exec etcd1 etcdctl del /config/cache/ --prefix
```

## Watching for Changes

The watch feature lets clients react to key changes in real time. This is fundamental for service discovery and configuration management.

```bash
# In one terminal, start watching a key prefix
docker exec etcd1 etcdctl watch /services/ --prefix

# In another terminal, update the key
docker exec etcd1 etcdctl put /services/api-gateway '{"host":"10.0.1.5","port":8080,"status":"healthy"}'
docker exec etcd1 etcdctl put /services/auth-service '{"host":"10.0.1.6","port":8081,"status":"healthy"}'

# The watch terminal will show each change as it happens
```

## Leases and TTLs

Leases let you attach time-to-live (TTL) values to keys. When the lease expires, all associated keys are deleted. This is perfect for service heartbeats.

```bash
# Grant a lease with a 30-second TTL
docker exec etcd1 etcdctl lease grant 30
# Output: lease 694d8284e21b2b0e granted with TTL(30s)

# Put a key with the lease (use the lease ID from above)
docker exec etcd1 etcdctl put /services/worker-01 '{"status":"alive"}' --lease=694d8284e21b2b0e

# Check the lease TTL
docker exec etcd1 etcdctl lease timetolive 694d8284e21b2b0e --keys

# Keep the lease alive (like a heartbeat)
docker exec etcd1 etcdctl lease keep-alive 694d8284e21b2b0e

# If you stop keeping the lease alive, the key auto-deletes after TTL
```

## Service Discovery Pattern

Implement a basic service discovery system using etcd.

```python
# service_discovery.py
# pip install etcd3
import etcd3
import json
import time
import threading

etcd = etcd3.client(host='localhost', port=2379)

def register_service(name, host, port, ttl=30):
    """Register a service with a heartbeat-based TTL."""
    key = f"/services/{name}/{host}:{port}"
    value = json.dumps({
        "host": host,
        "port": port,
        "registered_at": time.time()
    })

    # Create a lease and attach the service registration to it
    lease = etcd.lease(ttl)
    etcd.put(key, value, lease=lease)

    # Start a background thread to keep the lease alive
    def heartbeat():
        while True:
            try:
                lease.refresh()
                time.sleep(ttl // 3)
            except Exception:
                break

    thread = threading.Thread(target=heartbeat, daemon=True)
    thread.start()
    print(f"Registered {name} at {host}:{port}")
    return lease

def discover_services(name):
    """Find all instances of a service."""
    prefix = f"/services/{name}/"
    services = []
    for value, metadata in etcd.get_prefix(prefix):
        services.append(json.loads(value.decode()))
    return services

def watch_services(name, callback):
    """Watch for service changes and call the callback."""
    prefix = f"/services/{name}/"
    events_iterator, cancel = etcd.watch_prefix(prefix)
    for event in events_iterator:
        if isinstance(event, etcd3.events.PutEvent):
            callback("added", event.key.decode(), json.loads(event.value.decode()))
        elif isinstance(event, etcd3.events.DeleteEvent):
            callback("removed", event.key.decode(), None)

# Usage
register_service("api", "10.0.1.5", 8080)
register_service("api", "10.0.1.6", 8080)

instances = discover_services("api")
print(f"Found {len(instances)} API instances: {instances}")
```

## Distributed Locking

etcd supports distributed locks for coordinating processes across nodes.

```bash
# Acquire a lock (blocks until available)
docker exec etcd1 etcdctl lock /locks/migration-runner

# In another terminal, try to acquire the same lock (will block)
docker exec etcd1 etcdctl lock /locks/migration-runner
```

## Fault Tolerance Testing

With three nodes, the cluster survives one node failure.

```bash
# Kill one node
docker stop etcd3

# Cluster still works (2 of 3 nodes form a quorum)
docker exec etcd1 etcdctl put /test/fault-tolerance "cluster still works"
docker exec etcd1 etcdctl get /test/fault-tolerance

# Check cluster health (one endpoint will be unhealthy)
docker exec etcd1 etcdctl endpoint health \
  --endpoints=etcd1:2379,etcd2:2379,etcd3:2379

# Bring the node back
docker start etcd3
```

## Backup and Restore

```bash
# Create a snapshot backup
docker exec etcd1 etcdctl snapshot save /etcd-data/backup.db

# Copy backup to host
docker cp etcd1:/etcd-data/backup.db ./etcd-backup.db

# Check snapshot status
docker exec etcd1 etcdctl snapshot status /etcd-data/backup.db --write-out=table
```

## Monitoring

```bash
# Cluster endpoint status
docker exec etcd1 etcdctl endpoint status \
  --endpoints=etcd1:2379,etcd2:2379,etcd3:2379 \
  --write-out=table

# Metrics endpoint (Prometheus format)
curl http://localhost:2379/metrics | head -50

# Check the current leader
docker exec etcd1 etcdctl endpoint status --write-out=json | python3 -m json.tool
```

## Summary

etcd in Docker gives you a distributed, strongly consistent key-value store suitable for configuration management, service discovery, and distributed coordination. Deploy a three-node cluster with Docker Compose for fault tolerance. Use prefix-based keys for hierarchical organization, watches for real-time change notification, and leases for automatic key expiration and service heartbeats. Remember that etcd is designed for small, critical datasets, not general-purpose storage. Keep your data under a few gigabytes and use it for coordination rather than bulk data storage.
