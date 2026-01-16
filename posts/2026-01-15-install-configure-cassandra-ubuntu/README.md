# How to Install and Configure Apache Cassandra on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Cassandra, NoSQL, Database, Distributed, Tutorial

Description: Complete guide to installing Apache Cassandra distributed NoSQL database on Ubuntu for scalable data storage.

---

Apache Cassandra is a highly scalable, distributed NoSQL database designed for handling large amounts of data across many commodity servers. It provides high availability with no single point of failure. This guide covers installation and configuration on Ubuntu.

## Features

- Linear scalability
- Fault tolerance
- No single point of failure
- Tunable consistency
- CQL (Cassandra Query Language)
- Multi-datacenter replication

## Prerequisites

- Ubuntu 20.04 or 22.04
- At least 4GB RAM (8GB recommended)
- Java 11 or 17
- Python 3 (for cqlsh)

## System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| RAM | 4GB | 8GB+ |
| CPU | 2 cores | 4+ cores |
| Disk | SSD recommended | NVMe preferred |

## Install Java

```bash
# Update system
sudo apt update

# Install Java 11
sudo apt install openjdk-11-jdk -y

# Verify
java -version

# Set JAVA_HOME
echo 'JAVA_HOME="/usr/lib/jvm/java-11-openjdk-amd64"' | sudo tee -a /etc/environment
source /etc/environment
```

## Install Cassandra

### Add Apache Repository

```bash
# Install prerequisites
sudo apt install curl gnupg -y

# Add Apache Cassandra repository key
curl https://downloads.apache.org/cassandra/KEYS | sudo gpg --dearmor -o /usr/share/keyrings/cassandra-archive-keyring.gpg

# Add repository (Cassandra 4.1)
echo "deb [signed-by=/usr/share/keyrings/cassandra-archive-keyring.gpg] https://debian.cassandra.apache.org 41x main" | sudo tee /etc/apt/sources.list.d/cassandra.list

# Install Cassandra
sudo apt update
sudo apt install cassandra -y
```

### Verify Installation

```bash
# Check service status
sudo systemctl status cassandra

# Check node status
nodetool status
```

## Configuration

### Main Configuration File

```bash
sudo nano /etc/cassandra/cassandra.yaml
```

Key settings:

```yaml
# Cluster name - must be same across all nodes
cluster_name: 'MyCluster'

# Number of replicas
num_tokens: 256

# Data directories
data_file_directories:
    - /var/lib/cassandra/data

commitlog_directory: /var/lib/cassandra/commitlog
saved_caches_directory: /var/lib/cassandra/saved_caches

# Network settings
seed_provider:
    - class_name: org.apache.cassandra.locator.SimpleSeedProvider
      parameters:
          - seeds: "127.0.0.1"  # Comma-separated list of seed nodes

listen_address: localhost  # Change to actual IP for multi-node
rpc_address: localhost     # Client connections

# Native transport (CQL)
native_transport_port: 9042

# Storage port (inter-node)
storage_port: 7000
ssl_storage_port: 7001

# Endpoint snitch
endpoint_snitch: SimpleSnitch  # Or GossipingPropertyFileSnitch for production

# Compaction settings
compaction_throughput_mb_per_sec: 64

# Memory settings
memtable_allocation_type: heap_buffers
```

### JVM Settings

```bash
sudo nano /etc/cassandra/jvm.options
```

```bash
# Heap settings (typically 1/4 to 1/2 of RAM, max 8GB)
-Xms4G
-Xmx4G

# Young generation size (typically 100MB per core)
-Xmn800M

# GC settings
-XX:+UseG1GC
-XX:MaxGCPauseMillis=500
```

### Apply Configuration

```bash
sudo systemctl restart cassandra

# Verify node is up
nodetool status
```

## CQL Shell (cqlsh)

### Connect to Cassandra

```bash
# Connect to local instance
cqlsh

# Connect to specific host
cqlsh 192.168.1.100 9042

# Connect with authentication
cqlsh -u cassandra -p cassandra
```

### Basic CQL Commands

```sql
-- Show cluster info
DESCRIBE CLUSTER;

-- List keyspaces
DESCRIBE KEYSPACES;

-- Show current user
SELECT * FROM system_auth.roles;
```

## Keyspace Management

### Create Keyspace

```sql
-- Simple keyspace (single datacenter)
CREATE KEYSPACE mykeyspace
WITH replication = {
    'class': 'SimpleStrategy',
    'replication_factor': 1
};

-- Production keyspace (multi-datacenter)
CREATE KEYSPACE production_ks
WITH replication = {
    'class': 'NetworkTopologyStrategy',
    'dc1': 3,
    'dc2': 2
};

-- Use keyspace
USE mykeyspace;
```

### Modify Keyspace

```sql
-- Alter replication
ALTER KEYSPACE mykeyspace
WITH replication = {
    'class': 'SimpleStrategy',
    'replication_factor': 3
};

-- Drop keyspace
DROP KEYSPACE mykeyspace;
```

## Table Management

### Create Table

```sql
USE mykeyspace;

-- Simple table
CREATE TABLE users (
    user_id UUID PRIMARY KEY,
    username TEXT,
    email TEXT,
    created_at TIMESTAMP
);

-- Table with compound primary key
CREATE TABLE user_events (
    user_id UUID,
    event_time TIMESTAMP,
    event_type TEXT,
    event_data TEXT,
    PRIMARY KEY (user_id, event_time)
) WITH CLUSTERING ORDER BY (event_time DESC);

-- Table with secondary index
CREATE TABLE products (
    product_id UUID PRIMARY KEY,
    name TEXT,
    category TEXT,
    price DECIMAL
);

CREATE INDEX ON products (category);
```

### Data Types

```sql
-- Common data types
-- TEXT, VARCHAR - strings
-- INT, BIGINT - integers
-- FLOAT, DOUBLE, DECIMAL - numbers
-- BOOLEAN - true/false
-- TIMESTAMP - date/time
-- UUID, TIMEUUID - unique identifiers
-- BLOB - binary data
-- LIST<type> - ordered collection
-- SET<type> - unique collection
-- MAP<type, type> - key-value pairs

-- Example with collections
CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY,
    name TEXT,
    tags SET<TEXT>,
    properties MAP<TEXT, TEXT>,
    history LIST<TEXT>
);
```

## CRUD Operations

### Insert Data

```sql
-- Insert row
INSERT INTO users (user_id, username, email, created_at)
VALUES (uuid(), 'john_doe', 'john@example.com', toTimestamp(now()));

-- Insert with TTL (Time-To-Live)
INSERT INTO users (user_id, username, email, created_at)
VALUES (uuid(), 'jane_doe', 'jane@example.com', toTimestamp(now()))
USING TTL 86400;  -- Expires in 24 hours

-- Batch insert
BEGIN BATCH
INSERT INTO users (user_id, username, email) VALUES (uuid(), 'user1', 'user1@example.com');
INSERT INTO users (user_id, username, email) VALUES (uuid(), 'user2', 'user2@example.com');
APPLY BATCH;
```

### Query Data

```sql
-- Select all
SELECT * FROM users;

-- Select with condition
SELECT * FROM users WHERE user_id = 123e4567-e89b-12d3-a456-426614174000;

-- Select with LIMIT
SELECT * FROM users LIMIT 10;

-- Select specific columns
SELECT username, email FROM users;

-- Allow filtering (use with caution)
SELECT * FROM users WHERE username = 'john_doe' ALLOW FILTERING;
```

### Update Data

```sql
-- Update row
UPDATE users
SET email = 'newemail@example.com'
WHERE user_id = 123e4567-e89b-12d3-a456-426614174000;

-- Update with TTL
UPDATE users USING TTL 3600
SET email = 'temp@example.com'
WHERE user_id = 123e4567-e89b-12d3-a456-426614174000;

-- Update collections
UPDATE user_profiles
SET tags = tags + {'new_tag'}
WHERE user_id = 123e4567-e89b-12d3-a456-426614174000;
```

### Delete Data

```sql
-- Delete row
DELETE FROM users
WHERE user_id = 123e4567-e89b-12d3-a456-426614174000;

-- Delete specific column
DELETE email FROM users
WHERE user_id = 123e4567-e89b-12d3-a456-426614174000;

-- Truncate table
TRUNCATE users;
```

## Security Configuration

### Enable Authentication

```bash
sudo nano /etc/cassandra/cassandra.yaml
```

```yaml
authenticator: PasswordAuthenticator
authorizer: CassandraAuthorizer
```

```bash
sudo systemctl restart cassandra
```

### Manage Users

```sql
-- Connect with default credentials
cqlsh -u cassandra -p cassandra

-- Create new superuser
CREATE ROLE admin WITH PASSWORD = 'StrongPassword123!' AND SUPERUSER = true AND LOGIN = true;

-- Create application user
CREATE ROLE appuser WITH PASSWORD = 'AppPassword123!' AND LOGIN = true;

-- Grant permissions
GRANT ALL PERMISSIONS ON KEYSPACE mykeyspace TO appuser;

-- Change default password
ALTER ROLE cassandra WITH PASSWORD = 'NewStrongPassword!';

-- List roles
LIST ROLES;
```

### Enable SSL/TLS

```bash
# Generate SSL certificates
sudo mkdir -p /etc/cassandra/ssl
cd /etc/cassandra/ssl

# Generate keystore
sudo keytool -genkey -keyalg RSA -alias cassandra \
    -keystore cassandra.keystore \
    -storepass cassandra \
    -keypass cassandra \
    -validity 365 \
    -keysize 2048 \
    -dname "CN=cassandra, OU=Cassandra, O=MyOrg, L=City, ST=State, C=US"

# Generate truststore
sudo keytool -export -alias cassandra \
    -file cassandra.cer \
    -keystore cassandra.keystore \
    -storepass cassandra

sudo keytool -import -alias cassandra \
    -file cassandra.cer \
    -keystore cassandra.truststore \
    -storepass cassandra -noprompt
```

Update cassandra.yaml:

```yaml
client_encryption_options:
    enabled: true
    keystore: /etc/cassandra/ssl/cassandra.keystore
    keystore_password: cassandra
    truststore: /etc/cassandra/ssl/cassandra.truststore
    truststore_password: cassandra

server_encryption_options:
    internode_encryption: all
    keystore: /etc/cassandra/ssl/cassandra.keystore
    keystore_password: cassandra
    truststore: /etc/cassandra/ssl/cassandra.truststore
    truststore_password: cassandra
```

## Multi-Node Cluster Setup

### Node Configuration

On each node, edit cassandra.yaml:

```yaml
# Same cluster name on all nodes
cluster_name: 'ProductionCluster'

# Seed nodes (pick 2-3 stable nodes)
seed_provider:
    - class_name: org.apache.cassandra.locator.SimpleSeedProvider
      parameters:
          - seeds: "192.168.1.100,192.168.1.101"

# Node's own IP address
listen_address: 192.168.1.100  # This node's IP
rpc_address: 192.168.1.100

# Snitch for multi-datacenter
endpoint_snitch: GossipingPropertyFileSnitch
```

### Configure Rack Awareness

```bash
sudo nano /etc/cassandra/cassandra-rackdc.properties
```

```properties
dc=dc1
rack=rack1
```

### Join Cluster

```bash
# Stop Cassandra
sudo systemctl stop cassandra

# Clear data (for new nodes only)
sudo rm -rf /var/lib/cassandra/data/*
sudo rm -rf /var/lib/cassandra/commitlog/*

# Start Cassandra
sudo systemctl start cassandra

# Verify cluster
nodetool status
```

## Maintenance Operations

### Node Tool Commands

```bash
# Check cluster status
nodetool status

# Check ring topology
nodetool ring

# Repair data
nodetool repair

# Compact SSTables
nodetool compact

# Flush memtables to disk
nodetool flush

# Take snapshot
nodetool snapshot -t snapshot_name

# Clear snapshot
nodetool clearsnapshot snapshot_name

# Get node info
nodetool info

# Check compaction stats
nodetool compactionstats
```

### Backup and Restore

```bash
# Create snapshot
nodetool snapshot -t backup_$(date +%Y%m%d)

# Snapshots are stored in:
# /var/lib/cassandra/data/<keyspace>/<table>/snapshots/

# Restore from snapshot
# 1. Stop Cassandra
sudo systemctl stop cassandra

# 2. Copy snapshot files to data directory
# 3. Start Cassandra
sudo systemctl start cassandra

# 4. Run repair
nodetool repair
```

## Performance Tuning

### Compaction Strategy

```sql
-- Size-tiered (default, write-heavy)
ALTER TABLE users WITH compaction = {
    'class': 'SizeTieredCompactionStrategy',
    'min_threshold': 4,
    'max_threshold': 32
};

-- Leveled (read-heavy)
ALTER TABLE users WITH compaction = {
    'class': 'LeveledCompactionStrategy'
};

-- Time-window (time-series data)
ALTER TABLE events WITH compaction = {
    'class': 'TimeWindowCompactionStrategy',
    'compaction_window_unit': 'DAYS',
    'compaction_window_size': 1
};
```

### Memory Settings

```bash
# Adjust in /etc/cassandra/jvm.options
# Heap size = 1/4 to 1/2 of RAM (max 8GB recommended)
-Xms8G
-Xmx8G
```

## Troubleshooting

### Check Logs

```bash
# System log
sudo tail -f /var/log/cassandra/system.log

# Debug log
sudo tail -f /var/log/cassandra/debug.log
```

### Common Issues

```bash
# Node won't start
# Check for Java heap space
sudo journalctl -u cassandra | grep -i "heap"

# Connection refused
# Verify listen_address and rpc_address

# Gossip issues
nodetool gossipinfo

# Check for downed nodes
nodetool status
nodetool netstats
```

### Health Checks

```bash
# Check thread pools
nodetool tpstats

# Check dropped messages
nodetool cfstats

# Check table stats
nodetool tablestats mykeyspace.users
```

---

Apache Cassandra provides excellent scalability for distributed data storage with tunable consistency. Its peer-to-peer architecture ensures high availability. For comprehensive monitoring of your Cassandra cluster, consider integrating with OneUptime for real-time alerts and performance tracking.
