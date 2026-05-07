# How to Use Podman with etcd

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, etcd, Distributed System, Key-Value Store, Service Discovery

Description: Learn how to deploy and manage etcd clusters using Podman containers for distributed configuration management, service discovery, and leader election.

---

> Running etcd in Podman containers gives you a reliable distributed key-value store for configuration management, service discovery, and coordination, with the isolation and portability that containers provide.

etcd is a distributed, reliable key-value store that serves as the backbone for many distributed systems. It is the primary data store for Kubernetes, but its uses extend far beyond orchestration. Configuration management, service discovery, distributed locking, and leader election are all common use cases. Running etcd in Podman containers simplifies deployment, makes cluster management more predictable, and provides the isolation needed for reliable operation.

---

## Running a Single etcd Node

Start a single etcd instance for development:

```bash
podman volume create etcd-data

podman run -d \
  --name etcd \
  --restart always \
  -p 2379:2379 \
  -p 2380:2380 \
  -v etcd-data:/etcd-data:Z \
  quay.io/coreos/etcd:v3.5.30 \
  /usr/local/bin/etcd \
  --name node1 \
  --data-dir /etcd-data \
  --listen-client-urls http://0.0.0.0:2379 \
  --advertise-client-urls http://localhost:2379 \
  --listen-peer-urls http://0.0.0.0:2380 \
  --initial-advertise-peer-urls http://localhost:2380 \
  --initial-cluster node1=http://localhost:2380
```

Verify it is running:

```bash
podman exec etcd etcdctl endpoint health
podman exec etcd etcdctl put greeting "hello from etcd"
podman exec etcd etcdctl get greeting
```

## Deploying a Three-Node Cluster

For production, deploy an etcd cluster with three or more nodes for fault tolerance:

```yaml
# etcd-cluster.yml

version: "3"
services:
  etcd1:
    image: quay.io/coreos/etcd:v3.5.30
    restart: always
    ports:
      - "2379:2379"
    volumes:
      - etcd1-data:/etcd-data
    command:
      - /usr/local/bin/etcd
      - --name=etcd1
      - --data-dir=/etcd-data
      - --listen-client-urls=http://0.0.0.0:2379
      - --advertise-client-urls=http://etcd1:2379
      - --listen-peer-urls=http://0.0.0.0:2380
      - --initial-advertise-peer-urls=http://etcd1:2380
      - --initial-cluster=etcd1=http://etcd1:2380,etcd2=http://etcd2:2380,etcd3=http://etcd3:2380
      - --initial-cluster-state=new
      - --initial-cluster-token=my-etcd-cluster

  etcd2:
    image: quay.io/coreos/etcd:v3.5.30
    restart: always
    volumes:
      - etcd2-data:/etcd-data
    command:
      - /usr/local/bin/etcd
      - --name=etcd2
      - --data-dir=/etcd-data
      - --listen-client-urls=http://0.0.0.0:2379
      - --advertise-client-urls=http://etcd2:2379
      - --listen-peer-urls=http://0.0.0.0:2380
      - --initial-advertise-peer-urls=http://etcd2:2380
      - --initial-cluster=etcd1=http://etcd1:2380,etcd2=http://etcd2:2380,etcd3=http://etcd3:2380
      - --initial-cluster-state=new
      - --initial-cluster-token=my-etcd-cluster

  etcd3:
    image: quay.io/coreos/etcd:v3.5.30
    restart: always
    volumes:
      - etcd3-data:/etcd-data
    command:
      - /usr/local/bin/etcd
      - --name=etcd3
      - --data-dir=/etcd-data
      - --listen-client-urls=http://0.0.0.0:2379
      - --advertise-client-urls=http://etcd3:2379
      - --listen-peer-urls=http://0.0.0.0:2380
      - --initial-advertise-peer-urls=http://etcd3:2380
      - --initial-cluster=etcd1=http://etcd1:2380,etcd2=http://etcd2:2380,etcd3=http://etcd3:2380
      - --initial-cluster-state=new
      - --initial-cluster-token=my-etcd-cluster

volumes:
  etcd1-data:
  etcd2-data:
  etcd3-data:
```

```bash
podman compose -f etcd-cluster.yml up -d

# Check cluster health
podman compose -f etcd-cluster.yml exec etcd1 \
  etcdctl endpoint health --cluster
```

## Using etcd for Configuration Management

Store and retrieve application configuration:

```bash
# Store configuration values
podman exec etcd etcdctl put /config/database/host "db.example.com"
podman exec etcd etcdctl put /config/database/port "5432"
podman exec etcd etcdctl put /config/database/name "production"
podman exec etcd etcdctl put /config/app/log_level "info"
podman exec etcd etcdctl put /config/app/max_connections "100"

# Retrieve all configuration under a prefix
podman exec etcd etcdctl get /config/ --prefix

# Watch for configuration changes
podman exec etcd etcdctl watch /config/ --prefix
```

## Application Integration with etcd

Use etcd as a configuration source in your application:

```python
# config_client.py
import etcd3
import json
import threading
import os

class EtcdConfig:
    def __init__(self, host='localhost', port=2379, prefix='/config/'):
        self.client = etcd3.client(host=host, port=port)
        self.prefix = prefix
        self.config = {}
        self._load_config()

    def _load_config(self):
        """Load all configuration from etcd."""
        for value, metadata in self.client.get_prefix(self.prefix):
            key = metadata.key.decode('utf-8').replace(self.prefix, '')
            self.config[key] = value.decode('utf-8')

    def get(self, key, default=None):
        """Get a configuration value."""
        return self.config.get(key, default)

    def set(self, key, value):
        """Set a configuration value."""
        self.client.put(f"{self.prefix}{key}", str(value))
        self.config[key] = str(value)

    def watch(self, callback):
        """Watch for configuration changes."""
        events_iterator, cancel = self.client.watch_prefix(self.prefix)
        for event in events_iterator:
            key = event.key.decode('utf-8').replace(self.prefix, '')
            if isinstance(event, etcd3.events.PutEvent):
                value = event.value.decode('utf-8')
                self.config[key] = value
                callback(key, value, 'put')
            elif isinstance(event, etcd3.events.DeleteEvent):
                self.config.pop(key, None)
                callback(key, None, 'delete')

# Usage
config = EtcdConfig(host='localhost')
db_host = config.get('database/host', 'localhost')
log_level = config.get('app/log_level', 'info')

print(f"Database host: {db_host}")
print(f"Log level: {log_level}")

# Watch for changes in a separate thread
def on_change(key, value, action):
    print(f"Config changed: {key} = {value} ({action})")

watcher = threading.Thread(target=config.watch, args=(on_change,), daemon=True)
watcher.start()
```

## Service Discovery with etcd

Register and discover services:

```python
# service_registry.py
import etcd3
import json
import time
import threading
import socket

class ServiceRegistry:
    def __init__(self, host='localhost', port=2379):
        self.client = etcd3.client(host=host, port=port)

    def register(self, service_name, instance_id, address, port, ttl=30):
        """Register a service instance with a TTL lease."""
        lease = self.client.lease(ttl)
        key = f"/services/{service_name}/{instance_id}"
        value = json.dumps({
            "address": address,
            "port": port,
            "registered_at": time.time(),
        })
        self.client.put(key, value, lease=lease)

        # Keep the lease alive in a background thread
        def keep_alive():
            while True:
                try:
                    lease.refresh()
                    time.sleep(ttl // 3)
                except Exception:
                    break

        thread = threading.Thread(target=keep_alive, daemon=True)
        thread.start()
        return lease

    def discover(self, service_name):
        """Discover all instances of a service."""
        instances = []
        prefix = f"/services/{service_name}/"
        for value, metadata in self.client.get_prefix(prefix):
            instance = json.loads(value.decode('utf-8'))
            instance['id'] = metadata.key.decode('utf-8').split('/')[-1]
            instances.append(instance)
        return instances

# Usage
registry = ServiceRegistry()

# Register this service
hostname = socket.gethostname()
registry.register("api-service", f"instance-{hostname}", hostname, 8080)

# Discover other services
db_instances = registry.discover("database-service")
for instance in db_instances:
    print(f"Found database at {instance['address']}:{instance['port']}")
```

## Backup and Restore

Back up your etcd data:

```bash
#!/bin/bash
# backup-etcd.sh

BACKUP_DIR="/backups/etcd"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/etcd-snapshot-$TIMESTAMP.db"

mkdir -p "$BACKUP_DIR"

podman exec etcd etcdctl --endpoints=http://localhost:2379 snapshot save /tmp/snapshot.db
podman cp etcd:/tmp/snapshot.db "$BACKUP_FILE"

echo "Backup saved to $BACKUP_FILE"
echo "Snapshot status:"
podman exec etcd etcdutl --write-out=table snapshot status /tmp/snapshot.db

# Remove backups older than 7 days
find "$BACKUP_DIR" -name "etcd-snapshot-*.db" -mtime +7 -delete
```

Restore from backup:

```bash
#!/bin/bash
# restore-etcd.sh

BACKUP_FILE="$1"

podman stop etcd
podman rm etcd
podman volume rm etcd-data
podman volume create etcd-data

podman run --rm \
  -v "$BACKUP_FILE:/tmp/snapshot.db:ro,Z" \
  -v etcd-data:/etcd-data:Z \
  quay.io/coreos/etcd:v3.5.30 \
  /usr/local/bin/etcdutl snapshot restore /tmp/snapshot.db \
  --name node1 \
  --data-dir /etcd-data \
  --initial-cluster node1=http://localhost:2380 \
  --initial-advertise-peer-urls http://localhost:2380

# Restart etcd with the restored data
podman run -d \
  --name etcd \
  --restart always \
  -p 2379:2379 \
  -p 2380:2380 \
  -v etcd-data:/etcd-data:Z \
  quay.io/coreos/etcd:v3.5.30 \
  /usr/local/bin/etcd \
  --name node1 \
  --data-dir /etcd-data \
  --listen-client-urls http://0.0.0.0:2379 \
  --advertise-client-urls http://localhost:2379 \
  --listen-peer-urls http://0.0.0.0:2380

echo "etcd restored from $BACKUP_FILE"
```

## Monitoring etcd

Expose etcd metrics for Prometheus:

```bash
# etcd exposes metrics on /metrics by default
curl -s http://localhost:2379/metrics | head -20

# Key metrics to monitor:
# etcd_server_has_leader - Should always be 1
# etcd_disk_wal_fsync_duration_seconds - Disk performance
# etcd_network_peer_round_trip_time_seconds - Network latency
# etcd_server_proposals_committed_total - Raft consensus activity
```

## Conclusion

etcd running in Podman containers provides a reliable distributed key-value store for configuration management, service discovery, and distributed coordination. The three-node cluster setup ensures fault tolerance, while volume mounts preserve data across container restarts. With built-in support for watching key changes, TTL-based leases for service registration, and point-in-time snapshots for backup, etcd gives you the primitives needed to build robust distributed systems. Podman's container isolation ensures that etcd runs predictably and does not interfere with other services on the same host.
