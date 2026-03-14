# How to Install and Configure etcd on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, etcd, Key-Value Store, Distributed Systems, Kubernetes, Tutorial

Description: Complete guide to installing etcd distributed key-value store on Ubuntu for configuration management and service discovery.

---

etcd is a distributed, reliable key-value store for the most critical data of a distributed system. It's the backbone of Kubernetes and provides strong consistency guarantees. This guide covers etcd installation and clustering on Ubuntu.

## Features

- Strong consistency (Raft consensus)
- Key-value storage
- Watch functionality
- Lease mechanism
- Distributed locking
- Transaction support

## Prerequisites

- Ubuntu 20.04 or later
- At least 2GB RAM per node
- SSD recommended for production
- Root or sudo access
- Network connectivity between nodes

## Single Node Installation

### Download etcd

```bash
# Set version
ETCD_VER=v3.5.11

# Download
wget https://github.com/etcd-io/etcd/releases/download/${ETCD_VER}/etcd-${ETCD_VER}-linux-amd64.tar.gz

# Extract
tar xzf etcd-${ETCD_VER}-linux-amd64.tar.gz

# Install
sudo mv etcd-${ETCD_VER}-linux-amd64/etcd* /usr/local/bin/

# Verify
etcd --version
etcdctl version
```

### Create User and Directories

```bash
# Create etcd user
sudo useradd -r -s /sbin/nologin etcd

# Create directories
sudo mkdir -p /var/lib/etcd
sudo mkdir -p /etc/etcd

# Set ownership
sudo chown -R etcd:etcd /var/lib/etcd
```

### Configuration File

```bash
sudo nano /etc/etcd/etcd.conf.yml
```

```yaml
# etcd configuration

name: 'etcd-1'
data-dir: '/var/lib/etcd'

# Client communication
listen-client-urls: 'http://0.0.0.0:2379'
advertise-client-urls: 'http://localhost:2379'

# Peer communication
listen-peer-urls: 'http://0.0.0.0:2380'
initial-advertise-peer-urls: 'http://localhost:2380'

# Cluster configuration
initial-cluster: 'etcd-1=http://localhost:2380'
initial-cluster-state: 'new'
initial-cluster-token: 'etcd-cluster-1'

# Logging
log-level: 'info'

# Snapshots
snapshot-count: 10000
```

### Systemd Service

```bash
sudo nano /etc/systemd/system/etcd.service
```

```ini
[Unit]
Description=etcd distributed key-value store
Documentation=https://etcd.io/docs/
After=network.target

[Service]
Type=notify
User=etcd
ExecStart=/usr/local/bin/etcd --config-file=/etc/etcd/etcd.conf.yml
Restart=always
RestartSec=5
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

### Start etcd

```bash
# Start and enable
sudo systemctl daemon-reload
sudo systemctl start etcd
sudo systemctl enable etcd

# Check status
sudo systemctl status etcd
```

## Multi-Node Cluster

### Node 1 Configuration

```yaml
# /etc/etcd/etcd.conf.yml on node 1 (192.168.1.10)
name: 'etcd-1'
data-dir: '/var/lib/etcd'

listen-client-urls: 'http://0.0.0.0:2379'
advertise-client-urls: 'http://192.168.1.10:2379'

listen-peer-urls: 'http://0.0.0.0:2380'
initial-advertise-peer-urls: 'http://192.168.1.10:2380'

initial-cluster: 'etcd-1=http://192.168.1.10:2380,etcd-2=http://192.168.1.11:2380,etcd-3=http://192.168.1.12:2380'
initial-cluster-state: 'new'
initial-cluster-token: 'etcd-cluster-prod'
```

### Node 2 Configuration

```yaml
# /etc/etcd/etcd.conf.yml on node 2 (192.168.1.11)
name: 'etcd-2'
data-dir: '/var/lib/etcd'

listen-client-urls: 'http://0.0.0.0:2379'
advertise-client-urls: 'http://192.168.1.11:2379'

listen-peer-urls: 'http://0.0.0.0:2380'
initial-advertise-peer-urls: 'http://192.168.1.11:2380'

initial-cluster: 'etcd-1=http://192.168.1.10:2380,etcd-2=http://192.168.1.11:2380,etcd-3=http://192.168.1.12:2380'
initial-cluster-state: 'new'
initial-cluster-token: 'etcd-cluster-prod'
```

### Node 3 Configuration

```yaml
# /etc/etcd/etcd.conf.yml on node 3 (192.168.1.12)
name: 'etcd-3'
data-dir: '/var/lib/etcd'

listen-client-urls: 'http://0.0.0.0:2379'
advertise-client-urls: 'http://192.168.1.12:2379'

listen-peer-urls: 'http://0.0.0.0:2380'
initial-advertise-peer-urls: 'http://192.168.1.12:2380'

initial-cluster: 'etcd-1=http://192.168.1.10:2380,etcd-2=http://192.168.1.11:2380,etcd-3=http://192.168.1.12:2380'
initial-cluster-state: 'new'
initial-cluster-token: 'etcd-cluster-prod'
```

### Start Cluster

```bash
# Start on all nodes simultaneously
sudo systemctl start etcd

# Check cluster health
etcdctl endpoint health --cluster

# Check member list
etcdctl member list
```

## TLS Configuration

### Generate Certificates

```bash
# Create CA
cfssl gencert -initca ca-csr.json | cfssljson -bare ca

# Generate server certificates for each node
cfssl gencert \
    -ca=ca.pem \
    -ca-key=ca-key.pem \
    -config=ca-config.json \
    -hostname="192.168.1.10,192.168.1.11,192.168.1.12,127.0.0.1,localhost" \
    -profile=server \
    server-csr.json | cfssljson -bare server

# Generate client certificate
cfssl gencert \
    -ca=ca.pem \
    -ca-key=ca-key.pem \
    -config=ca-config.json \
    -profile=client \
    client-csr.json | cfssljson -bare client
```

### TLS Configuration

```yaml
# /etc/etcd/etcd.conf.yml
name: 'etcd-1'
data-dir: '/var/lib/etcd'

# Client TLS
listen-client-urls: 'https://0.0.0.0:2379'
advertise-client-urls: 'https://192.168.1.10:2379'

# Peer TLS
listen-peer-urls: 'https://0.0.0.0:2380'
initial-advertise-peer-urls: 'https://192.168.1.10:2380'

# Certificates
client-transport-security:
  cert-file: '/etc/etcd/ssl/server.pem'
  key-file: '/etc/etcd/ssl/server-key.pem'
  trusted-ca-file: '/etc/etcd/ssl/ca.pem'
  client-cert-auth: true

peer-transport-security:
  cert-file: '/etc/etcd/ssl/server.pem'
  key-file: '/etc/etcd/ssl/server-key.pem'
  trusted-ca-file: '/etc/etcd/ssl/ca.pem'
  client-cert-auth: true

initial-cluster: 'etcd-1=https://192.168.1.10:2380,etcd-2=https://192.168.1.11:2380,etcd-3=https://192.168.1.12:2380'
initial-cluster-state: 'new'
initial-cluster-token: 'etcd-cluster-prod'
```

## Basic Operations

### Set Environment

```bash
export ETCDCTL_API=3
export ETCDCTL_ENDPOINTS=http://localhost:2379

# For TLS
export ETCDCTL_CACERT=/etc/etcd/ssl/ca.pem
export ETCDCTL_CERT=/etc/etcd/ssl/client.pem
export ETCDCTL_KEY=/etc/etcd/ssl/client-key.pem
```

### Key-Value Operations

```bash
# Put key
etcdctl put mykey "myvalue"

# Get key
etcdctl get mykey

# Get with prefix
etcdctl get --prefix /config/

# Get all keys
etcdctl get --prefix ""

# Delete key
etcdctl del mykey

# Delete with prefix
etcdctl del --prefix /config/
```

### Watch

```bash
# Watch single key
etcdctl watch mykey

# Watch prefix
etcdctl watch --prefix /config/

# Watch with progress notification
etcdctl watch --prefix /config/ --progress-notify
```

### Lease

```bash
# Create lease (TTL in seconds)
etcdctl lease grant 60

# Put with lease
etcdctl put mykey "myvalue" --lease=<lease-id>

# Keep alive
etcdctl lease keep-alive <lease-id>

# Revoke lease
etcdctl lease revoke <lease-id>

# List leases
etcdctl lease list
```

### Transactions

```bash
# Conditional transaction
etcdctl txn --interactive
compares:
value("mykey") = "myvalue"

success requests (get, put, del):
put newkey "newvalue"

failure requests (get, put, del):
put failkey "failed"
```

## Cluster Management

### Member List

```bash
etcdctl member list
```

### Add Member

```bash
# Add member
etcdctl member add etcd-4 --peer-urls=http://192.168.1.13:2380

# Start new member with 'existing' state
# On new node, set initial-cluster-state: 'existing'
```

### Remove Member

```bash
# Get member ID
etcdctl member list

# Remove member
etcdctl member remove <member-id>
```

### Update Member

```bash
etcdctl member update <member-id> --peer-urls=http://new-ip:2380
```

## Backup and Restore

### Snapshot

```bash
# Create snapshot
etcdctl snapshot save /backup/etcd-$(date +%Y%m%d).db

# Check snapshot status
etcdctl snapshot status /backup/etcd-*.db --write-out=table
```

### Restore

```bash
# Stop etcd
sudo systemctl stop etcd

# Remove old data
sudo rm -rf /var/lib/etcd/*

# Restore from snapshot
etcdctl snapshot restore /backup/etcd-backup.db \
    --name etcd-1 \
    --initial-cluster 'etcd-1=http://192.168.1.10:2380' \
    --initial-advertise-peer-urls http://192.168.1.10:2380 \
    --data-dir /var/lib/etcd

# Fix permissions
sudo chown -R etcd:etcd /var/lib/etcd

# Start etcd
sudo systemctl start etcd
```

## Authentication

### Enable Auth

```bash
# Create root user
etcdctl user add root

# Grant root role
etcdctl user grant-role root root

# Enable authentication
etcdctl auth enable
```

### Create Users and Roles

```bash
# Create role
etcdctl role add readwrite

# Grant permissions
etcdctl role grant-permission readwrite readwrite /app/

# Create user
etcdctl user add appuser

# Assign role
etcdctl user grant-role appuser readwrite
```

### Use Authentication

```bash
# With password
etcdctl --user root:password get mykey

# Or set environment
export ETCDCTL_USER=root:password
```

## Monitoring

### Health Check

```bash
# Endpoint health
etcdctl endpoint health

# Endpoint status
etcdctl endpoint status --write-out=table

# Cluster health
etcdctl endpoint health --cluster
```

### Metrics

```bash
# Enable metrics endpoint in config
metrics: 'extensive'

# Access metrics
curl http://localhost:2379/metrics
```

### Prometheus Integration

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'etcd'
    static_configs:
      - targets: ['192.168.1.10:2379', '192.168.1.11:2379', '192.168.1.12:2379']
```

## Performance Tuning

### Configuration Options

```yaml
# /etc/etcd/etcd.conf.yml
# Increase snapshot threshold
snapshot-count: 100000

# Enable auto compaction
auto-compaction-mode: 'periodic'
auto-compaction-retention: '1h'

# Increase quota (default 2GB)
quota-backend-bytes: 8589934592  # 8GB
```

### Defragmentation

```bash
# Defragment database
etcdctl defrag --cluster

# Check database size
etcdctl endpoint status --write-out=table
```

## Troubleshooting

### Check Logs

```bash
sudo journalctl -u etcd -f
```

### Common Issues

```bash
# Member ID mismatch
# Remove data and rejoin cluster
sudo rm -rf /var/lib/etcd/*

# Database too large
# Increase quota and compact
etcdctl compact <revision>
etcdctl defrag

# Leader election issues
# Check network connectivity between nodes
# Verify time synchronization
```

### Debug Mode

```yaml
# Enable debug logging
log-level: 'debug'
```

---

etcd provides the foundation for distributed configuration and service discovery. Its strong consistency guarantees make it essential for Kubernetes and other distributed systems. For monitoring your etcd cluster, consider using OneUptime for comprehensive health and performance tracking.
