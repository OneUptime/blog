# How to Configure CockroachDB Cluster with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CockroachDB, IPv6, Distributed Database, Cluster, PostgreSQL-compatible, DevOps

Description: Configure a CockroachDB distributed SQL cluster to communicate over IPv6, covering node joining, SQL access, and admin UI configuration for IPv6 networks.

---

CockroachDB is a distributed SQL database with PostgreSQL compatibility. It supports IPv6 natively through its configurable listen and advertise address settings.

## Installing CockroachDB

```bash
# Download CockroachDB

wget https://binaries.cockroachdb.com/cockroach-latest.linux-amd64.tgz
tar xvf cockroach-latest.linux-amd64.tgz
sudo cp cockroach-*.linux-amd64/cockroach /usr/local/bin/
sudo mkdir -p /usr/local/lib/cockroach
sudo cp cockroach-*.linux-amd64/lib/libgeos*.so /usr/local/lib/cockroach/

cockroach version
```

## Starting CockroachDB with IPv6

```bash
# Start first node with IPv6 address
cockroach start \
  --insecure \
  --advertise-addr=[2001:db8::1]:26257 \
  --listen-addr=[2001:db8::1]:26257 \
  --http-addr=[2001:db8::1]:8080 \
  --join=[2001:db8::1]:26257,[2001:db8::2]:26257,[2001:db8::3]:26257 \
  --store=path=/var/lib/cockroach/node1 \
  --background

# Start second node
cockroach start \
  --insecure \
  --advertise-addr=[2001:db8::2]:26257 \
  --listen-addr=[2001:db8::2]:26257 \
  --http-addr=[2001:db8::2]:8080 \
  --join=[2001:db8::1]:26257,[2001:db8::2]:26257,[2001:db8::3]:26257 \
  --store=path=/var/lib/cockroach/node2 \
  --background

# Start third node
cockroach start \
  --insecure \
  --advertise-addr=[2001:db8::3]:26257 \
  --listen-addr=[2001:db8::3]:26257 \
  --http-addr=[2001:db8::3]:8080 \
  --join=[2001:db8::1]:26257,[2001:db8::2]:26257,[2001:db8::3]:26257 \
  --store=path=/var/lib/cockroach/node3 \
  --background
```

## Initializing the Cluster

```bash
# Initialize the cluster (run once on first node)
cockroach init \
  --insecure \
  --host=[2001:db8::1]:26257

# Verify cluster status
cockroach node status \
  --insecure \
  --host=[2001:db8::1]:26257
```

## Secure CockroachDB Cluster with IPv6 and TLS

```bash
# Generate certificates with IPv6 SANs
mkdir -p /etc/cockroach/certs

# CA certificate
cockroach cert create-ca \
  --certs-dir=/etc/cockroach/certs \
  --ca-key=/etc/cockroach/certs/ca.key

# Node certificate for the first node (repeat for each node with its own IPv6 address)
cockroach cert create-node \
  2001:db8::1 \
  localhost \
  ::1 \
  --certs-dir=/etc/cockroach/certs \
  --ca-key=/etc/cockroach/certs/ca.key

# Client certificate
cockroach cert create-client \
  root \
  --certs-dir=/etc/cockroach/certs \
  --ca-key=/etc/cockroach/certs/ca.key

# Start first secure node
cockroach start \
  --certs-dir=/etc/cockroach/certs \
  --advertise-addr=[2001:db8::1]:26257 \
  --listen-addr=[2001:db8::1]:26257 \
  --http-addr=[2001:db8::1]:8080 \
  --join=[2001:db8::1]:26257,[2001:db8::2]:26257,[2001:db8::3]:26257 \
  --store=path=/var/lib/cockroach \
  --background

# Initialize the secure cluster (run once)
cockroach init \
  --certs-dir=/etc/cockroach/certs \
  --host=[2001:db8::1]:26257
```

## Connecting to CockroachDB over IPv6

```bash
# Connect via CockroachDB SQL client
cockroach sql \
  --insecure \
  --host=[2001:db8::1]:26257

# Connect via psql (PostgreSQL client)
psql -h 2001:db8::1 -p 26257 -U root defaultdb

# Connection string for applications
# postgresql://root@[2001:db8::1]:26257/defaultdb?sslmode=disable
```

```python
# Python connection using psycopg2
import psycopg2

# CockroachDB via IPv6
conn = psycopg2.connect(
    host="2001:db8::1",   # IPv6 host (brackets not needed here)
    port=26257,
    database="defaultdb",
    user="root",
    sslmode="disable"     # or configure TLS
)

cursor = conn.cursor()
cursor.execute("SELECT version()")
print(cursor.fetchone())
```

## Systemd Service for CockroachDB

```ini
# /etc/systemd/system/cockroach.service
[Unit]
Description=CockroachDB Database Server
After=network-online.target

[Service]
Type=simple
User=cockroach
ExecStart=/usr/local/bin/cockroach start \
  --insecure \
  --advertise-addr=[2001:db8::1]:26257 \
  --listen-addr=[2001:db8::1]:26257 \
  --http-addr=[2001:db8::1]:8080 \
  --join=[2001:db8::1]:26257,[2001:db8::2]:26257,[2001:db8::3]:26257 \
  --store=path=/var/lib/cockroach
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

## Checking Cluster Health

```bash
# View cluster status
cockroach node status \
  --insecure \
  --host=[2001:db8::1]:26257 \
  --all

# View cluster ranges and replicas
cockroach node status \
  --insecure \
  --host=[2001:db8::1]:26257 \
  --ranges

# Access Admin UI
# http://[2001:db8::1]:8080
# (Use https:// on secure clusters, and keep brackets around IPv6 literals in URLs.)
curl -6 http://[2001:db8::1]:8080/_status/vars
```

CockroachDB's configurable listen and advertise address options make it straightforward to deploy in IPv6 environments, providing a globally distributed SQL database with native IPv6 cluster communication.
