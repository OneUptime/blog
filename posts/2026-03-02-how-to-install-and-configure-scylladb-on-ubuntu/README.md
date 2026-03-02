# How to Install and Configure ScyllaDB on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, ScyllaDB, Database, NoSQL, Cassandra

Description: Learn how to install ScyllaDB on Ubuntu, a high-performance Cassandra-compatible NoSQL database, covering configuration, cluster setup, and performance tuning.

---

ScyllaDB is a drop-in replacement for Apache Cassandra written in C++. It uses a shard-per-core architecture to squeeze dramatically more performance out of modern multi-core hardware compared to Cassandra's JVM-based implementation. If you're already familiar with CQL (Cassandra Query Language), you can use ScyllaDB without changing your application code.

ScyllaDB is a strong choice when you need low-latency, high-throughput NoSQL at scale - typically for things like time-series data, user activity feeds, IoT telemetry, or large-scale key-value storage.

## Prerequisites

- Ubuntu 22.04 or 24.04
- At least 4 CPU cores and 8 GB RAM (ScyllaDB is designed for dedicated hardware)
- SSD storage strongly recommended (ScyllaDB is I/O intensive)
- Root or sudo access

## Disabling systemd-resolved and Swap

ScyllaDB, like Cassandra, performs best with swap disabled:

```bash
# Disable swap
sudo swapoff -a

# Comment out the swap line in /etc/fstab to make it permanent
sudo sed -i '/\bswap\b/ s/^/#/' /etc/fstab

# Verify swap is disabled
free -h
```

## Installing ScyllaDB

Use the official ScyllaDB repository:

```bash
# Install prerequisites
sudo apt update && sudo apt install -y curl gpg

# Add ScyllaDB's APT repository
curl -fsSL https://downloads.scylladb.com/downloads/scylla/apt/gpg.key | \
  sudo gpg --dearmor -o /usr/share/keyrings/scylladb-archive-keyring.gpg

# Add repository (use scylla-5.4 or the current version)
echo "deb [signed-by=/usr/share/keyrings/scylladb-archive-keyring.gpg] \
  https://downloads.scylladb.com/downloads/scylla/apt stable main" | \
  sudo tee /etc/apt/sources.list.d/scylla.list

sudo apt update

# Install ScyllaDB server and tools
sudo apt install -y scylla
```

## Running the Setup Script

ScyllaDB includes a setup script that configures the OS for optimal performance:

```bash
# Run the ScyllaDB setup script
# This configures:
# - IO scheduler
# # CPU governor
# - Network settings
# - Huge pages
sudo scylla_setup

# You'll be asked several questions:
# - Do you want to run scylla_io_setup? Yes
# - Do you want to enable network optimizations? Yes
# - Do you want to set the CPU governor to performance? Yes
# - Is your system SSD-based? Yes (if applicable)
```

Run the IO setup to benchmark your storage and configure IO parameters:

```bash
sudo scylla_io_setup
```

This takes a few minutes as it benchmarks your disk.

## Configuration

ScyllaDB's main configuration file is `/etc/scylla/scylla.yaml`:

```bash
sudo nano /etc/scylla/scylla.yaml
```

Key settings:

```yaml
# /etc/scylla/scylla.yaml

# The name of the cluster - all nodes in a cluster must have the same name
cluster_name: 'MyScyllaCluster'

# Number of "virtual nodes" (tokens) per node
# Higher values = better data distribution but more overhead
num_tokens: 256

# Data directories
data_file_directories:
    - /var/lib/scylla/data

# Commit log directory (ideally on a separate, fast disk)
commitlog_directory: /var/lib/scylla/commitlog

# Network settings
# Replace with this node's actual IP address
listen_address: 192.168.1.10
rpc_address: 192.168.1.10

# Seed nodes - used for initial cluster discovery
# At least one seed per data center
seed_provider:
    - class_name: org.apache.cassandra.locator.SimpleSeedProvider
      parameters:
          - seeds: "192.168.1.10"

# Endpoint snitch - determines how nodes are grouped
endpoint_snitch: GossipingPropertyFileSnitch

# Authenticator - use PasswordAuthenticator for production
authenticator: PasswordAuthenticator

# Authorizer
authorizer: CassandraAuthorizer

# Consistency
# Minimum replicas that must respond to satisfy a read
read_consistency: QUORUM

# Number of replicas to write to
# write_consistency: QUORUM  # Typically set at the CQL query level

# Compaction throughput
compaction_throughput_mb_per_sec: 16

# Memory settings (auto-detected, but can be tuned)
# ScyllaDB will use ~60% of available memory by default

# Server-side caching
row_cache_size_in_mb: 0  # Disabled by default; enable for read-heavy workloads
```

## Starting ScyllaDB

```bash
sudo systemctl enable scylla-server
sudo systemctl start scylla-server

# Check status - may take 30-60 seconds to initialize
sudo systemctl status scylla-server

# Check node status
nodetool status
```

Wait until `nodetool status` shows `UN` (Up, Normal) for the node.

## Connecting with cqlsh

```bash
# Connect to the local node
cqlsh 192.168.1.10 9042

# For ScyllaDB with authentication enabled (after initial setup)
cqlsh 192.168.1.10 9042 -u cassandra -p cassandra
```

## Initial CQL Setup

After connecting:

```sql
-- Change the default superuser password immediately
ALTER ROLE cassandra WITH PASSWORD = 'NewSuperuserPassword123!';

-- Create a new superuser (optional but recommended)
CREATE ROLE scylla_admin WITH SUPERUSER = true AND LOGIN = true AND PASSWORD = 'AdminPassword123!';

-- Create application keyspace with replication factor 3
CREATE KEYSPACE myapp
  WITH replication = {
    'class': 'NetworkTopologyStrategy',
    'datacenter1': 3
  }
  AND durable_writes = true;

-- Switch to the keyspace
USE myapp;

-- Create a table
CREATE TABLE users (
  user_id UUID PRIMARY KEY,
  username TEXT,
  email TEXT,
  created_at TIMESTAMP,
  last_login TIMESTAMP
);

-- Create an index on email for lookups
CREATE INDEX users_email_idx ON users (email);

-- Create a materialized view for querying by username
CREATE MATERIALIZED VIEW users_by_username AS
  SELECT user_id, username, email, created_at
  FROM users
  WHERE username IS NOT NULL AND user_id IS NOT NULL
  PRIMARY KEY (username, user_id);
```

## Inserting and Querying Data

```sql
-- Insert data
INSERT INTO myapp.users (user_id, username, email, created_at, last_login)
VALUES (uuid(), 'alice', 'alice@example.com', toTimestamp(now()), toTimestamp(now()));

INSERT INTO myapp.users (user_id, username, email, created_at, last_login)
VALUES (uuid(), 'bob', 'bob@example.com', toTimestamp(now()), toTimestamp(now()));

-- Query all users
SELECT * FROM myapp.users LIMIT 100;

-- Query by email (using the index)
SELECT * FROM myapp.users WHERE email = 'alice@example.com';

-- Query the materialized view
SELECT * FROM myapp.users_by_username WHERE username = 'bob';
```

## Setting Up a 3-Node Cluster

For a production cluster, repeat the installation on nodes 2 and 3, updating `scylla.yaml` on each:

```yaml
# On node 2 (192.168.1.11):
listen_address: 192.168.1.11
rpc_address: 192.168.1.11
seed_provider:
    - class_name: org.apache.cassandra.locator.SimpleSeedProvider
      parameters:
          - seeds: "192.168.1.10"  # Only point to node 1 as seed

# On node 3 (192.168.1.12):
listen_address: 192.168.1.12
rpc_address: 192.168.1.12
seed_provider:
    - class_name: org.apache.cassandra.locator.SimpleSeedProvider
      parameters:
          - seeds: "192.168.1.10"
```

Start ScyllaDB on nodes 2 and 3 one at a time, waiting for each to reach UN state before starting the next.

## Monitoring with nodetool

```bash
# Cluster-wide node status
nodetool status

# View ring information
nodetool ring

# Check tpstats (thread pool stats - useful for identifying bottlenecks)
nodetool tpstats

# View compaction stats
nodetool compactionstats

# Run a repair on a keyspace (needed for consistency after failures)
nodetool repair myapp

# Flush memtables to disk
nodetool flush myapp
```

## Performance Tuning

ScyllaDB automatically handles many tuning decisions, but a few things matter:

```bash
# Check if performance mode is active for the CPU governor
cat /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor | sort -u
# Should show: performance

# Verify the scheduler is configured correctly
cat /sys/block/*/queue/scheduler
# Should show: none or mq-deadline for SSDs
```

Monitor ScyllaDB's performance metrics and availability with [OneUptime](https://oneuptime.com). ScyllaDB exposes a Prometheus-compatible metrics endpoint at `:9180/metrics` that can feed into your monitoring stack.
