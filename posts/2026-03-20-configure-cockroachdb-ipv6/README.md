# How to Configure CockroachDB with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, CockroachDB, Distributed Database, NewSQL

Description: Learn how to configure CockroachDB nodes to listen on IPv6 addresses, form clusters with IPv6 addresses, and connect clients over IPv6.

For secure clusters, ensure each node certificate includes every IPv6 address or DNS name used to reach that node.

## CockroachDB IPv6 Start Flags

```bash
# Start CockroachDB on a specific IPv6 address

cockroach start \
    --listen-addr=[2001:db8::10]:26257 \
    --advertise-addr=[2001:db8::10]:26257 \
    --http-addr=[2001:db8::10]:8080 \
    --join=[2001:db8::10]:26257,[2001:db8::11]:26257,[2001:db8::12]:26257 \
    --store=path=/var/lib/cockroach/node1 \
    --background

# Listen on all interfaces
cockroach start \
    --listen-addr=[::]:26257 \
    --advertise-addr=[2001:db8::10]:26257 \
    --http-addr=[::]:8080
```

## Single-Node Development Instance

```bash
# Start single-node CockroachDB on IPv6 loopback
cockroach start-single-node \
    --listen-addr=[::1]:26257 \
    --http-addr=[::1]:8080 \
    --insecure \
    --background

# Verify
ss -6 -tlnp | grep cockroach
```

## Three-Node IPv6 Cluster

```bash
# Node 1 (2001:db8::10)
cockroach start \
    --certs-dir=/etc/cockroachdb/certs \
    --store=path=/var/lib/cockroach \
    --listen-addr=[2001:db8::10]:26257 \
    --advertise-addr=[2001:db8::10]:26257 \
    --http-addr=[2001:db8::10]:8080 \
    --join=[2001:db8::10]:26257,[2001:db8::11]:26257,[2001:db8::12]:26257 \
    --background

# Node 2 (2001:db8::11)
cockroach start \
    --certs-dir=/etc/cockroachdb/certs \
    --store=path=/var/lib/cockroach \
    --listen-addr=[2001:db8::11]:26257 \
    --advertise-addr=[2001:db8::11]:26257 \
    --http-addr=[2001:db8::11]:8080 \
    --join=[2001:db8::10]:26257,[2001:db8::11]:26257,[2001:db8::12]:26257 \
    --background

# Node 3 (2001:db8::12)
cockroach start \
    --certs-dir=/etc/cockroachdb/certs \
    --store=path=/var/lib/cockroach \
    --listen-addr=[2001:db8::12]:26257 \
    --advertise-addr=[2001:db8::12]:26257 \
    --http-addr=[2001:db8::12]:8080 \
    --join=[2001:db8::10]:26257,[2001:db8::11]:26257,[2001:db8::12]:26257 \
    --background

# Initialize the cluster (run once from any node)
cockroach init --host=[2001:db8::10]:26257 --certs-dir=/etc/cockroachdb/certs
```

## Connect CockroachDB Client over IPv6

```bash
# SQL shell
cockroach sql \
    --host=[2001:db8::10]:26257 \
    --certs-dir=/etc/cockroachdb/certs

# Insecure connection (development only)
cockroach sql --host=[2001:db8::10]:26257 --insecure

# Using PostgreSQL-compatible connection string
psql "postgresql://root@[2001:db8::10]:26257/defaultdb?sslmode=verify-full&sslrootcert=/etc/cockroachdb/certs/ca.crt&sslcert=/etc/cockroachdb/certs/client.root.crt&sslkey=/etc/cockroachdb/certs/client.root.key"
```

## Python Client over IPv6

```python
import psycopg2

# CockroachDB is PostgreSQL-compatible
conn = psycopg2.connect(
    host="2001:db8::10",
    port=26257,
    dbname="defaultdb",
    user="root",
    sslmode="verify-full",
    sslrootcert="/etc/cockroachdb/certs/ca.crt",
    sslcert="/etc/cockroachdb/certs/client.root.crt",
    sslkey="/etc/cockroachdb/certs/client.root.key"
)
```

## Verify IPv6 Cluster Health

```bash
# Check cluster status
cockroach node status --host=[2001:db8::10]:26257 --certs-dir=/etc/cockroachdb/certs

# Check listening ports
ss -6 -tlnp | grep cockroach

# Admin UI over IPv6
curl -6 https://[2001:db8::10]:8080/ --cacert /etc/cockroachdb/certs/ca.crt
```

## Summary

Configure CockroachDB for IPv6 with `--listen-addr=[2001:db8::10]:26257` and `--advertise-addr=[2001:db8::10]:26257`. In multi-node clusters, provide the initial node IPv6 addresses in `--join` and reuse that join list on each node. CockroachDB uses the PostgreSQL wire protocol, so connect with standard psql or PostgreSQL drivers using `host=2001:db8::10 port=26257`; for secure self-hosted clusters, include the CA certificate and the client certificate/key. Verify with `ss -6 -tlnp | grep cockroach` and `cockroach node status`.
