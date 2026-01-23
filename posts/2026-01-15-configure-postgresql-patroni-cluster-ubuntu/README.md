# How to Configure PostgreSQL Patroni Cluster on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, PostgreSQL, Patroni, High Availability, Cluster, Tutorial

Description: Complete guide to setting up a highly available PostgreSQL cluster using Patroni on Ubuntu.

---

PostgreSQL is one of the most powerful open-source relational database management systems available today. However, running a single PostgreSQL instance in production poses significant risks: if that instance fails, your entire application goes down. This is where Patroni comes in, providing automatic failover and high availability for PostgreSQL clusters.

In this comprehensive guide, we will walk through configuring a production-ready PostgreSQL Patroni cluster on Ubuntu.

## Understanding Patroni

Patroni is a template for building highly available PostgreSQL clusters using Python. It was developed by Zalando and has become the industry standard for PostgreSQL high availability. Patroni handles:

- **Automatic failover**: When the primary node fails, Patroni automatically promotes a replica to become the new primary
- **Leader election**: Uses distributed consensus stores (etcd, Consul, or ZooKeeper) to elect and maintain cluster leadership
- **Configuration management**: Manages PostgreSQL configuration across all cluster nodes
- **Cluster bootstrapping**: Initializes new clusters and adds replicas automatically
- **REST API**: Provides HTTP endpoints for monitoring and management

### How Patroni Works

Patroni runs as a daemon alongside PostgreSQL on each node. It continuously monitors the health of PostgreSQL and communicates with other Patroni nodes through the distributed configuration store (DCS). The DCS maintains cluster state and coordinates leader election.

When the current leader becomes unavailable:
1. The DCS lock expires
2. Remaining nodes compete for leadership
3. The most up-to-date replica wins the election
4. The winner promotes itself to primary
5. Other replicas reconfigure to follow the new primary

## Architecture Overview

A typical Patroni cluster consists of several components:

```mermaid
flowchart TB
    LB["HAProxy /<br/>PgBouncer"]
    
    subgraph Cluster["PostgreSQL Cluster"]
        N1["Node 1<br/>PostgreSQL<br/>Patroni"]
        N2["Node 2<br/>PostgreSQL<br/>Patroni"]
        N3["Node 3<br/>PostgreSQL<br/>Patroni"]
    end
    
    DCS[("etcd / Consul<br/>/ ZooKeeper")]
    
    LB --> N1
    LB --> N2
    LB --> N3
    
    N1 <--> DCS
    N2 <--> DCS
    N3 <--> DCS
```

### Distributed Configuration Store (DCS) Options

Patroni supports three distributed configuration stores:

**etcd**: The most popular choice for Patroni deployments. It is lightweight, easy to set up, and provides strong consistency guarantees. We will use etcd in this guide.

**Consul**: A full-featured service mesh solution from HashiCorp. Choose Consul if you are already using it for service discovery or need its additional features.

**ZooKeeper**: A mature distributed coordination service from Apache. Best suited for organizations already running ZooKeeper for other applications like Kafka.

### Node Requirements

For a production Patroni cluster, you need:

- **Minimum 3 nodes**: Required for quorum and split-brain prevention
- **Odd number of nodes**: Ensures clean majority during elections
- **Consistent hardware**: All nodes should have similar specifications
- **Network connectivity**: Low-latency connections between all nodes

## Prerequisites

Before beginning the installation, ensure you have:

### System Requirements

- Ubuntu 22.04 LTS or Ubuntu 24.04 LTS (this guide uses Ubuntu 24.04)
- At least 3 servers (physical or virtual)
- Minimum 2 CPU cores per node
- Minimum 4 GB RAM per node (8 GB recommended)
- At least 50 GB storage per node
- Root or sudo access on all nodes

### Network Requirements

- All nodes can communicate on ports 5432 (PostgreSQL), 8008 (Patroni REST API), and 2379/2380 (etcd)
- Firewall configured to allow inter-node communication
- DNS or /etc/hosts configured for name resolution

### Example Cluster Setup

For this guide, we will use three nodes:

| Hostname | IP Address | Role |
|----------|------------|------|
| pg-node1 | 192.168.1.101 | PostgreSQL + Patroni + etcd |
| pg-node2 | 192.168.1.102 | PostgreSQL + Patroni + etcd |
| pg-node3 | 192.168.1.103 | PostgreSQL + Patroni + etcd |

### Configure Hostnames

On each node, update `/etc/hosts`:

```bash
# Add these lines to /etc/hosts on all nodes
sudo tee -a /etc/hosts << EOF
192.168.1.101 pg-node1
192.168.1.102 pg-node2
192.168.1.103 pg-node3
EOF
```

## Installing etcd

etcd provides the distributed consensus mechanism that Patroni uses for leader election and cluster state management. We will install etcd on all three nodes for redundancy.

### Step 1: Install etcd Package

Run the following commands on all three nodes:

```bash
# Update package lists
sudo apt update

# Install etcd
sudo apt install -y etcd

# Stop the default etcd service (we will configure it properly)
sudo systemctl stop etcd
```

### Step 2: Configure etcd

Create the etcd configuration file. The configuration differs slightly for each node.

**On pg-node1 (192.168.1.101):**

```bash
# Create etcd configuration directory
sudo mkdir -p /etc/etcd

# Create the configuration file
sudo tee /etc/etcd/etcd.conf << EOF
# etcd configuration for pg-node1
# Human-readable name for this member
ETCD_NAME="etcd1"

# Path to the data directory
ETCD_DATA_DIR="/var/lib/etcd/default"

# List of comma-separated URLs to listen on for peer traffic
# This is for communication between etcd cluster members
ETCD_LISTEN_PEER_URLS="http://192.168.1.101:2380"

# List of comma-separated URLs to listen on for client traffic
# Patroni connects to etcd using these URLs
ETCD_LISTEN_CLIENT_URLS="http://192.168.1.101:2379,http://127.0.0.1:2379"

# List of this member's peer URLs to advertise to the rest of the cluster
ETCD_INITIAL_ADVERTISE_PEER_URLS="http://192.168.1.101:2380"

# List of this member's client URLs to advertise to the public
ETCD_ADVERTISE_CLIENT_URLS="http://192.168.1.101:2379"

# Initial cluster configuration for bootstrapping
# Format: name=url,name=url,...
ETCD_INITIAL_CLUSTER="etcd1=http://192.168.1.101:2380,etcd2=http://192.168.1.102:2380,etcd3=http://192.168.1.103:2380"

# Initial cluster token for the etcd cluster during bootstrap
# Use a unique token for each cluster
ETCD_INITIAL_CLUSTER_TOKEN="patroni-etcd-cluster"

# Initial cluster state ('new' for new cluster, 'existing' for joining)
ETCD_INITIAL_CLUSTER_STATE="new"

# Enable runtime reconfiguration
ETCD_ENABLE_V2="true"
EOF
```

**On pg-node2 (192.168.1.102):**

```bash
sudo mkdir -p /etc/etcd

sudo tee /etc/etcd/etcd.conf << EOF
# etcd configuration for pg-node2
ETCD_NAME="etcd2"
ETCD_DATA_DIR="/var/lib/etcd/default"
ETCD_LISTEN_PEER_URLS="http://192.168.1.102:2380"
ETCD_LISTEN_CLIENT_URLS="http://192.168.1.102:2379,http://127.0.0.1:2379"
ETCD_INITIAL_ADVERTISE_PEER_URLS="http://192.168.1.102:2380"
ETCD_ADVERTISE_CLIENT_URLS="http://192.168.1.102:2379"
ETCD_INITIAL_CLUSTER="etcd1=http://192.168.1.101:2380,etcd2=http://192.168.1.102:2380,etcd3=http://192.168.1.103:2380"
ETCD_INITIAL_CLUSTER_TOKEN="patroni-etcd-cluster"
ETCD_INITIAL_CLUSTER_STATE="new"
ETCD_ENABLE_V2="true"
EOF
```

**On pg-node3 (192.168.1.103):**

```bash
sudo mkdir -p /etc/etcd

sudo tee /etc/etcd/etcd.conf << EOF
# etcd configuration for pg-node3
ETCD_NAME="etcd3"
ETCD_DATA_DIR="/var/lib/etcd/default"
ETCD_LISTEN_PEER_URLS="http://192.168.1.103:2380"
ETCD_LISTEN_CLIENT_URLS="http://192.168.1.103:2379,http://127.0.0.1:2379"
ETCD_INITIAL_ADVERTISE_PEER_URLS="http://192.168.1.103:2380"
ETCD_ADVERTISE_CLIENT_URLS="http://192.168.1.103:2379"
ETCD_INITIAL_CLUSTER="etcd1=http://192.168.1.101:2380,etcd2=http://192.168.1.102:2380,etcd3=http://192.168.1.103:2380"
ETCD_INITIAL_CLUSTER_TOKEN="patroni-etcd-cluster"
ETCD_INITIAL_CLUSTER_STATE="new"
ETCD_ENABLE_V2="true"
EOF
```

### Step 3: Create etcd Systemd Service

Create a systemd service file on all nodes:

```bash
sudo tee /etc/systemd/system/etcd.service << EOF
[Unit]
Description=etcd - highly-available key value store
Documentation=https://etcd.io/docs
After=network.target
Wants=network-online.target

[Service]
Type=notify
# Load environment variables from config file
EnvironmentFile=/etc/etcd/etcd.conf
# Run etcd with the configured environment
ExecStart=/usr/bin/etcd
# Restart on failure
Restart=on-failure
RestartSec=5
# Limit restarts to prevent rapid restart loops
StartLimitInterval=60
StartLimitBurst=3
# Process management
LimitNOFILE=65536
LimitNPROC=65536

[Install]
WantedBy=multi-user.target
EOF
```

### Step 4: Start etcd Cluster

Start etcd on all nodes simultaneously (or within a few seconds of each other):

```bash
# Reload systemd to recognize the new service
sudo systemctl daemon-reload

# Enable etcd to start on boot
sudo systemctl enable etcd

# Start the etcd service
sudo systemctl start etcd

# Check the status
sudo systemctl status etcd
```

### Step 5: Verify etcd Cluster Health

After starting etcd on all nodes, verify the cluster is healthy:

```bash
# Check cluster member list
etcdctl member list

# Expected output:
# 8e9e05c52164694d, started, etcd1, http://192.168.1.101:2380, http://192.168.1.101:2379
# 91bc3c398fb3c146, started, etcd2, http://192.168.1.102:2380, http://192.168.1.102:2379
# fd422379fda50e48, started, etcd3, http://192.168.1.103:2380, http://192.168.1.103:2379

# Check cluster health
etcdctl endpoint health --endpoints=http://192.168.1.101:2379,http://192.168.1.102:2379,http://192.168.1.103:2379

# Expected output:
# http://192.168.1.101:2379 is healthy: successfully committed proposal
# http://192.168.1.102:2379 is healthy: successfully committed proposal
# http://192.168.1.103:2379 is healthy: successfully committed proposal
```

## Installing PostgreSQL and Patroni

With etcd running, we can now install PostgreSQL and Patroni on all nodes.

### Step 1: Add PostgreSQL Repository

```bash
# Install required packages
sudo apt install -y wget gnupg2 lsb-release

# Add PostgreSQL official repository
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'

# Import repository signing key
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -

# Update package lists
sudo apt update
```

### Step 2: Install PostgreSQL

```bash
# Install PostgreSQL 16 (latest stable version as of 2025)
sudo apt install -y postgresql-16 postgresql-contrib-16

# Stop the default PostgreSQL service
# Patroni will manage PostgreSQL, so we disable the default service
sudo systemctl stop postgresql
sudo systemctl disable postgresql

# Remove the default PostgreSQL data directory
# Patroni will create its own data directory
sudo rm -rf /var/lib/postgresql/16/main
```

### Step 3: Install Patroni

```bash
# Install Python pip and required dependencies
sudo apt install -y python3-pip python3-dev libpq-dev

# Install Patroni with etcd support
sudo pip3 install patroni[etcd] psycopg2-binary

# Verify Patroni installation
patroni --version
# Expected output: patroni 3.x.x
```

### Step 4: Create Patroni User and Directories

```bash
# Create directories for Patroni
sudo mkdir -p /etc/patroni
sudo mkdir -p /var/lib/patroni
sudo mkdir -p /var/log/patroni

# Set ownership to postgres user
sudo chown -R postgres:postgres /etc/patroni
sudo chown -R postgres:postgres /var/lib/patroni
sudo chown -R postgres:postgres /var/log/patroni
```

## Patroni Configuration (patroni.yml)

The Patroni configuration file is the heart of your cluster setup. It defines how Patroni manages PostgreSQL, connects to etcd, and handles replication.

### Understanding patroni.yml Structure

The configuration file has several main sections:

- **scope**: Cluster name (must be the same on all nodes)
- **namespace**: etcd namespace for this cluster
- **name**: Unique name for this node
- **restapi**: REST API configuration for Patroni
- **etcd**: Connection settings for etcd
- **bootstrap**: Initial cluster configuration
- **postgresql**: PostgreSQL-specific settings

### Create patroni.yml on Each Node

**On pg-node1 (192.168.1.101):**

```bash
sudo tee /etc/patroni/patroni.yml << EOF
# Patroni configuration file for pg-node1
# This file controls how Patroni manages the PostgreSQL cluster

# Cluster identification
scope: postgres-cluster  # Name of the cluster (same on all nodes)
namespace: /db/          # etcd namespace for this cluster
name: pg-node1           # Unique name for this node

# REST API configuration
# Patroni exposes a REST API for health checks and management
restapi:
  listen: 192.168.1.101:8008      # IP and port to listen on
  connect_address: 192.168.1.101:8008  # Address other nodes use to connect

# etcd configuration
# Connection settings for the distributed configuration store
etcd:
  hosts:
    - 192.168.1.101:2379
    - 192.168.1.102:2379
    - 192.168.1.103:2379

# Bootstrap configuration
# These settings are used when initializing a new cluster
bootstrap:
  # DCS (Distributed Configuration Store) settings
  # These are stored in etcd and shared across all nodes
  dcs:
    ttl: 30                    # Time-to-live for the leader lock (seconds)
    loop_wait: 10              # How often to update the leader lock
    retry_timeout: 10          # Timeout for DCS operations
    maximum_lag_on_failover: 1048576  # Max replication lag for failover (1MB)

    # PostgreSQL configuration managed by Patroni
    postgresql:
      use_pg_rewind: true      # Use pg_rewind for faster replica resync
      use_slots: true          # Use replication slots to prevent WAL removal

      # PostgreSQL parameters (applied to all nodes)
      parameters:
        # Connection settings
        max_connections: 200

        # Memory settings
        shared_buffers: 1GB
        effective_cache_size: 3GB
        work_mem: 16MB
        maintenance_work_mem: 256MB

        # WAL settings for replication
        wal_level: replica
        hot_standby: "on"
        max_wal_senders: 10
        max_replication_slots: 10
        wal_keep_size: 1GB

        # Synchronous replication (optional, comment out for async)
        # synchronous_commit: "on"
        # synchronous_standby_names: "*"

        # Logging
        log_destination: 'stderr'
        logging_collector: "on"
        log_directory: '/var/log/postgresql'
        log_filename: 'postgresql-%Y-%m-%d.log'
        log_rotation_age: 1d
        log_rotation_size: 100MB
        log_min_duration_statement: 1000
        log_checkpoints: "on"
        log_connections: "on"
        log_disconnections: "on"
        log_lock_waits: "on"

        # Performance tuning
        checkpoint_completion_target: 0.9
        random_page_cost: 1.1
        effective_io_concurrency: 200

  # Initialization commands
  # These run when the cluster is first created
  initdb:
    - encoding: UTF8
    - data-checksums        # Enable data checksums for corruption detection

  # Post-initialization scripts
  # Create roles and configure authentication
  pg_hba:
    - host replication replicator 192.168.1.0/24 md5
    - host all all 192.168.1.0/24 md5
    - host all all 0.0.0.0/0 md5

  # Users to create on initialization
  users:
    admin:
      password: 'SecureAdminPassword123!'
      options:
        - createrole
        - createdb
    replicator:
      password: 'SecureReplicatorPassword123!'
      options:
        - replication

# PostgreSQL configuration
postgresql:
  listen: 192.168.1.101:5432     # IP and port for PostgreSQL to listen on
  connect_address: 192.168.1.101:5432  # Address advertised to clients
  data_dir: /var/lib/patroni/data      # PostgreSQL data directory
  bin_dir: /usr/lib/postgresql/16/bin  # PostgreSQL binaries location

  # Authentication settings
  authentication:
    replication:
      username: replicator
      password: 'SecureReplicatorPassword123!'
    superuser:
      username: postgres
      password: 'SecurePostgresPassword123!'
    rewind:
      username: postgres
      password: 'SecurePostgresPassword123!'

  # Node-specific PostgreSQL parameters
  # These can override the bootstrap parameters
  parameters:
    unix_socket_directories: '/var/run/postgresql'

# Watchdog configuration (optional but recommended for production)
# Prevents split-brain scenarios
# watchdog:
#   mode: automatic
#   device: /dev/watchdog
#   safety_margin: 5

# Tags for this node (optional)
tags:
  nofailover: false    # Set to true to prevent this node from becoming leader
  noloadbalance: false # Set to true to exclude from load balancing
  clonefrom: false     # Set to true to use this node as clone source
  nosync: false        # Set to true to exclude from synchronous replication
EOF
```

**On pg-node2 (192.168.1.102):**

```bash
sudo tee /etc/patroni/patroni.yml << EOF
# Patroni configuration file for pg-node2
scope: postgres-cluster
namespace: /db/
name: pg-node2

restapi:
  listen: 192.168.1.102:8008
  connect_address: 192.168.1.102:8008

etcd:
  hosts:
    - 192.168.1.101:2379
    - 192.168.1.102:2379
    - 192.168.1.103:2379

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
        max_connections: 200
        shared_buffers: 1GB
        effective_cache_size: 3GB
        work_mem: 16MB
        maintenance_work_mem: 256MB
        wal_level: replica
        hot_standby: "on"
        max_wal_senders: 10
        max_replication_slots: 10
        wal_keep_size: 1GB
        log_destination: 'stderr'
        logging_collector: "on"
        log_directory: '/var/log/postgresql'
        log_filename: 'postgresql-%Y-%m-%d.log'
        checkpoint_completion_target: 0.9
        random_page_cost: 1.1
        effective_io_concurrency: 200
  initdb:
    - encoding: UTF8
    - data-checksums
  pg_hba:
    - host replication replicator 192.168.1.0/24 md5
    - host all all 192.168.1.0/24 md5
    - host all all 0.0.0.0/0 md5
  users:
    admin:
      password: 'SecureAdminPassword123!'
      options:
        - createrole
        - createdb
    replicator:
      password: 'SecureReplicatorPassword123!'
      options:
        - replication

postgresql:
  listen: 192.168.1.102:5432
  connect_address: 192.168.1.102:5432
  data_dir: /var/lib/patroni/data
  bin_dir: /usr/lib/postgresql/16/bin
  authentication:
    replication:
      username: replicator
      password: 'SecureReplicatorPassword123!'
    superuser:
      username: postgres
      password: 'SecurePostgresPassword123!'
    rewind:
      username: postgres
      password: 'SecurePostgresPassword123!'
  parameters:
    unix_socket_directories: '/var/run/postgresql'

tags:
  nofailover: false
  noloadbalance: false
  clonefrom: false
  nosync: false
EOF
```

**On pg-node3 (192.168.1.103):**

```bash
sudo tee /etc/patroni/patroni.yml << EOF
# Patroni configuration file for pg-node3
scope: postgres-cluster
namespace: /db/
name: pg-node3

restapi:
  listen: 192.168.1.103:8008
  connect_address: 192.168.1.103:8008

etcd:
  hosts:
    - 192.168.1.101:2379
    - 192.168.1.102:2379
    - 192.168.1.103:2379

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
        max_connections: 200
        shared_buffers: 1GB
        effective_cache_size: 3GB
        work_mem: 16MB
        maintenance_work_mem: 256MB
        wal_level: replica
        hot_standby: "on"
        max_wal_senders: 10
        max_replication_slots: 10
        wal_keep_size: 1GB
        log_destination: 'stderr'
        logging_collector: "on"
        log_directory: '/var/log/postgresql'
        log_filename: 'postgresql-%Y-%m-%d.log'
        checkpoint_completion_target: 0.9
        random_page_cost: 1.1
        effective_io_concurrency: 200
  initdb:
    - encoding: UTF8
    - data-checksums
  pg_hba:
    - host replication replicator 192.168.1.0/24 md5
    - host all all 192.168.1.0/24 md5
    - host all all 0.0.0.0/0 md5
  users:
    admin:
      password: 'SecureAdminPassword123!'
      options:
        - createrole
        - createdb
    replicator:
      password: 'SecureReplicatorPassword123!'
      options:
        - replication

postgresql:
  listen: 192.168.1.103:5432
  connect_address: 192.168.1.103:5432
  data_dir: /var/lib/patroni/data
  bin_dir: /usr/lib/postgresql/16/bin
  authentication:
    replication:
      username: replicator
      password: 'SecureReplicatorPassword123!'
    superuser:
      username: postgres
      password: 'SecurePostgresPassword123!'
    rewind:
      username: postgres
      password: 'SecurePostgresPassword123!'
  parameters:
    unix_socket_directories: '/var/run/postgresql'

tags:
  nofailover: false
  noloadbalance: false
  clonefrom: false
  nosync: false
EOF
```

Set proper permissions on all nodes:

```bash
sudo chown postgres:postgres /etc/patroni/patroni.yml
sudo chmod 600 /etc/patroni/patroni.yml
```

## Starting the Cluster

Now we will create the Patroni systemd service and start the cluster.

### Step 1: Create Patroni Systemd Service

Create the service file on all nodes:

```bash
sudo tee /etc/systemd/system/patroni.service << EOF
[Unit]
Description=Patroni - PostgreSQL High Availability
Documentation=https://patroni.readthedocs.io
After=network.target etcd.service
Wants=network-online.target

[Service]
Type=simple
# Run as postgres user
User=postgres
Group=postgres

# Configuration file location
Environment="PATRONI_CONFIG_LOCATION=/etc/patroni/patroni.yml"

# Start Patroni with the configuration file
ExecStart=/usr/local/bin/patroni /etc/patroni/patroni.yml

# Reload configuration without restart
ExecReload=/bin/kill -s HUP \$MAINPID

# Clean shutdown
KillMode=process
KillSignal=SIGTERM
TimeoutStopSec=30

# Restart policy
Restart=on-failure
RestartSec=5

# Process limits
LimitNOFILE=65536
LimitNPROC=65536

# Standard output and error to journal
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
```

### Step 2: Create PostgreSQL Log Directory

```bash
# Create log directory
sudo mkdir -p /var/log/postgresql
sudo chown postgres:postgres /var/log/postgresql
```

### Step 3: Start Patroni

Start Patroni on the first node first, then start the other nodes:

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable Patroni to start on boot
sudo systemctl enable patroni

# Start Patroni (run on pg-node1 first)
sudo systemctl start patroni

# Check status
sudo systemctl status patroni
```

Wait for pg-node1 to initialize, then start the other nodes. They will automatically replicate from the leader.

### Step 4: Verify Cluster Status

Use the patronictl command to check cluster status:

```bash
# Check cluster status (run from any node)
patronictl -c /etc/patroni/patroni.yml list

# Expected output:
# + Cluster: postgres-cluster (1234567890123456789) ---+----+-----------+
# | Member    | Host           | Role    | State     | TL | Lag in MB |
# +-----------+----------------+---------+-----------+----+-----------+
# | pg-node1  | 192.168.1.101  | Leader  | running   |  1 |           |
# | pg-node2  | 192.168.1.102  | Replica | streaming |  1 |         0 |
# | pg-node3  | 192.168.1.103  | Replica | streaming |  1 |         0 |
# +-----------+----------------+---------+-----------+----+-----------+
```

You can also check via the REST API:

```bash
# Check current leader
curl -s http://192.168.1.101:8008/leader | jq

# Check all cluster members
curl -s http://192.168.1.101:8008/cluster | jq

# Health check for a specific node
curl -s http://192.168.1.101:8008/health
```

## HAProxy for Connection Pooling

HAProxy provides load balancing and automatic routing to the current leader. This allows your application to use a single connection endpoint while Patroni handles failovers transparently.

### Step 1: Install HAProxy

Install HAProxy on a separate server or on one of the cluster nodes:

```bash
sudo apt install -y haproxy
```

### Step 2: Configure HAProxy

```bash
sudo tee /etc/haproxy/haproxy.cfg << EOF
# HAProxy configuration for PostgreSQL Patroni cluster
# This configuration routes traffic to the current leader and load balances read traffic

global
    # Maximum connections
    maxconn 1000

    # Logging
    log /dev/log local0
    log /dev/log local1 notice

    # Security settings
    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin
    stats timeout 30s

    # Run as haproxy user
    user haproxy
    group haproxy
    daemon

defaults
    # Default mode is TCP for PostgreSQL
    mode tcp

    # Logging
    log global
    option tcplog
    option dontlognull

    # Timeouts
    timeout connect 10s
    timeout client 30m
    timeout server 30m

    # Retry settings
    retries 3

# HAProxy statistics page
# Access at http://haproxy-ip:7000/stats
listen stats
    mode http
    bind *:7000
    stats enable
    stats uri /stats
    stats refresh 10s
    stats admin if LOCALHOST

# Primary (read-write) connection
# Routes to the current leader only
# Applications connect to this port for write operations
listen postgres-primary
    bind *:5000
    mode tcp
    option httpchk OPTIONS /primary
    http-check expect status 200
    default-server inter 3s fall 3 rise 2 on-marked-down shutdown-sessions

    # Patroni REST API health checks determine the primary
    # Only the leader returns HTTP 200 for /primary
    server pg-node1 192.168.1.101:5432 check port 8008
    server pg-node2 192.168.1.102:5432 check port 8008
    server pg-node3 192.168.1.103:5432 check port 8008

# Replica (read-only) connection
# Load balances across all replicas
# Applications connect to this port for read operations
listen postgres-replica
    bind *:5001
    mode tcp
    balance roundrobin
    option httpchk OPTIONS /replica
    http-check expect status 200
    default-server inter 3s fall 3 rise 2 on-marked-down shutdown-sessions

    # Patroni REST API health checks identify replicas
    # Only replicas return HTTP 200 for /replica
    server pg-node1 192.168.1.101:5432 check port 8008
    server pg-node2 192.168.1.102:5432 check port 8008
    server pg-node3 192.168.1.103:5432 check port 8008

# Alternative: All nodes (leader + replicas)
# Use this if you want to distribute read traffic including to the leader
listen postgres-all
    bind *:5002
    mode tcp
    balance roundrobin
    option httpchk OPTIONS /health
    http-check expect status 200
    default-server inter 3s fall 3 rise 2 on-marked-down shutdown-sessions

    server pg-node1 192.168.1.101:5432 check port 8008
    server pg-node2 192.168.1.102:5432 check port 8008
    server pg-node3 192.168.1.103:5432 check port 8008
EOF
```

### Step 3: Start HAProxy

```bash
# Validate configuration
sudo haproxy -c -f /etc/haproxy/haproxy.cfg

# Restart HAProxy
sudo systemctl restart haproxy
sudo systemctl enable haproxy

# Check status
sudo systemctl status haproxy
```

### Step 4: Test Connection Through HAProxy

```bash
# Connect to the primary (write operations)
psql -h haproxy-ip -p 5000 -U postgres -d postgres

# Connect to replicas (read operations)
psql -h haproxy-ip -p 5001 -U postgres -d postgres

# Test the connection
SELECT inet_server_addr();
```

### Application Connection Strings

Configure your applications with these connection strings:

```bash
# For write operations (connects to primary)
postgresql://postgres:password@haproxy-ip:5000/dbname

# For read operations (load balanced across replicas)
postgresql://postgres:password@haproxy-ip:5001/dbname
```

## Failover and Switchover

Patroni supports both automatic failover (when a node fails) and manual switchover (planned maintenance).

### Automatic Failover

When the leader becomes unavailable, Patroni automatically:

1. Detects the failure (within ttl seconds)
2. Initiates leader election
3. Promotes the most up-to-date replica
4. Reconfigures other replicas to follow the new leader

Test automatic failover:

```bash
# On the current leader, stop PostgreSQL
sudo systemctl stop patroni

# Watch the cluster status from another node
watch patronictl -c /etc/patroni/patroni.yml list

# You should see a new leader elected within 30-60 seconds
```

### Manual Switchover

For planned maintenance, use manual switchover:

```bash
# View current cluster status
patronictl -c /etc/patroni/patroni.yml list

# Perform switchover to a specific node
patronictl -c /etc/patroni/patroni.yml switchover

# Interactive prompts:
# Current cluster leader (pg-node1):
# Candidate ['pg-node2', 'pg-node3'] []: pg-node2
# When should the switchover take place (e.g., 2024-01-15T10:00 ) [now]:
# Are you sure you want to switchover cluster postgres-cluster, demoting current leader pg-node1? [y/N]: y

# Or use non-interactive mode
patronictl -c /etc/patroni/patroni.yml switchover --leader pg-node1 --candidate pg-node2 --force
```

### Reinitialize a Failed Node

If a node becomes corrupted or falls too far behind:

```bash
# Reinitialize the replica (this wipes data and reclones from leader)
patronictl -c /etc/patroni/patroni.yml reinit postgres-cluster pg-node3

# Monitor progress
patronictl -c /etc/patroni/patroni.yml list
```

### Restart PostgreSQL Without Failover

```bash
# Restart PostgreSQL on a specific node
patronictl -c /etc/patroni/patroni.yml restart postgres-cluster pg-node2

# Restart PostgreSQL on all nodes (rolling restart)
patronictl -c /etc/patroni/patroni.yml restart postgres-cluster
```

## Backup Integration

Integrating backups with your Patroni cluster is essential for disaster recovery.

### Using pgBackRest

pgBackRest is a reliable backup tool that works well with Patroni.

#### Install pgBackRest

```bash
# Install pgBackRest on all nodes
sudo apt install -y pgbackrest
```

#### Configure pgBackRest

Create the configuration file:

```bash
sudo tee /etc/pgbackrest/pgbackrest.conf << EOF
# pgBackRest configuration for Patroni cluster

[global]
# Repository settings
repo1-path=/var/lib/pgbackrest
repo1-retention-full=2
repo1-retention-diff=7

# Performance settings
process-max=4
compress-type=zst
compress-level=3

# Logging
log-level-console=info
log-level-file=detail

# Start/stop commands (Patroni manages PostgreSQL)
start-fast=y

[postgres-cluster]
# PostgreSQL settings
pg1-path=/var/lib/patroni/data
pg1-port=5432
pg1-socket-path=/var/run/postgresql

# Only run backups from the primary
# Patroni will handle this automatically
EOF
```

#### Create Backup Scripts

Create a backup script that respects Patroni leadership:

```bash
sudo tee /usr/local/bin/patroni-backup.sh << 'EOF'
#!/bin/bash
# Backup script that only runs on the Patroni leader

# Configuration
PATRONI_CONFIG="/etc/patroni/patroni.yml"
BACKUP_TYPE="${1:-full}"  # full or diff

# Check if this node is the leader
is_leader() {
    local response=$(curl -s http://localhost:8008/leader 2>/dev/null)
    if [ $? -eq 0 ] && [ -n "$response" ]; then
        return 0
    fi
    return 1
}

# Main backup logic
if is_leader; then
    echo "$(date): This node is the leader. Starting $BACKUP_TYPE backup..."

    if [ "$BACKUP_TYPE" = "full" ]; then
        pgbackrest --stanza=postgres-cluster --type=full backup
    else
        pgbackrest --stanza=postgres-cluster --type=diff backup
    fi

    if [ $? -eq 0 ]; then
        echo "$(date): Backup completed successfully"
    else
        echo "$(date): Backup failed"
        exit 1
    fi
else
    echo "$(date): This node is not the leader. Skipping backup."
fi
EOF

sudo chmod +x /usr/local/bin/patroni-backup.sh
```

#### Schedule Backups with Cron

```bash
# Edit crontab
sudo crontab -e

# Add these lines:
# Full backup every Sunday at 2 AM
0 2 * * 0 /usr/local/bin/patroni-backup.sh full >> /var/log/pgbackrest/backup.log 2>&1

# Differential backup every day at 2 AM (except Sunday)
0 2 * * 1-6 /usr/local/bin/patroni-backup.sh diff >> /var/log/pgbackrest/backup.log 2>&1
```

### Point-in-Time Recovery (PITR)

Configure WAL archiving for point-in-time recovery:

Update patroni.yml bootstrap parameters:

```yaml
bootstrap:
  dcs:
    postgresql:
      parameters:
        # Enable WAL archiving
        archive_mode: "on"
        archive_command: 'pgbackrest --stanza=postgres-cluster archive-push %p'
        archive_timeout: 60
```

Restore to a specific point in time:

```bash
# Stop Patroni on all nodes
sudo systemctl stop patroni

# Restore on the target node
pgbackrest --stanza=postgres-cluster --type=time "--target=2024-01-15 12:00:00" restore

# Start Patroni
sudo systemctl start patroni
```

## Monitoring Cluster Status

Effective monitoring is crucial for maintaining a healthy Patroni cluster.

### Patroni REST API Endpoints

Patroni exposes several useful endpoints:

```bash
# Get current leader
curl -s http://192.168.1.101:8008/leader | jq

# Get cluster information
curl -s http://192.168.1.101:8008/cluster | jq

# Health check (returns 200 if healthy)
curl -s -o /dev/null -w "%{http_code}" http://192.168.1.101:8008/health

# Check if node is primary (returns 200 for leader)
curl -s -o /dev/null -w "%{http_code}" http://192.168.1.101:8008/primary

# Check if node is replica (returns 200 for replica)
curl -s -o /dev/null -w "%{http_code}" http://192.168.1.101:8008/replica

# Check replication status (returns 200 if replication is healthy)
curl -s -o /dev/null -w "%{http_code}" http://192.168.1.101:8008/replica?lag=100M

# Get configuration
curl -s http://192.168.1.101:8008/config | jq

# Get history of leader changes
curl -s http://192.168.1.101:8008/history | jq
```

### Using patronictl for Monitoring

```bash
# List cluster members
patronictl -c /etc/patroni/patroni.yml list

# Show cluster configuration
patronictl -c /etc/patroni/patroni.yml show-config

# Show history of leadership changes
patronictl -c /etc/patroni/patroni.yml history

# Edit cluster configuration dynamically
patronictl -c /etc/patroni/patroni.yml edit-config
```

### PostgreSQL Replication Monitoring Queries

```sql
-- Check replication status on primary
SELECT
    client_addr,
    state,
    sent_lsn,
    write_lsn,
    flush_lsn,
    replay_lsn,
    pg_size_pretty(pg_wal_lsn_diff(sent_lsn, replay_lsn)) AS replication_lag
FROM pg_stat_replication;

-- Check replication slots
SELECT
    slot_name,
    slot_type,
    active,
    pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS retained_wal
FROM pg_replication_slots;

-- Check recovery status on replica
SELECT
    pg_is_in_recovery() AS is_replica,
    pg_last_wal_receive_lsn() AS received_lsn,
    pg_last_wal_replay_lsn() AS replayed_lsn,
    pg_last_xact_replay_timestamp() AS last_replay_time;
```

### Setting Up Prometheus Monitoring

Install and configure Prometheus PostgreSQL exporter:

```bash
# Install postgres_exporter
wget https://github.com/prometheus-community/postgres_exporter/releases/download/v0.15.0/postgres_exporter-0.15.0.linux-amd64.tar.gz
tar xzf postgres_exporter-0.15.0.linux-amd64.tar.gz
sudo mv postgres_exporter-0.15.0.linux-amd64/postgres_exporter /usr/local/bin/

# Create systemd service
sudo tee /etc/systemd/system/postgres_exporter.service << EOF
[Unit]
Description=Prometheus PostgreSQL Exporter
After=network.target

[Service]
Type=simple
User=postgres
Environment="DATA_SOURCE_NAME=postgresql://postgres:SecurePostgresPassword123!@localhost:5432/postgres?sslmode=disable"
ExecStart=/usr/local/bin/postgres_exporter
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Start the exporter
sudo systemctl daemon-reload
sudo systemctl enable postgres_exporter
sudo systemctl start postgres_exporter
```

### Monitoring Script Example

Create a comprehensive monitoring script:

```bash
sudo tee /usr/local/bin/check-patroni-cluster.sh << 'EOF'
#!/bin/bash
# Patroni cluster health check script

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PATRONI_NODES=("192.168.1.101" "192.168.1.102" "192.168.1.103")
PATRONI_PORT=8008
MAX_LAG_BYTES=104857600  # 100MB

echo "=========================================="
echo "Patroni Cluster Health Check"
echo "Date: $(date)"
echo "=========================================="

# Check each node
for node in "${PATRONI_NODES[@]}"; do
    echo ""
    echo "Node: $node"
    echo "-------------------"

    # Check if Patroni API is responding
    response=$(curl -s -w "\n%{http_code}" "http://$node:$PATRONI_PORT/patroni" 2>/dev/null)
    http_code=$(echo "$response" | tail -1)
    json_data=$(echo "$response" | head -n -1)

    if [ "$http_code" != "200" ]; then
        echo -e "${RED}ERROR: Patroni API not responding (HTTP $http_code)${NC}"
        continue
    fi

    # Parse response
    role=$(echo "$json_data" | jq -r '.role')
    state=$(echo "$json_data" | jq -r '.state')
    timeline=$(echo "$json_data" | jq -r '.timeline')

    # Display status
    if [ "$role" = "master" ]; then
        echo -e "Role: ${GREEN}$role${NC}"
    else
        echo -e "Role: ${YELLOW}$role${NC}"
    fi

    if [ "$state" = "running" ]; then
        echo -e "State: ${GREEN}$state${NC}"
    else
        echo -e "State: ${RED}$state${NC}"
    fi

    echo "Timeline: $timeline"

    # Check replication lag for replicas
    if [ "$role" != "master" ]; then
        lag=$(echo "$json_data" | jq -r '.xlog.replayed_location // .xlog.received_location // "unknown"')
        echo "Replication position: $lag"
    fi
done

# Check overall cluster status
echo ""
echo "=========================================="
echo "Cluster Summary"
echo "=========================================="

cluster_info=$(curl -s "http://${PATRONI_NODES[0]}:$PATRONI_PORT/cluster" 2>/dev/null)
if [ $? -eq 0 ]; then
    members=$(echo "$cluster_info" | jq -r '.members | length')
    leader=$(echo "$cluster_info" | jq -r '.members[] | select(.role=="leader") | .name')

    echo "Total members: $members"
    echo -e "Current leader: ${GREEN}$leader${NC}"

    # Check for any lagging replicas
    lagging=$(echo "$cluster_info" | jq -r ".members[] | select(.lag > $MAX_LAG_BYTES) | .name")
    if [ -n "$lagging" ]; then
        echo -e "${YELLOW}Warning: Lagging replicas detected: $lagging${NC}"
    else
        echo -e "${GREEN}All replicas are within acceptable lag${NC}"
    fi
else
    echo -e "${RED}ERROR: Could not retrieve cluster information${NC}"
fi

echo ""
EOF

sudo chmod +x /usr/local/bin/check-patroni-cluster.sh
```

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: Patroni Fails to Start

**Symptoms**: Patroni service fails to start, no PostgreSQL process running.

**Diagnosis**:
```bash
# Check Patroni logs
sudo journalctl -u patroni -f

# Check for configuration errors
patroni --validate-config /etc/patroni/patroni.yml
```

**Common causes and solutions**:

```bash
# 1. Permission issues
sudo chown -R postgres:postgres /var/lib/patroni
sudo chown -R postgres:postgres /etc/patroni
sudo chmod 600 /etc/patroni/patroni.yml

# 2. etcd connectivity
etcdctl endpoint health

# 3. Port conflicts
sudo netstat -tlnp | grep -E "5432|8008"

# 4. Data directory issues
sudo rm -rf /var/lib/patroni/data  # Warning: deletes all data
sudo systemctl restart patroni
```

#### Issue 2: Split-Brain Scenario

**Symptoms**: Multiple nodes claim to be the leader.

**Diagnosis**:
```bash
patronictl -c /etc/patroni/patroni.yml list
```

**Solution**:
```bash
# 1. Stop Patroni on all nodes
sudo systemctl stop patroni  # Run on all nodes

# 2. Clear etcd cluster state
etcdctl del /db/postgres-cluster --prefix

# 3. Start Patroni on one node first
sudo systemctl start patroni  # Run on one node

# 4. Wait for initialization, then start other nodes
sudo systemctl start patroni  # Run on other nodes
```

#### Issue 3: Replica Not Streaming

**Symptoms**: Replica shows "unknown" or "stopped" state.

**Diagnosis**:
```bash
# Check replication status on primary
psql -U postgres -c "SELECT * FROM pg_stat_replication;"

# Check PostgreSQL logs on replica
sudo tail -f /var/log/postgresql/postgresql-*.log
```

**Solution**:
```bash
# Reinitialize the replica
patronictl -c /etc/patroni/patroni.yml reinit postgres-cluster pg-node2

# Or manually resync
sudo systemctl stop patroni
sudo rm -rf /var/lib/patroni/data
sudo systemctl start patroni
```

#### Issue 4: etcd Cluster Unhealthy

**Symptoms**: Patroni cannot connect to etcd, cluster state unknown.

**Diagnosis**:
```bash
# Check etcd cluster health
etcdctl endpoint health --endpoints=http://192.168.1.101:2379,http://192.168.1.102:2379,http://192.168.1.103:2379

# Check etcd logs
sudo journalctl -u etcd -f
```

**Solution**:
```bash
# If single etcd node is down, restart it
sudo systemctl restart etcd

# If etcd cluster is corrupted, you may need to rebuild
# Warning: This will lose cluster state
sudo systemctl stop etcd
sudo rm -rf /var/lib/etcd/default
sudo systemctl start etcd
```

#### Issue 5: Failover Not Happening

**Symptoms**: Primary is down but no failover occurs.

**Diagnosis**:
```bash
# Check if there are healthy replicas
patronictl -c /etc/patroni/patroni.yml list

# Check replica lag
curl -s http://192.168.1.102:8008/patroni | jq
```

**Common causes**:

1. **All replicas have too much lag**: Check `maximum_lag_on_failover` setting
2. **No quorum in etcd**: At least 2 of 3 etcd nodes must be healthy
3. **Replicas tagged with nofailover**: Check tags in patroni.yml

**Solution**:
```bash
# Force failover if needed (use with caution)
patronictl -c /etc/patroni/patroni.yml failover --force
```

### Useful Debugging Commands

```bash
# View Patroni logs in real-time
sudo journalctl -u patroni -f

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*.log

# View etcd data for Patroni
etcdctl get /db/postgres-cluster --prefix --print-value-only | jq

# Check network connectivity
nc -zv 192.168.1.101 5432
nc -zv 192.168.1.101 8008
nc -zv 192.168.1.101 2379

# Verify PostgreSQL is running
sudo -u postgres pg_isready -h localhost -p 5432

# Check system resources
htop
df -h /var/lib/patroni

# View Patroni process
ps aux | grep patroni
```

### Recovery Procedures

#### Complete Cluster Recovery

If the entire cluster needs to be rebuilt:

```bash
# 1. Stop Patroni on all nodes
sudo systemctl stop patroni  # All nodes

# 2. Stop etcd on all nodes
sudo systemctl stop etcd  # All nodes

# 3. Clear etcd data on all nodes
sudo rm -rf /var/lib/etcd/default  # All nodes

# 4. Clear Patroni data on all nodes
sudo rm -rf /var/lib/patroni/data  # All nodes

# 5. Start etcd on all nodes simultaneously
sudo systemctl start etcd  # All nodes

# 6. Verify etcd is healthy
etcdctl endpoint health

# 7. Start Patroni on one node first
sudo systemctl start patroni  # First node only

# 8. Wait for initialization, then start other nodes
sudo systemctl start patroni  # Other nodes
```

## Best Practices

### Security Recommendations

1. **Use strong passwords**: Generate random passwords for all database users
2. **Enable SSL/TLS**: Configure PostgreSQL and Patroni to use encrypted connections
3. **Restrict network access**: Use firewalls to limit access to database ports
4. **Use separate networks**: Place etcd traffic on a dedicated management network
5. **Regular password rotation**: Implement a policy for rotating database passwords

### Performance Tuning

1. **Tune PostgreSQL parameters**: Adjust memory settings based on available RAM
2. **Use SSDs**: Place data directories on fast SSD storage
3. **Monitor lag**: Set up alerts for replication lag
4. **Right-size TTL**: Balance between fast failover and false positives

### Operational Recommendations

1. **Document procedures**: Create runbooks for common operations
2. **Practice failovers**: Regularly test failover procedures
3. **Monitor backups**: Verify backup completion and test restores
4. **Keep software updated**: Apply security patches promptly
5. **Capacity planning**: Monitor growth and plan for scaling

## Monitoring Your Cluster with OneUptime

While Patroni provides built-in health checks and the REST API for monitoring, production environments benefit greatly from comprehensive monitoring solutions that can provide alerting, historical data, and dashboards.

[OneUptime](https://oneuptime.com) is an excellent choice for monitoring your PostgreSQL Patroni cluster. It offers:

- **Uptime Monitoring**: Monitor the health of each Patroni node's REST API endpoint to ensure your cluster is accessible
- **Custom Health Checks**: Create custom monitors that check the `/leader` and `/replica` endpoints to track cluster topology
- **Alerting**: Receive instant notifications via email, SMS, Slack, or PagerDuty when failovers occur or nodes become unhealthy
- **Status Pages**: Create public or private status pages showing the health of your database infrastructure
- **Incident Management**: Built-in incident management to track and resolve database issues
- **On-Call Scheduling**: Ensure the right team members are notified during database emergencies
- **Performance Metrics**: Track response times and availability metrics over time
- **Log Management**: Centralize logs from all Patroni nodes for easier troubleshooting

To monitor your Patroni cluster with OneUptime, you can:

1. Create HTTP monitors for each node's Patroni REST API (port 8008)
2. Set up monitors for the HAProxy endpoints (ports 5000 and 5001)
3. Configure alerts for when replication lag exceeds thresholds
4. Build dashboards showing cluster health at a glance

By combining Patroni's automatic failover capabilities with OneUptime's comprehensive monitoring, you ensure that your PostgreSQL cluster remains highly available and that you are immediately notified of any issues that require attention.

## Conclusion

You have now set up a production-ready PostgreSQL Patroni cluster on Ubuntu with:

- A three-node etcd cluster for distributed consensus
- PostgreSQL with Patroni for automatic failover
- HAProxy for connection routing and load balancing
- Backup integration with pgBackRest
- Comprehensive monitoring and health checks

This configuration provides high availability, automatic failover, and the tools needed to maintain a healthy database cluster. Remember to regularly test your failover procedures, monitor your cluster health, and keep your systems updated.

For additional resources, refer to:
- [Patroni Documentation](https://patroni.readthedocs.io/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [etcd Documentation](https://etcd.io/docs/)
- [HAProxy Documentation](https://www.haproxy.org/documentation/)
