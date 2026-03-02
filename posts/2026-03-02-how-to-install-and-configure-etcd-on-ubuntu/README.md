# How to Install and Configure etcd on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, etcd, Kubernetes, Distributed Systems, Infrastructure

Description: Learn how to install, configure, and secure an etcd cluster on Ubuntu for use as a distributed key-value store for Kubernetes or standalone applications.

---

etcd is a distributed, reliable key-value store built on the Raft consensus algorithm. It is best known as the storage backend for Kubernetes, but it is equally useful as a standalone configuration store, distributed lock service, or leader election mechanism. etcd prioritizes consistency and partition tolerance - in network split scenarios, it stops accepting writes rather than risk inconsistency.

## Architecture

etcd clusters work best with an odd number of members (3, 5, or 7) because Raft requires a quorum - more than half the members must agree before committing a write. A 3-member cluster tolerates 1 failure. A 5-member cluster tolerates 2 failures.

For this guide, we will set up a 3-node cluster:

- `etcd-01` at `10.0.1.10`
- `etcd-02` at `10.0.1.11`
- `etcd-03` at `10.0.1.12`

## Prerequisites

- 3 Ubuntu 20.04 or 22.04 servers
- Network connectivity between all nodes on the etcd ports (2379, 2380)
- sudo privileges

## Installation

Download the etcd binary directly from GitHub releases:

```bash
# Set the version to install
ETCD_VERSION="v3.5.13"

# Download the release archive
wget "https://github.com/etcd-io/etcd/releases/download/${ETCD_VERSION}/etcd-${ETCD_VERSION}-linux-amd64.tar.gz"

# Extract
tar -xzf "etcd-${ETCD_VERSION}-linux-amd64.tar.gz"

# Install binaries
sudo install -m 755 "etcd-${ETCD_VERSION}-linux-amd64/etcd" /usr/local/bin/
sudo install -m 755 "etcd-${ETCD_VERSION}-linux-amd64/etcdctl" /usr/local/bin/
sudo install -m 755 "etcd-${ETCD_VERSION}-linux-amd64/etcdutl" /usr/local/bin/

# Clean up
rm -rf "etcd-${ETCD_VERSION}-linux-amd64"*

# Verify
etcd --version
etcdctl version
```

## Generating TLS Certificates

etcd should use TLS for both peer communication (between etcd nodes) and client communication. Use `cfssl` to generate certificates:

```bash
# Install cfssl
sudo apt-get install -y golang-cfssl

# Create a CA
cat > ca-config.json << 'EOF'
{
  "signing": {
    "default": { "expiry": "87600h" },
    "profiles": {
      "server": {
        "expiry": "87600h",
        "usages": ["signing", "key encipherment", "server auth", "client auth"]
      },
      "peer": {
        "expiry": "87600h",
        "usages": ["signing", "key encipherment", "server auth", "client auth"]
      },
      "client": {
        "expiry": "87600h",
        "usages": ["signing", "key encipherment", "client auth"]
      }
    }
  }
}
EOF

cat > ca-csr.json << 'EOF'
{
  "CN": "etcd CA",
  "key": { "algo": "rsa", "size": 2048 },
  "names": [{ "O": "etcd", "OU": "CA", "L": "US" }]
}
EOF

cfssl gencert -initca ca-csr.json | cfssljson -bare ca

# Generate server cert (for each node, listing all IPs/hostnames)
cat > server-csr.json << 'EOF'
{
  "CN": "etcd-server",
  "hosts": [
    "10.0.1.10", "10.0.1.11", "10.0.1.12",
    "etcd-01", "etcd-02", "etcd-03",
    "localhost", "127.0.0.1"
  ],
  "key": { "algo": "rsa", "size": 2048 }
}
EOF

cfssl gencert -ca=ca.pem -ca-key=ca-key.pem \
  -config=ca-config.json -profile=server \
  server-csr.json | cfssljson -bare server

# Generate peer cert
cat > peer-csr.json << 'EOF'
{
  "CN": "etcd-peer",
  "hosts": [
    "10.0.1.10", "10.0.1.11", "10.0.1.12",
    "etcd-01", "etcd-02", "etcd-03",
    "localhost", "127.0.0.1"
  ],
  "key": { "algo": "rsa", "size": 2048 }
}
EOF

cfssl gencert -ca=ca.pem -ca-key=ca-key.pem \
  -config=ca-config.json -profile=peer \
  peer-csr.json | cfssljson -bare peer

# Generate client cert (for etcdctl and applications)
cat > client-csr.json << 'EOF'
{
  "CN": "etcd-client",
  "key": { "algo": "rsa", "size": 2048 }
}
EOF

cfssl gencert -ca=ca.pem -ca-key=ca-key.pem \
  -config=ca-config.json -profile=client \
  client-csr.json | cfssljson -bare client
```

Distribute the certs to all nodes:

```bash
sudo mkdir -p /etc/etcd/pki
sudo cp ca.pem server.pem server-key.pem peer.pem peer-key.pem /etc/etcd/pki/
sudo chmod 600 /etc/etcd/pki/*-key.pem
```

## System User and Data Directory

```bash
# Create a dedicated user
sudo useradd --system --home /var/lib/etcd --shell /bin/false etcd

# Create data directory
sudo mkdir -p /var/lib/etcd
sudo chown etcd:etcd /var/lib/etcd
sudo chmod 700 /var/lib/etcd

# Create config directory
sudo mkdir -p /etc/etcd
sudo chown etcd:etcd /etc/etcd
```

## Configuration

Create the etcd configuration file on each node (adjust values per node):

```yaml
# /etc/etcd/etcd.conf.yml  (on etcd-01)
name: etcd-01
data-dir: /var/lib/etcd

# Client-facing URLs
listen-client-urls: https://0.0.0.0:2379
advertise-client-urls: https://10.0.1.10:2379

# Peer URLs (for etcd-to-etcd communication)
listen-peer-urls: https://0.0.0.0:2380
initial-advertise-peer-urls: https://10.0.1.10:2380

# Cluster bootstrap
initial-cluster: etcd-01=https://10.0.1.10:2380,etcd-02=https://10.0.1.11:2380,etcd-03=https://10.0.1.12:2380
initial-cluster-token: etcd-cluster-prod-01
initial-cluster-state: new  # Change to 'existing' when adding nodes later

# TLS for client connections
client-transport-security:
  ca-file: /etc/etcd/pki/ca.pem
  cert-file: /etc/etcd/pki/server.pem
  key-file: /etc/etcd/pki/server-key.pem
  client-cert-auth: true  # Require client certificates

# TLS for peer connections
peer-transport-security:
  ca-file: /etc/etcd/pki/ca.pem
  cert-file: /etc/etcd/pki/peer.pem
  key-file: /etc/etcd/pki/peer-key.pem
  peer-client-cert-auth: true

# Logging
log-level: info
log-outputs:
  - systemd/journal

# Performance tuning for SSDs
heartbeat-interval: 100
election-timeout: 1000

# Quota (default 2GB, max 8GB)
quota-backend-bytes: 4294967296  # 4GB
```

On `etcd-02`, change:
- `name: etcd-02`
- `advertise-client-urls: https://10.0.1.11:2379`
- `initial-advertise-peer-urls: https://10.0.1.11:2380`

On `etcd-03`, change similarly.

## Systemd Service

```bash
# Create the service file
sudo tee /etc/systemd/system/etcd.service << 'EOF'
[Unit]
Description=etcd key-value store
Documentation=https://etcd.io/docs/
After=network.target

[Service]
Type=notify
User=etcd
Group=etcd
ExecStart=/usr/local/bin/etcd --config-file=/etc/etcd/etcd.conf.yml
Restart=on-failure
RestartSec=5
LimitNOFILE=65536
# Protect the system
PrivateTmp=true
ProtectSystem=full
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable etcd
sudo systemctl start etcd

sudo journalctl -u etcd -f
```

## Verifying the Cluster

```bash
# Set environment variables for etcdctl
export ETCDCTL_API=3
export ETCDCTL_ENDPOINTS="https://10.0.1.10:2379,https://10.0.1.11:2379,https://10.0.1.12:2379"
export ETCDCTL_CACERT=/etc/etcd/pki/ca.pem
export ETCDCTL_CERT=/path/to/client.pem
export ETCDCTL_KEY=/path/to/client-key.pem

# Check cluster health
etcdctl endpoint health

# Check cluster members
etcdctl member list

# Check leader
etcdctl endpoint status --write-out=table
```

## Basic Operations

```bash
# Write a key
etcdctl put /config/app/db_host "db.internal"
etcdctl put /config/app/db_port "5432"

# Read a key
etcdctl get /config/app/db_host

# Read all keys under a prefix
etcdctl get /config/app/ --prefix

# Delete a key
etcdctl del /config/app/db_host

# Watch for changes
etcdctl watch /config/app/ --prefix
# (leave this running in one terminal, make changes in another)

# Transactions (atomic operations)
etcdctl txn << 'EOF'
compares:
value("/config/app/version") = "1"

success requests:
put /config/app/version "2"

failure requests:
get /config/app/version
EOF
```

## Maintenance Operations

```bash
# Compact old revisions (etcd stores all versions by default)
# Get current revision
REVISION=$(etcdctl endpoint status --write-out=json | python3 -c "import json,sys; print(json.load(sys.stdin)[0]['Status']['header']['revision'])")

# Compact all revisions before current
etcdctl compact $REVISION

# Defragment after compaction
etcdctl defrag --endpoints=https://10.0.1.10:2379

# Create a snapshot backup
etcdctl snapshot save /var/backups/etcd/snapshot-$(date +%Y%m%d).db

# Verify the snapshot
etcdctl snapshot status /var/backups/etcd/snapshot-20260302.db --write-out=table
```

Automate snapshots with a cron job:

```bash
# /etc/cron.daily/etcd-backup
#!/bin/bash
BACKUP_DIR=/var/backups/etcd
mkdir -p $BACKUP_DIR

export ETCDCTL_API=3
export ETCDCTL_ENDPOINTS="https://10.0.1.10:2379"
export ETCDCTL_CACERT=/etc/etcd/pki/ca.pem
export ETCDCTL_CERT=/etc/etcd/pki/client.pem
export ETCDCTL_KEY=/etc/etcd/pki/client-key.pem

/usr/local/bin/etcdctl snapshot save \
  "$BACKUP_DIR/snapshot-$(date +%Y%m%d-%H%M%S).db"

# Keep only the last 7 days of backups
find $BACKUP_DIR -name "snapshot-*.db" -mtime +7 -delete
```

## Troubleshooting

**Cluster fails to form:**
```bash
# Check all nodes can reach each other on port 2380
nc -zv 10.0.1.11 2380
nc -zv 10.0.1.12 2380

# Verify TLS certs are valid
openssl verify -CAfile /etc/etcd/pki/ca.pem /etc/etcd/pki/peer.pem

# Check for clock skew (Raft is sensitive to time)
timedatectl status
# Ensure NTP is running
sudo systemctl enable --now systemd-timesyncd
```

**etcdserver: database space exceeded:**
```bash
# Compact and defrag
etcdctl compact $(etcdctl endpoint status --write-out="json" | python3 -c "import json,sys; print(json.load(sys.stdin)[0]['Status']['header']['revision'])")
etcdctl defrag --cluster
```

**Leader election taking too long:**
- Increase `heartbeat-interval` and `election-timeout` proportionally
- Check for network latency between nodes: `ping 10.0.1.11`
- Use faster storage (SSDs strongly recommended for etcd)

etcd is a foundational piece of infrastructure that Kubernetes and many distributed systems depend on. Treating it with care - regular backups, proper TLS, odd-numbered clusters - pays off when you need it most.
