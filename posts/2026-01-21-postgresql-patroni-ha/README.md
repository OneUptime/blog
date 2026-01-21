# How to Set Up PostgreSQL with Patroni for High Availability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Patroni, High Availability, Failover, etcd, Consul

Description: A comprehensive guide to setting up PostgreSQL high availability with Patroni, covering cluster configuration, automatic failover, switchover procedures, and production best practices.

---

Patroni is a template for PostgreSQL HA with ZooKeeper, etcd, Consul, or Kubernetes. It handles automatic failover, provides a REST API for cluster management, and integrates with connection poolers. This guide covers complete Patroni setup for production use.

## Prerequisites

- Three or more servers for PostgreSQL nodes
- Distributed configuration store (etcd recommended)
- Network connectivity between all nodes
- Understanding of PostgreSQL replication

## Architecture Overview

```
                    Application
                         |
                    HAProxy/PgBouncer
                         |
         +---------------+---------------+
         |               |               |
    +----v----+    +-----v-----+   +-----v-----+
    | Patroni |    |  Patroni  |   |  Patroni  |
    |   +     |    |    +      |   |    +      |
    |  PG     |    |   PG      |   |   PG      |
    | Primary |    | Replica   |   | Replica   |
    +---------+    +-----------+   +-----------+
         |               |               |
         +---------------+---------------+
                         |
                   etcd Cluster
```

## Install Prerequisites

### Install etcd

```bash
# On each etcd node
sudo apt install etcd -y

# Or download specific version
ETCD_VER=v3.5.12
wget https://github.com/etcd-io/etcd/releases/download/${ETCD_VER}/etcd-${ETCD_VER}-linux-amd64.tar.gz
tar xzf etcd-${ETCD_VER}-linux-amd64.tar.gz
sudo mv etcd-${ETCD_VER}-linux-amd64/etcd* /usr/local/bin/
```

Configure etcd cluster:

```yaml
# /etc/etcd/etcd.conf
name: etcd1
data-dir: /var/lib/etcd
initial-cluster-state: new
initial-cluster: etcd1=http://10.0.0.1:2380,etcd2=http://10.0.0.2:2380,etcd3=http://10.0.0.3:2380
initial-advertise-peer-urls: http://10.0.0.1:2380
listen-peer-urls: http://10.0.0.1:2380
listen-client-urls: http://10.0.0.1:2379,http://127.0.0.1:2379
advertise-client-urls: http://10.0.0.1:2379
```

### Install Patroni

```bash
# Install dependencies
sudo apt install python3 python3-pip -y

# Install Patroni
sudo pip3 install patroni[etcd]

# Verify
patroni --version
```

### Install PostgreSQL

```bash
# Install PostgreSQL
sudo apt install postgresql-16 postgresql-contrib-16 -y

# Stop default instance
sudo systemctl stop postgresql
sudo systemctl disable postgresql
```

## Patroni Configuration

### Create Configuration File

```yaml
# /etc/patroni/patroni.yml
scope: postgres-cluster
namespace: /db/
name: pg-node1

restapi:
  listen: 0.0.0.0:8008
  connect_address: 10.0.0.11:8008

etcd:
  hosts: 10.0.0.1:2379,10.0.0.2:2379,10.0.0.3:2379

bootstrap:
  dcs:
    ttl: 30
    loop_wait: 10
    retry_timeout: 10
    maximum_lag_on_failover: 1048576
    postgresql:
      use_pg_rewind: true
      use_slots: true
      parameters:
        wal_level: replica
        hot_standby: on
        max_wal_senders: 10
        max_replication_slots: 10
        wal_keep_size: 1GB
        hot_standby_feedback: on
        max_connections: 200
        shared_buffers: 2GB
        effective_cache_size: 6GB
        work_mem: 64MB
        maintenance_work_mem: 512MB

  initdb:
    - encoding: UTF8
    - data-checksums

  pg_hba:
    - host replication replicator 10.0.0.0/24 scram-sha-256
    - host all all 10.0.0.0/24 scram-sha-256
    - host all all 0.0.0.0/0 scram-sha-256

  users:
    admin:
      password: admin_password
      options:
        - createrole
        - createdb
    replicator:
      password: replicator_password
      options:
        - replication

postgresql:
  listen: 0.0.0.0:5432
  connect_address: 10.0.0.11:5432
  data_dir: /var/lib/postgresql/16/main
  bin_dir: /usr/lib/postgresql/16/bin
  pgpass: /tmp/pgpass
  authentication:
    replication:
      username: replicator
      password: replicator_password
    superuser:
      username: postgres
      password: postgres_password
    rewind:
      username: postgres
      password: postgres_password
  parameters:
    unix_socket_directories: '/var/run/postgresql'
  create_replica_methods:
    - basebackup
  basebackup:
    max-rate: '100M'
    checkpoint: 'fast'

tags:
  nofailover: false
  noloadbalance: false
  clonefrom: false
  nosync: false
```

### Create Systemd Service

```ini
# /etc/systemd/system/patroni.service
[Unit]
Description=Patroni PostgreSQL High Availability
After=network.target etcd.service

[Service]
Type=simple
User=postgres
Group=postgres
ExecStart=/usr/local/bin/patroni /etc/patroni/patroni.yml
ExecReload=/bin/kill -s HUP $MAINPID
KillMode=process
TimeoutSec=30
Restart=always

[Install]
WantedBy=multi-user.target
```

### Set Permissions

```bash
# Create directories
sudo mkdir -p /var/lib/postgresql/16/main
sudo chown -R postgres:postgres /var/lib/postgresql/16
sudo mkdir -p /etc/patroni
sudo chown postgres:postgres /etc/patroni/patroni.yml
```

### Start Patroni

```bash
# Start on first node
sudo systemctl daemon-reload
sudo systemctl enable patroni
sudo systemctl start patroni

# Check status
sudo systemctl status patroni
patronictl -c /etc/patroni/patroni.yml list
```

## Cluster Management

### View Cluster Status

```bash
# List cluster members
patronictl -c /etc/patroni/patroni.yml list

# Output:
# + Cluster: postgres-cluster (7123456789) ------+----+-----------+
# | Member   | Host       | Role    | State     | TL | Lag in MB |
# +----------+------------+---------+-----------+----+-----------+
# | pg-node1 | 10.0.0.11  | Leader  | running   | 3  |           |
# | pg-node2 | 10.0.0.12  | Replica | streaming | 3  |       0.0 |
# | pg-node3 | 10.0.0.13  | Replica | streaming | 3  |       0.0 |
# +----------+------------+---------+-----------+----+-----------+
```

### Manual Switchover

```bash
# Switchover to specific node
patronictl -c /etc/patroni/patroni.yml switchover

# Or directly
patronictl -c /etc/patroni/patroni.yml switchover postgres-cluster \
  --master pg-node1 --candidate pg-node2 --force
```

### Manual Failover

```bash
# Force failover (when leader is down)
patronictl -c /etc/patroni/patroni.yml failover postgres-cluster

# Specify candidate
patronictl -c /etc/patroni/patroni.yml failover postgres-cluster \
  --candidate pg-node2 --force
```

### Restart Members

```bash
# Restart single member
patronictl -c /etc/patroni/patroni.yml restart postgres-cluster pg-node1

# Restart all members (rolling)
patronictl -c /etc/patroni/patroni.yml restart postgres-cluster
```

### Reinitialize Member

```bash
# Reinitialize failed member
patronictl -c /etc/patroni/patroni.yml reinit postgres-cluster pg-node3
```

## HAProxy Configuration

### Install HAProxy

```bash
sudo apt install haproxy -y
```

### Configure HAProxy

```haproxy
# /etc/haproxy/haproxy.cfg
global
    maxconn 4096

defaults
    mode tcp
    timeout connect 5s
    timeout client 30s
    timeout server 30s

frontend postgres_frontend
    bind *:5000
    default_backend postgres_backend

backend postgres_backend
    option httpchk GET /master
    http-check expect status 200
    default-server inter 3s fall 3 rise 2 on-marked-down shutdown-sessions

    server pg-node1 10.0.0.11:5432 check port 8008
    server pg-node2 10.0.0.12:5432 check port 8008
    server pg-node3 10.0.0.13:5432 check port 8008

frontend postgres_replica_frontend
    bind *:5001
    default_backend postgres_replica_backend

backend postgres_replica_backend
    option httpchk GET /replica
    http-check expect status 200
    default-server inter 3s fall 3 rise 2

    server pg-node1 10.0.0.11:5432 check port 8008
    server pg-node2 10.0.0.12:5432 check port 8008
    server pg-node3 10.0.0.13:5432 check port 8008

listen stats
    bind *:7000
    stats enable
    stats uri /
```

### Connection Strings

```bash
# Connect to primary (port 5000)
psql -h haproxy-host -p 5000 -U myuser -d mydb

# Connect to replica (port 5001)
psql -h haproxy-host -p 5001 -U myuser -d mydb
```

## Configuration Changes

### Dynamic Configuration

```bash
# Edit configuration
patronictl -c /etc/patroni/patroni.yml edit-config

# Apply specific parameter
patronictl -c /etc/patroni/patroni.yml edit-config \
  --set "postgresql.parameters.max_connections=300"
```

### Show Configuration

```bash
patronictl -c /etc/patroni/patroni.yml show-config
```

## Monitoring

### REST API Endpoints

```bash
# Health check
curl http://10.0.0.11:8008/health

# Master check
curl http://10.0.0.11:8008/master

# Replica check
curl http://10.0.0.11:8008/replica

# Cluster state
curl http://10.0.0.11:8008/cluster

# Patroni status
curl http://10.0.0.11:8008/patroni
```

### Prometheus Metrics

Patroni exposes metrics at `/metrics`:

```bash
curl http://10.0.0.11:8008/metrics
```

### Alert Rules

```yaml
groups:
  - name: patroni
    rules:
      - alert: PatroniClusterUnhealthy
        expr: patroni_cluster_healthy == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Patroni cluster is unhealthy"

      - alert: PatroniNoLeader
        expr: sum(patroni_is_leader) == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Patroni cluster has no leader"

      - alert: PatroniHighReplicationLag
        expr: patroni_replication_lag > 30
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High replication lag"
```

## Troubleshooting

### Check Logs

```bash
# Patroni logs
journalctl -u patroni -f

# PostgreSQL logs
tail -f /var/lib/postgresql/16/main/log/postgresql-*.log
```

### Common Issues

#### Split Brain Prevention

```bash
# Check etcd connectivity
etcdctl --endpoints=http://10.0.0.1:2379 endpoint health

# Check Patroni DCS state
patronictl -c /etc/patroni/patroni.yml show-config
```

#### Replica Not Syncing

```bash
# Check replication status
patronictl -c /etc/patroni/patroni.yml list

# Check PostgreSQL replication
psql -c "SELECT * FROM pg_stat_replication;"

# Reinitialize if needed
patronictl -c /etc/patroni/patroni.yml reinit postgres-cluster pg-node3
```

## Best Practices

1. **Use odd number of nodes** for proper quorum
2. **Separate etcd cluster** from PostgreSQL nodes
3. **Monitor all components** - Patroni, etcd, PostgreSQL
4. **Test failover regularly** in staging environment
5. **Configure proper timeouts** based on your network
6. **Use connection pooling** (PgBouncer) for applications

## Conclusion

Patroni provides robust PostgreSQL HA with:

1. **Automatic failover** with customizable behavior
2. **REST API** for monitoring and management
3. **Integration** with various DCS backends
4. **Rolling restarts** and configuration changes
5. **HAProxy integration** for connection routing

Proper Patroni setup ensures your PostgreSQL clusters remain available even during node failures.
