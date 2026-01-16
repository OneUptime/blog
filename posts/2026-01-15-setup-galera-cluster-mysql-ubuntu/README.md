# How to Set Up Galera Cluster for MySQL on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Galera, MySQL, MariaDB, Cluster, High Availability, Tutorial

Description: Complete guide to setting up Galera Cluster for MySQL/MariaDB multi-master replication on Ubuntu.

---

## Introduction

Galera Cluster is a synchronous multi-master replication plugin for MySQL and MariaDB databases. It provides true multi-master topology, allowing read and write operations on any node while maintaining data consistency across all cluster members. This guide walks you through setting up a production-ready Galera Cluster on Ubuntu servers.

## Understanding Galera Cluster

### What is Galera Cluster?

Galera Cluster implements synchronous replication using a certification-based approach. Unlike traditional MySQL replication (which is asynchronous), Galera ensures that all nodes have the same data at any given moment.

### Key Features

- **Synchronous Replication**: All nodes are guaranteed to have the same data
- **Multi-Master Topology**: Read and write to any node
- **Automatic Node Provisioning**: New nodes automatically sync with the cluster
- **No Slave Lag**: No replication delay between nodes
- **Automatic Membership Control**: Failed nodes are automatically removed
- **True Parallel Replication**: Transactions are applied in parallel across nodes

### How It Works

1. A client sends a write transaction to any node
2. The node broadcasts the transaction to all other nodes (writeset)
3. Each node certifies the transaction against pending transactions
4. If certification passes, the transaction is committed on all nodes
5. If certification fails, the transaction is rolled back

### Architecture Overview

```
                    ┌─────────────────┐
                    │   Application   │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │    HAProxy      │
                    │  Load Balancer  │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼───────┐   ┌───────▼───────┐   ┌───────▼───────┐
│    Node 1     │◄──►    Node 2     │◄──►    Node 3     │
│  (MariaDB +   │   │  (MariaDB +   │   │  (MariaDB +   │
│    Galera)    │   │    Galera)    │   │    Galera)    │
└───────────────┘   └───────────────┘   └───────────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                    Galera Replication
```

## Prerequisites

### Hardware Requirements

For a production Galera Cluster, you need:

- **Minimum 3 nodes** (odd number recommended for quorum)
- **2+ CPU cores** per node
- **4GB+ RAM** per node (8GB+ recommended)
- **SSD storage** for optimal performance
- **Low-latency network** (< 1ms between nodes ideal)

### Network Requirements

| Node | Hostname | IP Address | Role |
|------|----------|------------|------|
| 1 | galera-node1 | 192.168.1.101 | Primary Bootstrap |
| 2 | galera-node2 | 192.168.1.102 | Cluster Member |
| 3 | galera-node3 | 192.168.1.103 | Cluster Member |

### Required Ports

Open these ports between all cluster nodes:

```bash
# Galera Cluster requires these ports:
# - 3306: MySQL client connections
# - 4567: Galera Cluster replication traffic (TCP and UDP)
# - 4568: Incremental State Transfer (IST)
# - 4444: State Snapshot Transfer (SST)
```

### Update Hosts File

Run this on ALL nodes:

```bash
# Edit the hosts file on each node
sudo nano /etc/hosts

# Add the following entries (adjust IPs to match your environment)
192.168.1.101   galera-node1
192.168.1.102   galera-node2
192.168.1.103   galera-node3
```

### Configure Firewall

Run on ALL nodes:

```bash
# Allow MySQL client connections
sudo ufw allow 3306/tcp

# Allow Galera replication traffic (TCP)
sudo ufw allow 4567/tcp

# Allow Galera replication traffic (UDP for multicast)
sudo ufw allow 4567/udp

# Allow Incremental State Transfer (IST)
sudo ufw allow 4568/tcp

# Allow State Snapshot Transfer (SST)
sudo ufw allow 4444/tcp

# Reload firewall rules
sudo ufw reload

# Verify the rules are active
sudo ufw status verbose
```

## Installing MariaDB with Galera

MariaDB includes Galera Cluster support by default. Run these commands on ALL nodes.

### Step 1: Update System Packages

```bash
# Update package lists and upgrade existing packages
sudo apt update && sudo apt upgrade -y
```

### Step 2: Install MariaDB Server

```bash
# Install MariaDB server (includes Galera support)
# The galera-4 package provides the Galera replication plugin
sudo apt install -y mariadb-server mariadb-client galera-4

# Verify MariaDB installation
mariadb --version
# Expected output: mariadb  Ver 15.1 Distrib 10.11.x-MariaDB...
```

### Step 3: Secure MariaDB Installation

```bash
# Run the security script to set root password and remove test databases
sudo mysql_secure_installation

# Follow the prompts:
# - Enter current password for root: (press Enter for none)
# - Switch to unix_socket authentication: n
# - Change the root password: Y (set a strong password)
# - Remove anonymous users: Y
# - Disallow root login remotely: Y (for production)
# - Remove test database: Y
# - Reload privilege tables: Y
```

### Step 4: Stop MariaDB Service

```bash
# Stop MariaDB before configuring Galera
# The cluster will be started differently using galera_new_cluster
sudo systemctl stop mariadb
```

## Galera Configuration

Create the Galera configuration file on each node with node-specific settings.

### Node 1 Configuration (galera-node1)

```bash
# Create Galera configuration file on Node 1
sudo nano /etc/mysql/mariadb.conf.d/60-galera.cnf
```

Add the following content:

```ini
#
# Galera Cluster Configuration for Node 1 (galera-node1)
# This file configures MariaDB to participate in a Galera Cluster
#

[mysqld]
# ============================================
# Basic Galera Settings
# ============================================

# Enable binary logging (required for some SST methods)
binlog_format=ROW

# Use InnoDB as the default storage engine (required by Galera)
default_storage_engine=InnoDB

# Disable InnoDB auto-increment locking for better Galera performance
# Mode 2 allows concurrent inserts for better throughput
innodb_autoinc_lock_mode=2

# Allow server to accept connections from any IP
bind-address=0.0.0.0

# ============================================
# Galera Provider Configuration
# ============================================

# Load the Galera replication provider library
wsrep_on=ON
wsrep_provider=/usr/lib/galera/libgalera_smm.so

# ============================================
# Galera Cluster Configuration
# ============================================

# Cluster connection string - list ALL node IPs
# Format: gcomm://node1_ip,node2_ip,node3_ip
# Empty gcomm:// is used only for initial cluster bootstrap
wsrep_cluster_address=gcomm://192.168.1.101,192.168.1.102,192.168.1.103

# Cluster name - must be identical on all nodes
wsrep_cluster_name=galera_cluster

# ============================================
# Galera Node Configuration
# ============================================

# Unique node name within the cluster
wsrep_node_name=galera-node1

# IP address of this node for cluster communication
wsrep_node_address=192.168.1.101

# ============================================
# State Snapshot Transfer (SST) Configuration
# ============================================

# SST method: rsync is simple and fast
# Alternatives: mariabackup (non-blocking), mysqldump
wsrep_sst_method=rsync

# ============================================
# Performance Tuning
# ============================================

# Number of threads for applying writesets in parallel
# Set to 2-4x the number of CPU cores
wsrep_slave_threads=4

# Log conflicts during certification (useful for debugging)
wsrep_log_conflicts=ON

# Format for logging wsrep information
wsrep_provider_options="gcache.size=512M; gcache.recover=yes"

# ============================================
# InnoDB Settings for Galera
# ============================================

# Flush logs at each transaction commit (required for durability)
innodb_flush_log_at_trx_commit=2

# Buffer pool size (set to 50-70% of available RAM)
innodb_buffer_pool_size=1G

# Log file size (larger = better write performance, longer recovery)
innodb_log_file_size=256M

# Disable doublewrite buffer (Galera provides its own protection)
innodb_doublewrite=1
```

### Node 2 Configuration (galera-node2)

```bash
# Create Galera configuration file on Node 2
sudo nano /etc/mysql/mariadb.conf.d/60-galera.cnf
```

```ini
#
# Galera Cluster Configuration for Node 2 (galera-node2)
#

[mysqld]
binlog_format=ROW
default_storage_engine=InnoDB
innodb_autoinc_lock_mode=2
bind-address=0.0.0.0

# Galera Provider
wsrep_on=ON
wsrep_provider=/usr/lib/galera/libgalera_smm.so

# Cluster Configuration
wsrep_cluster_address=gcomm://192.168.1.101,192.168.1.102,192.168.1.103
wsrep_cluster_name=galera_cluster

# Node Configuration - CHANGE THESE VALUES FOR EACH NODE
wsrep_node_name=galera-node2
wsrep_node_address=192.168.1.102

# SST Configuration
wsrep_sst_method=rsync

# Performance Settings
wsrep_slave_threads=4
wsrep_log_conflicts=ON
wsrep_provider_options="gcache.size=512M; gcache.recover=yes"

# InnoDB Settings
innodb_flush_log_at_trx_commit=2
innodb_buffer_pool_size=1G
innodb_log_file_size=256M
innodb_doublewrite=1
```

### Node 3 Configuration (galera-node3)

```bash
# Create Galera configuration file on Node 3
sudo nano /etc/mysql/mariadb.conf.d/60-galera.cnf
```

```ini
#
# Galera Cluster Configuration for Node 3 (galera-node3)
#

[mysqld]
binlog_format=ROW
default_storage_engine=InnoDB
innodb_autoinc_lock_mode=2
bind-address=0.0.0.0

# Galera Provider
wsrep_on=ON
wsrep_provider=/usr/lib/galera/libgalera_smm.so

# Cluster Configuration
wsrep_cluster_address=gcomm://192.168.1.101,192.168.1.102,192.168.1.103
wsrep_cluster_name=galera_cluster

# Node Configuration - CHANGE THESE VALUES FOR EACH NODE
wsrep_node_name=galera-node3
wsrep_node_address=192.168.1.103

# SST Configuration
wsrep_sst_method=rsync

# Performance Settings
wsrep_slave_threads=4
wsrep_log_conflicts=ON
wsrep_provider_options="gcache.size=512M; gcache.recover=yes"

# InnoDB Settings
innodb_flush_log_at_trx_commit=2
innodb_buffer_pool_size=1G
innodb_log_file_size=256M
innodb_doublewrite=1
```

## Bootstrapping the Cluster

Bootstrapping initializes the cluster and should only be done once on one node.

### Step 1: Bootstrap First Node

On **galera-node1** only:

```bash
# Bootstrap the cluster (creates a new cluster with this node as primary)
# This command should ONLY be run on one node, and ONLY when starting a new cluster
sudo galera_new_cluster

# Verify MariaDB is running
sudo systemctl status mariadb

# Check if Galera is active
mysql -u root -p -e "SHOW STATUS LIKE 'wsrep_cluster_size';"
# Expected output: wsrep_cluster_size = 1
```

### Step 2: Verify Cluster Status on Node 1

```bash
# Connect to MariaDB and check cluster status
mysql -u root -p

# Run these queries to verify Galera is working:
```

```sql
-- Check cluster size (should be 1 initially)
SHOW STATUS LIKE 'wsrep_cluster_size';

-- Check if this node is ready to accept queries
SHOW STATUS LIKE 'wsrep_ready';
-- Expected: ON

-- Check node state (should be 'Synced')
SHOW STATUS LIKE 'wsrep_local_state_comment';
-- Expected: Synced

-- View cluster UUID (unique identifier for this cluster)
SHOW STATUS LIKE 'wsrep_cluster_state_uuid';
```

## Adding Nodes to the Cluster

After the first node is bootstrapped, add remaining nodes one at a time.

### Step 1: Start Node 2

On **galera-node2**:

```bash
# Start MariaDB normally (it will automatically join the cluster)
sudo systemctl start mariadb

# Check if the node joined successfully
mysql -u root -p -e "SHOW STATUS LIKE 'wsrep_cluster_size';"
# Expected: wsrep_cluster_size = 2
```

### Step 2: Start Node 3

On **galera-node3**:

```bash
# Start MariaDB to join the cluster
sudo systemctl start mariadb

# Verify all three nodes are in the cluster
mysql -u root -p -e "SHOW STATUS LIKE 'wsrep_cluster_size';"
# Expected: wsrep_cluster_size = 3
```

### Step 3: Verify Complete Cluster

Run on any node:

```bash
# Check full cluster status
mysql -u root -p -e "SHOW STATUS LIKE 'wsrep%';" | grep -E 'wsrep_cluster_size|wsrep_cluster_status|wsrep_ready|wsrep_connected|wsrep_local_state_comment'
```

Expected output:

```
wsrep_cluster_size      3
wsrep_cluster_status    Primary
wsrep_connected         ON
wsrep_local_state_comment   Synced
wsrep_ready             ON
```

### Test Replication

```bash
# On Node 1: Create a test database
mysql -u root -p -e "CREATE DATABASE galera_test; USE galera_test; CREATE TABLE test (id INT AUTO_INCREMENT PRIMARY KEY, data VARCHAR(100)); INSERT INTO test (data) VALUES ('Hello from Node 1');"

# On Node 2: Verify data exists
mysql -u root -p -e "SELECT * FROM galera_test.test;"

# On Node 3: Add more data
mysql -u root -p -e "INSERT INTO galera_test.test (data) VALUES ('Hello from Node 3');"

# On Node 1: Verify all data is synchronized
mysql -u root -p -e "SELECT * FROM galera_test.test;"
```

## HAProxy Load Balancing

HAProxy distributes database connections across all cluster nodes for high availability.

### Install HAProxy

On a separate server or one of the nodes:

```bash
# Install HAProxy
sudo apt install -y haproxy
```

### Create MySQL Health Check User

Run on any Galera node:

```sql
-- Create a user for HAProxy health checks
-- This user will be used by HAProxy to verify node availability
CREATE USER 'haproxy_check'@'%' IDENTIFIED BY '';
GRANT USAGE ON *.* TO 'haproxy_check'@'%';
FLUSH PRIVILEGES;
```

### Configure HAProxy

```bash
# Backup original configuration
sudo cp /etc/haproxy/haproxy.cfg /etc/haproxy/haproxy.cfg.backup

# Edit HAProxy configuration
sudo nano /etc/haproxy/haproxy.cfg
```

Add the following configuration:

```ini
#---------------------------------------------------------------------
# HAProxy Configuration for Galera Cluster
#---------------------------------------------------------------------

global
    # Logging configuration
    log /dev/log local0
    log /dev/log local1 notice

    # Run as haproxy user
    user haproxy
    group haproxy

    # Run as daemon
    daemon

    # Maximum connections
    maxconn 4096

    # Stats socket for runtime API
    stats socket /var/run/haproxy.sock mode 660 level admin

defaults
    # Use global log settings
    log     global

    # Default mode for MySQL/MariaDB
    mode    tcp

    # Logging options
    option  tcplog
    option  dontlognull

    # Timeouts
    timeout connect 10s
    timeout client  30m
    timeout server  30m

    # Retry settings
    retries 3

#---------------------------------------------------------------------
# Statistics Page (Optional but recommended)
#---------------------------------------------------------------------
listen stats
    # Stats page accessible at http://haproxy-ip:8080/stats
    bind *:8080
    mode http
    stats enable
    stats uri /stats
    stats realm HAProxy\ Statistics
    stats auth admin:your_secure_password
    stats refresh 30s

#---------------------------------------------------------------------
# Galera Cluster Frontend - Write Traffic
# Sends all writes to a single node to avoid conflicts
#---------------------------------------------------------------------
frontend galera_cluster_frontend
    # Listen on standard MySQL port
    bind *:3306
    mode tcp
    default_backend galera_cluster_backend

#---------------------------------------------------------------------
# Galera Cluster Backend - All Nodes
# Round-robin load balancing across all nodes
#---------------------------------------------------------------------
backend galera_cluster_backend
    mode tcp

    # Load balancing algorithm
    # roundrobin: distributes evenly (best for read-heavy workloads)
    # leastconn: sends to server with fewest connections
    balance roundrobin

    # Health check using MySQL protocol
    option mysql-check user haproxy_check

    # Galera cluster nodes
    # Format: server <name> <ip>:<port> check weight <n>
    # - check: enables health checking
    # - weight: relative weight for load balancing
    # - inter: health check interval in milliseconds
    # - rise: number of successful checks to consider server up
    # - fall: number of failed checks to consider server down
    server galera-node1 192.168.1.101:3306 check weight 1 inter 5000 rise 2 fall 3
    server galera-node2 192.168.1.102:3306 check weight 1 inter 5000 rise 2 fall 3
    server galera-node3 192.168.1.103:3306 check weight 1 inter 5000 rise 2 fall 3

#---------------------------------------------------------------------
# Galera Single-Writer Backend (Alternative)
# Use this for write-heavy workloads to avoid conflicts
#---------------------------------------------------------------------
# backend galera_single_writer
#     mode tcp
#     balance first
#     option mysql-check user haproxy_check
#
#     # First available server receives all writes
#     # backup servers only used when primary fails
#     server galera-node1 192.168.1.101:3306 check
#     server galera-node2 192.168.1.102:3306 check backup
#     server galera-node3 192.168.1.103:3306 check backup

#---------------------------------------------------------------------
# Galera Read-Only Backend (Optional)
# Separate backend for read-only queries
#---------------------------------------------------------------------
frontend galera_readonly_frontend
    bind *:3307
    mode tcp
    default_backend galera_readonly_backend

backend galera_readonly_backend
    mode tcp
    balance leastconn
    option mysql-check user haproxy_check

    server galera-node1 192.168.1.101:3306 check weight 1
    server galera-node2 192.168.1.102:3306 check weight 1
    server galera-node3 192.168.1.103:3306 check weight 1
```

### Start HAProxy

```bash
# Validate configuration syntax
sudo haproxy -c -f /etc/haproxy/haproxy.cfg

# Start HAProxy
sudo systemctl start haproxy
sudo systemctl enable haproxy

# Check status
sudo systemctl status haproxy
```

### Test HAProxy Connection

```bash
# Connect through HAProxy (replace with your HAProxy IP)
mysql -h haproxy-server-ip -u your_user -p -e "SELECT @@hostname;"

# Access HAProxy stats page
# Open in browser: http://haproxy-server-ip:8080/stats
```

## SST Methods (State Snapshot Transfer)

SST is used when a new node joins or when a node is too far behind to use IST (Incremental State Transfer).

### Method 1: rsync (Default)

**Pros**: Simple, fast, no additional tools needed
**Cons**: Donor node is READ-ONLY during transfer

```ini
# In 60-galera.cnf
wsrep_sst_method=rsync
```

### Method 2: mariabackup (Recommended for Production)

**Pros**: Non-blocking, donor remains available
**Cons**: Requires additional packages

#### Installation

```bash
# Install mariabackup on ALL nodes
sudo apt install -y mariadb-backup
```

#### Configuration

```bash
# Edit Galera configuration
sudo nano /etc/mysql/mariadb.conf.d/60-galera.cnf
```

```ini
# Change SST method to mariabackup
wsrep_sst_method=mariabackup

# SST authentication (required for mariabackup)
# Create this user in MySQL first
wsrep_sst_auth=sst_user:sst_password
```

#### Create SST User

```sql
-- Create user for SST operations
CREATE USER 'sst_user'@'localhost' IDENTIFIED BY 'sst_password';

-- Grant required privileges for mariabackup
GRANT RELOAD, LOCK TABLES, PROCESS, REPLICATION CLIENT ON *.* TO 'sst_user'@'localhost';

-- For MariaDB 10.5+, also grant:
GRANT BINLOG MONITOR ON *.* TO 'sst_user'@'localhost';

FLUSH PRIVILEGES;
```

### Method 3: mysqldump

**Pros**: Compatible with any MySQL setup
**Cons**: Slow for large databases, donor is READ-ONLY

```ini
wsrep_sst_method=mysqldump
wsrep_sst_auth=sst_user:sst_password
```

### SST Comparison Table

| Method | Blocking | Speed | Disk Space | Best For |
|--------|----------|-------|------------|----------|
| rsync | Yes | Fast | 1x | Small databases |
| mariabackup | No | Fast | 2x | Production |
| mysqldump | Yes | Slow | 1x | Compatibility |

## Monitoring Cluster Status

### Essential Galera Status Variables

```sql
-- Comprehensive cluster status check
-- Run this regularly or create a monitoring script

-- Cluster size (number of nodes)
SHOW STATUS LIKE 'wsrep_cluster_size';

-- Cluster state (Primary = healthy)
SHOW STATUS LIKE 'wsrep_cluster_status';

-- Node ready to accept queries
SHOW STATUS LIKE 'wsrep_ready';

-- Node connected to cluster
SHOW STATUS LIKE 'wsrep_connected';

-- Node state (Synced = fully synchronized)
SHOW STATUS LIKE 'wsrep_local_state_comment';

-- Replication queue length (should be low)
SHOW STATUS LIKE 'wsrep_local_recv_queue';

-- Send queue length (should be low)
SHOW STATUS LIKE 'wsrep_local_send_queue';

-- Flow control pauses (high = performance issue)
SHOW STATUS LIKE 'wsrep_flow_control_paused';

-- Certification conflicts (indicates write conflicts)
SHOW STATUS LIKE 'wsrep_local_cert_failures';
```

### Monitoring Script

Create a monitoring script:

```bash
#!/bin/bash
#
# Galera Cluster Health Check Script
# Run: chmod +x galera_health_check.sh && ./galera_health_check.sh
#

# Database credentials
MYSQL_USER="root"
MYSQL_PASS="your_password"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "Galera Cluster Health Check"
echo "Date: $(date)"
echo "=========================================="

# Function to get MySQL status variable
get_status() {
    mysql -u$MYSQL_USER -p$MYSQL_PASS -N -e "SHOW STATUS LIKE '$1';" 2>/dev/null | awk '{print $2}'
}

# Check cluster size
CLUSTER_SIZE=$(get_status 'wsrep_cluster_size')
echo -n "Cluster Size: "
if [ "$CLUSTER_SIZE" -ge 3 ]; then
    echo -e "${GREEN}$CLUSTER_SIZE${NC}"
elif [ "$CLUSTER_SIZE" -ge 2 ]; then
    echo -e "${YELLOW}$CLUSTER_SIZE (WARNING: Below optimal)${NC}"
else
    echo -e "${RED}$CLUSTER_SIZE (CRITICAL: Single node!)${NC}"
fi

# Check cluster status
CLUSTER_STATUS=$(get_status 'wsrep_cluster_status')
echo -n "Cluster Status: "
if [ "$CLUSTER_STATUS" = "Primary" ]; then
    echo -e "${GREEN}$CLUSTER_STATUS${NC}"
else
    echo -e "${RED}$CLUSTER_STATUS (NOT PRIMARY!)${NC}"
fi

# Check node ready state
NODE_READY=$(get_status 'wsrep_ready')
echo -n "Node Ready: "
if [ "$NODE_READY" = "ON" ]; then
    echo -e "${GREEN}$NODE_READY${NC}"
else
    echo -e "${RED}$NODE_READY${NC}"
fi

# Check node state
NODE_STATE=$(get_status 'wsrep_local_state_comment')
echo -n "Node State: "
if [ "$NODE_STATE" = "Synced" ]; then
    echo -e "${GREEN}$NODE_STATE${NC}"
else
    echo -e "${YELLOW}$NODE_STATE${NC}"
fi

# Check receive queue
RECV_QUEUE=$(get_status 'wsrep_local_recv_queue')
echo -n "Receive Queue: "
if [ "$RECV_QUEUE" -le 10 ]; then
    echo -e "${GREEN}$RECV_QUEUE${NC}"
else
    echo -e "${YELLOW}$RECV_QUEUE (High - possible lag)${NC}"
fi

# Check flow control
FLOW_CONTROL=$(get_status 'wsrep_flow_control_paused')
echo -n "Flow Control Paused: "
# Convert to percentage
FC_PERCENT=$(echo "$FLOW_CONTROL * 100" | bc 2>/dev/null || echo "0")
if (( $(echo "$FLOW_CONTROL < 0.01" | bc -l) )); then
    echo -e "${GREEN}${FC_PERCENT}%${NC}"
else
    echo -e "${YELLOW}${FC_PERCENT}% (Performance impact)${NC}"
fi

# Check certification failures
CERT_FAILURES=$(get_status 'wsrep_local_cert_failures')
echo -n "Certification Failures: "
echo -e "$CERT_FAILURES"

echo "=========================================="
```

### Using pt-heartbeat for Lag Monitoring

```bash
# Install Percona Toolkit
sudo apt install -y percona-toolkit

# Create heartbeat table
pt-heartbeat --database=galera_monitor --create-table --update --daemonize

# Monitor replication lag
pt-heartbeat --database=galera_monitor --monitor
```

## Split-Brain Prevention

Split-brain occurs when the cluster partitions and each partition believes it's the primary. Galera uses quorum-based voting to prevent this.

### Understanding Quorum

- Cluster needs **majority of nodes** (> 50%) to form quorum
- 3-node cluster: needs 2 nodes for quorum
- 5-node cluster: needs 3 nodes for quorum
- Without quorum, nodes reject queries to prevent data inconsistency

### Configuring Quorum Settings

```ini
# In 60-galera.cnf - add to wsrep_provider_options

wsrep_provider_options="
    # Size of the write-set cache
    gcache.size=512M;

    # Enable gcache recovery after crash
    gcache.recover=yes;

    # Protocol version (auto-negotiated)
    # pc.version=3;

    # Wait for quorum on startup
    pc.wait_prim=yes;

    # Bootstrap only with this many nodes (0 = disabled)
    pc.bootstrap=0;

    # Weight of this node in voting (default: 1)
    pc.weight=1;

    # Enable automatic eviction of inactive nodes
    evs.auto_evict=1;

    # Inactive timeout before eviction (in seconds)
    evs.inactive_timeout=PT15S;

    # Suspect timeout (in seconds)
    evs.suspect_timeout=PT5S;

    # Consensus timeout
    evs.consensus_timeout=PT30S
"
```

### Handling Network Partitions

If a partition occurs:

```bash
# Check if node is in non-Primary state
mysql -u root -p -e "SHOW STATUS LIKE 'wsrep_cluster_status';"

# If wsrep_cluster_status = 'Non-Primary', the node lost quorum
# DO NOT force bootstrap unless you're sure other partitions won't recover

# Safe recovery procedure:
# 1. Identify which partition has the most recent data
# 2. On ALL nodes in the minority partition, stop MariaDB:
sudo systemctl stop mariadb

# 3. Wait for network to recover
# 4. Restart nodes - they will rejoin automatically:
sudo systemctl start mariadb
```

### Arbitrator Node (garbd)

For even-numbered clusters or geo-distributed setups, use an arbitrator:

```bash
# Install Galera arbitrator
sudo apt install -y galera-arbitrator-4

# Configure arbitrator (on a separate lightweight server)
sudo nano /etc/default/garbd
```

```ini
# Galera Arbitrator Configuration
GALERA_NODES="192.168.1.101:4567,192.168.1.102:4567,192.168.1.103:4567"
GALERA_GROUP="galera_cluster"
GALERA_OPTIONS="--cfg /etc/garbd.cnf"
LOG_FILE="/var/log/garbd.log"
```

```bash
# Start arbitrator
sudo systemctl start garbd
sudo systemctl enable garbd
```

## Backup Strategies

### Method 1: mariabackup (Recommended)

```bash
#!/bin/bash
#
# Galera Cluster Backup Script using mariabackup
# Creates a full backup without locking tables
#

# Configuration
BACKUP_DIR="/var/backups/mysql"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="${BACKUP_DIR}/full_backup_${DATE}"
MYSQL_USER="backup_user"
MYSQL_PASS="backup_password"

# Create backup directory
mkdir -p "$BACKUP_PATH"

echo "Starting full backup at $(date)"

# Create full backup
# --galera-info: saves Galera position for PITR
# --slave-info: saves replication position
mariabackup --backup \
    --target-dir="$BACKUP_PATH" \
    --user="$MYSQL_USER" \
    --password="$MYSQL_PASS" \
    --galera-info

# Check if backup succeeded
if [ $? -eq 0 ]; then
    echo "Backup completed successfully at $(date)"

    # Prepare the backup (apply logs)
    echo "Preparing backup..."
    mariabackup --prepare --target-dir="$BACKUP_PATH"

    # Compress backup
    echo "Compressing backup..."
    tar -czvf "${BACKUP_PATH}.tar.gz" -C "$BACKUP_DIR" "full_backup_${DATE}"
    rm -rf "$BACKUP_PATH"

    # Remove backups older than 7 days
    find "$BACKUP_DIR" -name "full_backup_*.tar.gz" -mtime +7 -delete

    echo "Backup archived: ${BACKUP_PATH}.tar.gz"
else
    echo "Backup FAILED at $(date)"
    exit 1
fi
```

### Method 2: mysqldump for Logical Backups

```bash
#!/bin/bash
#
# Logical backup using mysqldump
# Good for smaller databases and cross-platform restores
#

BACKUP_DIR="/var/backups/mysql/logical"
DATE=$(date +%Y%m%d_%H%M%S)
MYSQL_USER="backup_user"
MYSQL_PASS="backup_password"

mkdir -p "$BACKUP_DIR"

echo "Starting mysqldump backup at $(date)"

# Full logical backup with Galera position
mysqldump \
    --user="$MYSQL_USER" \
    --password="$MYSQL_PASS" \
    --all-databases \
    --single-transaction \
    --routines \
    --triggers \
    --events \
    --master-data=2 \
    --flush-logs \
    | gzip > "${BACKUP_DIR}/dump_${DATE}.sql.gz"

if [ $? -eq 0 ]; then
    echo "Logical backup completed: ${BACKUP_DIR}/dump_${DATE}.sql.gz"
else
    echo "Backup FAILED"
    exit 1
fi
```

### Restore from Backup

```bash
#!/bin/bash
#
# Restore Galera node from mariabackup
# WARNING: This will DESTROY existing data!
#

BACKUP_FILE="/var/backups/mysql/full_backup_20260115_020000.tar.gz"
RESTORE_DIR="/var/backups/mysql/restore_temp"
MYSQL_DATA="/var/lib/mysql"

# Stop MariaDB
sudo systemctl stop mariadb

# Extract backup
mkdir -p "$RESTORE_DIR"
tar -xzvf "$BACKUP_FILE" -C "$RESTORE_DIR"
BACKUP_DIR=$(ls -d ${RESTORE_DIR}/full_backup_*)

# Prepare backup if not already prepared
mariabackup --prepare --target-dir="$BACKUP_DIR"

# Remove existing data directory
sudo rm -rf "${MYSQL_DATA}/*"

# Restore backup
mariabackup --copy-back --target-dir="$BACKUP_DIR"

# Fix permissions
sudo chown -R mysql:mysql "$MYSQL_DATA"

# Start MariaDB
sudo systemctl start mariadb

# Clean up
rm -rf "$RESTORE_DIR"

echo "Restore completed. Verify with: mysql -e 'SHOW STATUS LIKE \"wsrep%\"'"
```

### Backup Schedule with Cron

```bash
# Edit crontab
sudo crontab -e

# Add these entries:
# Full backup every day at 2 AM
0 2 * * * /usr/local/bin/galera_backup.sh >> /var/log/galera_backup.log 2>&1

# Incremental backup every 6 hours
0 */6 * * * /usr/local/bin/galera_incremental_backup.sh >> /var/log/galera_backup.log 2>&1
```

## Troubleshooting

### Problem: Node Cannot Join Cluster

**Symptoms**: Node stays in "Joining" state or fails to start

```bash
# Check error logs
sudo tail -100 /var/log/mysql/error.log

# Common causes and solutions:

# 1. SST failure - check donor node
mysql -u root -p -e "SHOW STATUS LIKE 'wsrep_local_state_comment';"

# 2. Firewall blocking ports
sudo ufw status
sudo iptables -L -n | grep -E '3306|4567|4568|4444'

# 3. Wrong cluster address
grep wsrep_cluster_address /etc/mysql/mariadb.conf.d/60-galera.cnf

# 4. Grastate file issue - check safe_to_bootstrap
cat /var/lib/mysql/grastate.dat

# If safe_to_bootstrap: 0 and you need to force bootstrap:
# WARNING: Only do this if you're SURE no other node has newer data!
sudo sed -i 's/safe_to_bootstrap: 0/safe_to_bootstrap: 1/' /var/lib/mysql/grastate.dat
```

### Problem: Cluster Won't Bootstrap After Full Shutdown

```bash
# Find node with most recent seqno (sequence number)
# Run on each node:
cat /var/lib/mysql/grastate.dat

# Example output:
# version: 2.1
# uuid:    abc123...
# seqno:   15847
# safe_to_bootstrap: 0

# Bootstrap from node with HIGHEST seqno:
# 1. Edit grastate.dat on that node
sudo nano /var/lib/mysql/grastate.dat
# Change: safe_to_bootstrap: 0 -> safe_to_bootstrap: 1

# 2. Bootstrap cluster
sudo galera_new_cluster

# 3. Start other nodes normally
# On other nodes:
sudo systemctl start mariadb
```

### Problem: High wsrep_local_recv_queue

**Symptoms**: Replication lag, slow queries

```bash
# Check queue length
mysql -e "SHOW STATUS LIKE 'wsrep_local_recv_queue%';"

# Solutions:

# 1. Increase slave threads
# In 60-galera.cnf:
wsrep_slave_threads=8  # Increase based on CPU cores

# 2. Enable parallel applying
wsrep_provider_options="... gcs.fc_limit=256; gcs.fc_factor=0.9 ..."

# 3. Check slow queries on this node
mysql -e "SHOW PROCESSLIST;"

# 4. Optimize large transactions (split into smaller batches)
```

### Problem: Flow Control Paused Too High

**Symptoms**: Writes are slow, wsrep_flow_control_paused > 0.01

```bash
# Check flow control status
mysql -e "SHOW STATUS LIKE 'wsrep_flow_control%';"

# Causes:
# - Slow node in cluster
# - Network latency between nodes
# - Disk I/O bottleneck

# Solutions:

# 1. Identify slow node
mysql -e "SHOW STATUS LIKE 'wsrep_local_recv_queue';"

# 2. Increase gcache size for better IST
wsrep_provider_options="gcache.size=1G; ..."

# 3. Tune flow control parameters
wsrep_provider_options="
    gcs.fc_limit=500;
    gcs.fc_factor=1.0;
    gcs.fc_master_slave=yes
"
```

### Problem: Certification Failures

**Symptoms**: High wsrep_local_cert_failures, transaction rollbacks

```sql
-- Check certification failures
SHOW STATUS LIKE 'wsrep_local_cert_failures';
SHOW STATUS LIKE 'wsrep_local_bf_aborts';

-- Causes:
-- - Multiple nodes writing to same rows
-- - Hot spots in data
-- - Missing primary keys

-- Solutions:

-- 1. Ensure all tables have PRIMARY KEY
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema NOT IN ('mysql', 'information_schema', 'performance_schema')
AND table_type = 'BASE TABLE'
AND table_name NOT IN (
    SELECT table_name
    FROM information_schema.statistics
    WHERE index_name = 'PRIMARY'
);

-- 2. Use single-writer topology for write-heavy workloads
-- Configure HAProxy to send writes to single node

-- 3. Implement retry logic in application
```

### Problem: Deadlocks and Lock Wait Timeouts

```sql
-- Check for deadlocks
SHOW ENGINE INNODB STATUS\G

-- Galera-specific: check for BF (Brute Force) aborts
SHOW STATUS LIKE 'wsrep_local_bf_aborts';

-- Solutions:
-- 1. Keep transactions small
-- 2. Access tables in consistent order
-- 3. Increase lock wait timeout
SET GLOBAL innodb_lock_wait_timeout = 120;

-- 4. Add retry logic in application code
```

### Useful Diagnostic Commands

```bash
# Complete status dump
mysql -e "SHOW STATUS LIKE 'wsrep%';" > /tmp/galera_status.txt

# Check error log for Galera messages
sudo grep -i "wsrep\|galera" /var/log/mysql/error.log | tail -50

# Network connectivity test
for node in 192.168.1.101 192.168.1.102 192.168.1.103; do
    echo "Testing $node:"
    nc -zv $node 4567 2>&1
    nc -zv $node 4568 2>&1
    nc -zv $node 4444 2>&1
done

# Check cluster communication
mysql -e "SELECT * FROM information_schema.WSREP_MEMBERSHIP;"
mysql -e "SELECT * FROM information_schema.WSREP_STATUS;"
```

## Best Practices Summary

### Configuration Best Practices

1. **Always use odd number of nodes** (3, 5, 7) for proper quorum
2. **Use SSDs** for database storage
3. **Keep nodes in same datacenter** or use dedicated low-latency links
4. **Set appropriate gcache.size** based on write volume
5. **Use mariabackup SST** for production environments

### Operational Best Practices

1. **Never bootstrap if cluster might be running** elsewhere
2. **Monitor wsrep_cluster_size** continuously
3. **Test failover scenarios** regularly
4. **Keep backups** on external storage
5. **Document your runbooks** for common issues

### Application Best Practices

1. **All tables must have PRIMARY KEY**
2. **Avoid large transactions** (< 1GB writeset)
3. **Implement retry logic** for certification failures
4. **Use connection pooling** with HAProxy
5. **Set appropriate timeouts** in application

## Monitoring with OneUptime

For production Galera Cluster deployments, comprehensive monitoring is essential. [OneUptime](https://oneuptime.com) provides an all-in-one observability platform that can help you monitor your Galera Cluster effectively:

- **Database Monitoring**: Track Galera-specific metrics like cluster size, replication lag, flow control pauses, and certification failures
- **Infrastructure Monitoring**: Monitor CPU, memory, disk I/O, and network latency across all cluster nodes
- **Alerting**: Set up intelligent alerts for cluster size changes, node failures, high replication queue, or split-brain conditions
- **Uptime Monitoring**: Configure health checks for your HAProxy endpoints and individual database nodes
- **Status Pages**: Create public or private status pages to communicate cluster health to stakeholders
- **Incident Management**: Automatically create incidents when cluster issues are detected and track resolution
- **Log Management**: Centralize MariaDB error logs from all nodes for easier troubleshooting
- **Dashboards**: Build custom dashboards displaying all critical Galera metrics in real-time

By integrating OneUptime with your Galera Cluster, you can proactively identify issues before they impact your applications and maintain high availability for your database infrastructure.
