# How to Install and Secure MongoDB for Production on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, MongoDB, Database, Security, Production

Description: A complete guide to installing, configuring, and securing MongoDB for production workloads on Ubuntu.

---

MongoDB is one of the most popular NoSQL databases, offering flexibility, scalability, and high performance for modern applications. However, deploying MongoDB in production requires careful attention to security, high availability, and operational best practices. This comprehensive guide walks you through installing MongoDB from the official repository, configuring authentication and authorization, setting up replica sets for high availability, and implementing backup and monitoring strategies.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Installing MongoDB from Official Repository](#installing-mongodb-from-official-repository)
4. [Initial Security Configuration](#initial-security-configuration)
5. [Authentication and Authorization Setup](#authentication-and-authorization-setup)
6. [Replica Set Configuration](#replica-set-configuration)
7. [Network Security and Firewall Configuration](#network-security-and-firewall-configuration)
8. [TLS/SSL Encryption](#tlsssl-encryption)
9. [Backup Strategies](#backup-strategies)
10. [Monitoring and Alerting](#monitoring-and-alerting)
11. [Performance Tuning](#performance-tuning)
12. [Operational Best Practices](#operational-best-practices)
13. [Troubleshooting Common Issues](#troubleshooting-common-issues)

## Architecture Overview

Before diving into the installation, let's understand the architecture we'll be building. A production-ready MongoDB deployment typically consists of a replica set with multiple nodes for high availability, proper authentication, encrypted communications, and comprehensive monitoring.

```mermaid
graph TB
    subgraph "Production MongoDB Architecture"
        subgraph "Application Layer"
            APP1[Application Server 1]
            APP2[Application Server 2]
            APP3[Application Server 3]
        end

        subgraph "MongoDB Replica Set"
            PRIMARY[(Primary Node<br/>Read/Write)]
            SECONDARY1[(Secondary Node 1<br/>Read Only)]
            SECONDARY2[(Secondary Node 2<br/>Read Only)]
            ARBITER[Arbiter Node<br/>Voting Only]
        end

        subgraph "Security Layer"
            FW[Firewall/UFW]
            TLS[TLS/SSL Encryption]
            AUTH[Authentication<br/>SCRAM-SHA-256]
        end

        subgraph "Operations"
            BACKUP[Backup System<br/>mongodump/Snapshots]
            MONITOR[Monitoring<br/>Prometheus/Grafana]
            LOGS[Log Aggregation<br/>ELK/Loki]
        end

        APP1 --> FW
        APP2 --> FW
        APP3 --> FW
        FW --> TLS
        TLS --> AUTH
        AUTH --> PRIMARY

        PRIMARY <--> SECONDARY1
        PRIMARY <--> SECONDARY2
        PRIMARY <--> ARBITER
        SECONDARY1 <--> SECONDARY2

        PRIMARY --> BACKUP
        PRIMARY --> MONITOR
        PRIMARY --> LOGS
        SECONDARY1 --> MONITOR
        SECONDARY2 --> MONITOR
    end
```

The diagram above shows a typical production MongoDB setup with:
- A three-node replica set (one primary, two secondaries) plus an arbiter
- Application servers connecting through security layers
- Backup, monitoring, and logging infrastructure

## Prerequisites

Before installing MongoDB, ensure your Ubuntu server meets the following requirements:

- Ubuntu 20.04 LTS, 22.04 LTS, or 24.04 LTS
- Minimum 4 GB RAM (8 GB or more recommended for production)
- Sufficient disk space with fast storage (SSD recommended)
- Root or sudo access
- Properly configured hostname and network

Let's verify the system requirements and prepare the server:

```bash
# Check Ubuntu version - MongoDB 7.0 supports Ubuntu 20.04, 22.04, and 24.04
lsb_release -a

# Check available memory - minimum 4GB recommended for production
free -h

# Check available disk space - ensure sufficient space for data and logs
df -h

# Check the number of CPU cores - more cores improve query performance
nproc

# Ensure the system clock is synchronized - critical for replica sets
timedatectl status
```

Set up proper system limits for MongoDB performance:

```bash
# Create a new limits configuration file for MongoDB
# These settings increase the number of open files and processes
# that MongoDB can use, which is essential for production workloads
sudo tee /etc/security/limits.d/mongodb.conf << 'EOF'
# MongoDB process limits
# nofile: Maximum number of open file descriptors
# nproc: Maximum number of processes
mongod soft nofile 64000
mongod hard nofile 64000
mongod soft nproc 64000
mongod hard nproc 64000
EOF

# Disable Transparent Huge Pages (THP) which can cause latency issues
# MongoDB recommends disabling THP for consistent performance
sudo tee /etc/systemd/system/disable-thp.service << 'EOF'
[Unit]
Description=Disable Transparent Huge Pages (THP)
DefaultDependencies=no
After=sysinit.target local-fs.target
Before=mongod.service

[Service]
Type=oneshot
ExecStart=/bin/sh -c 'echo never | tee /sys/kernel/mm/transparent_hugepage/enabled > /dev/null'
ExecStart=/bin/sh -c 'echo never | tee /sys/kernel/mm/transparent_hugepage/defrag > /dev/null'

[Install]
WantedBy=basic.target
EOF

# Enable and start the THP disable service
sudo systemctl daemon-reload
sudo systemctl enable disable-thp
sudo systemctl start disable-thp
```

## Installing MongoDB from Official Repository

Always install MongoDB from the official MongoDB repository to get the latest security patches and features. The packages in Ubuntu's default repository may be outdated.

```bash
# Import the MongoDB public GPG key
# This key is used to verify the authenticity of MongoDB packages
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg \
   --dearmor

# Add the MongoDB repository to the sources list
# Replace 'jammy' with your Ubuntu codename (focal for 20.04, noble for 24.04)
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
   sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Update the package database to include MongoDB packages
sudo apt-get update

# Install the MongoDB package and associated tools
# mongodb-org is a metapackage that includes:
# - mongodb-org-server: The mongod daemon
# - mongodb-org-mongos: The mongos routing service for sharded clusters
# - mongodb-org-shell: The mongosh interactive shell
# - mongodb-org-tools: Utilities like mongodump, mongorestore, etc.
sudo apt-get install -y mongodb-org

# Prevent MongoDB packages from being automatically upgraded
# This ensures you can control when updates are applied in production
echo "mongodb-org hold" | sudo dpkg --set-selections
echo "mongodb-org-database hold" | sudo dpkg --set-selections
echo "mongodb-org-server hold" | sudo dpkg --set-selections
echo "mongodb-org-mongos hold" | sudo dpkg --set-selections
echo "mongodb-org-tools hold" | sudo dpkg --set-selections
```

Verify the installation and start MongoDB:

```bash
# Check the installed MongoDB version
mongod --version

# Start the MongoDB service
sudo systemctl start mongod

# Enable MongoDB to start automatically on system boot
sudo systemctl enable mongod

# Verify that MongoDB is running properly
sudo systemctl status mongod

# Test the connection to MongoDB using the shell
mongosh --eval "db.runCommand({connectionStatus: 1})"
```

## Initial Security Configuration

By default, MongoDB binds to localhost and has no authentication enabled. This is extremely insecure. Let's configure the basic security settings:

```bash
# Create a backup of the original configuration file
sudo cp /etc/mongod.conf /etc/mongod.conf.backup

# Create the directory for MongoDB data with proper permissions
# This directory should be owned by the mongodb user
sudo mkdir -p /var/lib/mongodb
sudo chown -R mongodb:mongodb /var/lib/mongodb
sudo chmod 750 /var/lib/mongodb

# Create the directory for MongoDB logs
sudo mkdir -p /var/log/mongodb
sudo chown -R mongodb:mongodb /var/log/mongodb
sudo chmod 750 /var/log/mongodb
```

Now, let's create a production-ready MongoDB configuration file:

```bash
# Create a secure MongoDB configuration file
# This configuration enables security features and optimizes for production
sudo tee /etc/mongod.conf << 'EOF'
# MongoDB Configuration File for Production
# Documentation: https://docs.mongodb.com/manual/reference/configuration-options/

# Storage configuration
storage:
  # Path where MongoDB stores data files
  dbPath: /var/lib/mongodb

  # Enable journaling for data durability
  # Journal ensures data integrity in case of crashes
  journal:
    enabled: true

  # WiredTiger is the default and recommended storage engine
  wiredTiger:
    engineConfig:
      # Cache size should be ~50% of RAM minus 1GB, or 256MB minimum
      # For a 16GB server, set to about 7GB
      cacheSizeGB: 4

      # Enable journal compression to save disk space
      journalCompressor: snappy

    collectionConfig:
      # Compress collection data to save disk space
      blockCompressor: snappy

    indexConfig:
      # Prefix compression reduces index size
      prefixCompression: true

# Network configuration
net:
  # Port MongoDB listens on (default: 27017)
  port: 27017

  # Bind to localhost only initially
  # Change to specific IPs or 0.0.0.0 when configuring replica sets
  bindIp: 127.0.0.1

  # Maximum number of simultaneous connections
  maxIncomingConnections: 65536

  # Enable IPv6 support
  ipv6: false

# Process management
processManagement:
  # Run as a daemon in the background
  fork: false

  # Location of the process ID file
  pidFilePath: /var/run/mongodb/mongod.pid

  # Time zone for log timestamps
  timeZoneInfo: /usr/share/zoneinfo

# System logging configuration
systemLog:
  # Send logs to a file
  destination: file

  # Path to the log file
  path: /var/log/mongodb/mongod.log

  # Append to existing log file on restart
  logAppend: true

  # Rotate logs when they reach a certain size
  logRotate: reopen

  # Log verbosity (0-5, higher is more verbose)
  verbosity: 0

  # Component-specific log levels
  component:
    accessControl:
      verbosity: 1
    command:
      verbosity: 0

# Security configuration
security:
  # Enable role-based access control
  # IMPORTANT: Create admin user BEFORE enabling this
  authorization: disabled

  # Path to the keyfile for replica set authentication
  # Uncomment after creating the keyfile
  # keyFile: /etc/mongodb/mongodb-keyfile

# Operation profiling for performance monitoring
operationProfiling:
  # Profile slow operations only
  mode: slowOp

  # Threshold in milliseconds for slow operations
  slowOpThresholdMs: 100

# Replication configuration (for replica sets)
# Uncomment when setting up replica sets
# replication:
#   replSetName: rs0
#   oplogSizeMB: 2048

# Sharding configuration (for sharded clusters)
# Uncomment when setting up sharding
# sharding:
#   clusterRole: shardsvr
EOF

# Restart MongoDB to apply the new configuration
sudo systemctl restart mongod

# Verify MongoDB is running with the new configuration
sudo systemctl status mongod
```

## Authentication and Authorization Setup

Enabling authentication is critical for production security. MongoDB uses role-based access control (RBAC) to manage user permissions.

```mermaid
flowchart TB
    subgraph "MongoDB Authentication Flow"
        CLIENT[Client Application]
        AUTH_REQ[Authentication Request]
        SCRAM[SCRAM-SHA-256<br/>Authentication]
        RBAC[Role-Based Access Control]

        subgraph "Built-in Roles"
            READ[read]
            RW[readWrite]
            DBADMIN[dbAdmin]
            USERADMIN[userAdmin]
            CLUSTERADMIN[clusterAdmin]
            ROOT[root]
        end

        subgraph "Database Resources"
            ADMIN_DB[(admin)]
            APP_DB[(application)]
            LOGS_DB[(logs)]
        end

        CLIENT --> AUTH_REQ
        AUTH_REQ --> SCRAM
        SCRAM --> RBAC
        RBAC --> READ
        RBAC --> RW
        RBAC --> DBADMIN
        RBAC --> USERADMIN
        RBAC --> CLUSTERADMIN
        RBAC --> ROOT

        READ --> APP_DB
        RW --> APP_DB
        DBADMIN --> APP_DB
        ROOT --> ADMIN_DB
        ROOT --> APP_DB
        ROOT --> LOGS_DB
    end
```

First, create the administrative user before enabling authentication:

```bash
# Connect to MongoDB without authentication (only works initially)
mongosh << 'EOF'
// Switch to the admin database where system users are stored
use admin

// Create the root administrator user
// This user has full control over all databases
// IMPORTANT: Use a strong, unique password in production!
db.createUser({
  user: "mongoAdmin",
  pwd: "CHANGE_THIS_TO_A_STRONG_PASSWORD",
  roles: [
    { role: "root", db: "admin" }
  ],
  mechanisms: ["SCRAM-SHA-256"],
  passwordDigestor: "server"
})

// Create a user administrator for managing other users
// This follows the principle of least privilege
db.createUser({
  user: "userAdmin",
  pwd: "CHANGE_THIS_TO_ANOTHER_STRONG_PASSWORD",
  roles: [
    { role: "userAdminAnyDatabase", db: "admin" },
    { role: "readWriteAnyDatabase", db: "admin" }
  ],
  mechanisms: ["SCRAM-SHA-256"]
})

// Create a cluster administrator for replica set management
db.createUser({
  user: "clusterAdmin",
  pwd: "CHANGE_THIS_PASSWORD_TOO",
  roles: [
    { role: "clusterAdmin", db: "admin" }
  ],
  mechanisms: ["SCRAM-SHA-256"]
})

// Verify the users were created
db.getUsers()
EOF
```

Create application-specific users with minimal required permissions:

```bash
# Connect as the admin user to create application users
mongosh -u mongoAdmin -p 'CHANGE_THIS_TO_A_STRONG_PASSWORD' --authenticationDatabase admin << 'EOF'
// Create a database for your application
use myapp

// Create a read-write user for the application
// This user can only access the 'myapp' database
db.createUser({
  user: "appUser",
  pwd: "APPLICATION_PASSWORD_HERE",
  roles: [
    { role: "readWrite", db: "myapp" }
  ],
  mechanisms: ["SCRAM-SHA-256"]
})

// Create a read-only user for reporting/analytics
// This user cannot modify data, only read it
db.createUser({
  user: "reportUser",
  pwd: "REPORTING_PASSWORD_HERE",
  roles: [
    { role: "read", db: "myapp" }
  ],
  mechanisms: ["SCRAM-SHA-256"]
})

// Create a user for backups with minimal required permissions
use admin
db.createUser({
  user: "backupUser",
  pwd: "BACKUP_PASSWORD_HERE",
  roles: [
    { role: "backup", db: "admin" },
    { role: "restore", db: "admin" }
  ],
  mechanisms: ["SCRAM-SHA-256"]
})

// Create a monitoring user for Prometheus/Grafana integration
db.createUser({
  user: "monitoringUser",
  pwd: "MONITORING_PASSWORD_HERE",
  roles: [
    { role: "clusterMonitor", db: "admin" },
    { role: "read", db: "local" }
  ],
  mechanisms: ["SCRAM-SHA-256"]
})

print("All application users created successfully!")
EOF
```

Now enable authentication in the MongoDB configuration:

```bash
# Update the MongoDB configuration to enable authentication
sudo sed -i 's/authorization: disabled/authorization: enabled/' /etc/mongod.conf

# Restart MongoDB to apply authentication settings
sudo systemctl restart mongod

# Verify MongoDB is running with authentication enabled
sudo systemctl status mongod

# Test authentication by connecting with the admin user
mongosh -u mongoAdmin -p 'CHANGE_THIS_TO_A_STRONG_PASSWORD' \
  --authenticationDatabase admin \
  --eval "db.adminCommand({connectionStatus: 1})"
```

## Replica Set Configuration

A replica set provides high availability and data redundancy. In production, you should always run MongoDB as a replica set with at least three data-bearing nodes.

```mermaid
sequenceDiagram
    participant C as Client
    participant P as Primary
    participant S1 as Secondary 1
    participant S2 as Secondary 2

    Note over P,S2: Normal Operation
    C->>P: Write Operation
    P->>P: Apply Write
    P->>S1: Replicate (Oplog)
    P->>S2: Replicate (Oplog)
    S1->>P: Acknowledgment
    S2->>P: Acknowledgment
    P->>C: Write Confirmed (w:majority)

    Note over P,S2: Failover Scenario
    P->>P: Primary Fails
    S1->>S2: Election Vote
    S2->>S1: Election Vote
    S1->>S1: Becomes Primary
    C->>S1: Reconnect to New Primary
```

First, create a keyfile for internal authentication between replica set members:

```bash
# Generate a random keyfile for replica set authentication
# This key must be identical on all replica set members
openssl rand -base64 756 | sudo tee /etc/mongodb/mongodb-keyfile > /dev/null

# Set restrictive permissions on the keyfile
# MongoDB requires the keyfile to be readable only by the mongodb user
sudo chmod 400 /etc/mongodb/mongodb-keyfile
sudo chown mongodb:mongodb /etc/mongodb/mongodb-keyfile

# Copy this keyfile to all other replica set members
# Use scp or another secure method to transfer the file
# Example: scp /etc/mongodb/mongodb-keyfile user@secondary1:/tmp/
```

Update the MongoDB configuration on each node for replica set operation:

```bash
# Configuration for the PRIMARY node (mongo-primary)
# Each node needs slightly different bindIp settings
sudo tee /etc/mongod.conf << 'EOF'
# MongoDB Replica Set Configuration - Primary Node

storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true
  wiredTiger:
    engineConfig:
      cacheSizeGB: 4
      journalCompressor: snappy
    collectionConfig:
      blockCompressor: snappy
    indexConfig:
      prefixCompression: true

net:
  port: 27017
  # Bind to both localhost and the server's private IP
  # Replace with your actual server IPs
  bindIp: 127.0.0.1,192.168.1.10
  maxIncomingConnections: 65536

processManagement:
  fork: false
  pidFilePath: /var/run/mongodb/mongod.pid
  timeZoneInfo: /usr/share/zoneinfo

systemLog:
  destination: file
  path: /var/log/mongodb/mongod.log
  logAppend: true
  logRotate: reopen

security:
  authorization: enabled
  # Enable keyfile authentication for replica set members
  keyFile: /etc/mongodb/mongodb-keyfile

operationProfiling:
  mode: slowOp
  slowOpThresholdMs: 100

# Replica set configuration
replication:
  # Name of the replica set - must be identical on all members
  replSetName: rs0
  # Oplog size in MB - determines how much replication history is kept
  # Larger oplog allows secondaries to be offline longer before needing resync
  oplogSizeMB: 2048
EOF

# Restart MongoDB with the new configuration
sudo systemctl restart mongod
```

Initialize the replica set from the primary node:

```bash
# Connect to the primary node and initialize the replica set
mongosh -u mongoAdmin -p 'CHANGE_THIS_TO_A_STRONG_PASSWORD' \
  --authenticationDatabase admin << 'EOF'
// Initialize the replica set with configuration
// Replace IP addresses with your actual server addresses
rs.initiate({
  _id: "rs0",
  members: [
    {
      _id: 0,
      host: "192.168.1.10:27017",
      priority: 10,  // Higher priority = more likely to be primary
      tags: { dc: "dc1", role: "primary" }
    },
    {
      _id: 1,
      host: "192.168.1.11:27017",
      priority: 5,
      tags: { dc: "dc1", role: "secondary" }
    },
    {
      _id: 2,
      host: "192.168.1.12:27017",
      priority: 5,
      tags: { dc: "dc2", role: "secondary" }
    }
  ],
  settings: {
    // Number of seconds a member waits before seeking election
    electionTimeoutMillis: 10000,
    // How frequently members send heartbeat messages
    heartbeatIntervalMillis: 2000,
    // Write concern for configuration changes
    getLastErrorDefaults: {
      w: "majority",
      wtimeout: 5000
    }
  }
})

// Wait for the replica set to initialize
sleep(5000)

// Check the replica set status
rs.status()

// View the replica set configuration
rs.conf()

// Check which member is primary
rs.isMaster()
EOF
```

Configure read preferences for your application:

```bash
# Example of connecting with specific read preferences
mongosh -u appUser -p 'APPLICATION_PASSWORD_HERE' \
  --authenticationDatabase myapp \
  --host "rs0/192.168.1.10:27017,192.168.1.11:27017,192.168.1.12:27017" << 'EOF'
// Set read preference to read from secondary nodes
// This reduces load on the primary for read-heavy workloads
db.getMongo().setReadPref("secondaryPreferred")

// For the most up-to-date data, use primary (default)
db.getMongo().setReadPref("primary")

// Read from the nearest member based on latency
db.getMongo().setReadPref("nearest")

// Read from secondary in specific datacenter
db.getMongo().setReadPref("secondary", [{ dc: "dc2" }])

print("Read preference configured")
EOF
```

## Network Security and Firewall Configuration

Proper network security is essential to protect your MongoDB deployment from unauthorized access.

```bash
# Install and enable UFW (Uncomplicated Firewall)
sudo apt-get install -y ufw

# Set default policies - deny all incoming, allow all outgoing
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH access (important - don't lock yourself out!)
sudo ufw allow ssh

# Allow MongoDB port only from specific IP addresses
# Replace with your application server IPs
# This restricts MongoDB access to only authorized servers
sudo ufw allow from 192.168.1.0/24 to any port 27017 proto tcp comment 'MongoDB from internal network'

# Allow MongoDB port from specific application servers
sudo ufw allow from 10.0.0.100 to any port 27017 proto tcp comment 'MongoDB from app-server-1'
sudo ufw allow from 10.0.0.101 to any port 27017 proto tcp comment 'MongoDB from app-server-2'

# Allow replica set members to communicate with each other
sudo ufw allow from 192.168.1.10 to any port 27017 proto tcp comment 'MongoDB replica member 1'
sudo ufw allow from 192.168.1.11 to any port 27017 proto tcp comment 'MongoDB replica member 2'
sudo ufw allow from 192.168.1.12 to any port 27017 proto tcp comment 'MongoDB replica member 3'

# Enable the firewall
sudo ufw enable

# Check firewall status and rules
sudo ufw status verbose
```

Additional network security measures:

```bash
# Configure IP tables for additional security (optional, advanced)
# Block all external access to MongoDB port
sudo iptables -A INPUT -p tcp --dport 27017 -s 192.168.1.0/24 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 27017 -j DROP

# Save iptables rules to persist across reboots
sudo apt-get install -y iptables-persistent
sudo netfilter-persistent save

# Verify MongoDB is only listening on expected interfaces
sudo ss -tlnp | grep mongod

# Check for any unauthorized connection attempts in logs
sudo grep "connection accepted" /var/log/mongodb/mongod.log | tail -20
```

## TLS/SSL Encryption

Encrypting connections to MongoDB is critical for protecting data in transit. Here's how to set up TLS/SSL:

```bash
# Create a directory for MongoDB certificates
sudo mkdir -p /etc/mongodb/ssl
sudo chown mongodb:mongodb /etc/mongodb/ssl
sudo chmod 700 /etc/mongodb/ssl

# Generate a private key and certificate signing request (CSR)
# In production, use certificates from a trusted CA
sudo openssl req -newkey rsa:4096 -nodes \
  -keyout /etc/mongodb/ssl/mongodb.key \
  -out /etc/mongodb/ssl/mongodb.csr \
  -subj "/C=US/ST=State/L=City/O=Organization/OU=IT/CN=mongodb.example.com"

# For development/testing, create a self-signed certificate
# In production, submit the CSR to your CA and use the signed certificate
sudo openssl x509 -req -days 365 \
  -in /etc/mongodb/ssl/mongodb.csr \
  -signkey /etc/mongodb/ssl/mongodb.key \
  -out /etc/mongodb/ssl/mongodb.crt

# Combine key and certificate into a PEM file (required by MongoDB)
sudo cat /etc/mongodb/ssl/mongodb.key /etc/mongodb/ssl/mongodb.crt | \
  sudo tee /etc/mongodb/ssl/mongodb.pem > /dev/null

# Set proper permissions on the PEM file
sudo chmod 600 /etc/mongodb/ssl/mongodb.pem
sudo chown mongodb:mongodb /etc/mongodb/ssl/mongodb.pem

# Create a CA certificate file if using a certificate chain
# Copy your CA certificate to this location
sudo cp /path/to/ca-certificate.crt /etc/mongodb/ssl/ca.crt
sudo chmod 644 /etc/mongodb/ssl/ca.crt
```

Update MongoDB configuration to enable TLS:

```bash
# Add TLS configuration to mongod.conf
sudo tee -a /etc/mongod.conf << 'EOF'

# TLS/SSL Configuration
net:
  tls:
    # Enable TLS for all connections
    mode: requireTLS

    # Path to the combined key and certificate file
    certificateKeyFile: /etc/mongodb/ssl/mongodb.pem

    # Optional: Password for the certificate key file
    # certificateKeyFilePassword: your_password_here

    # Path to the CA certificate for client verification
    CAFile: /etc/mongodb/ssl/ca.crt

    # Allow connections from clients with invalid certificates (development only)
    # Set to true in production to require valid client certificates
    allowConnectionsWithoutCertificates: false

    # Allow invalid hostnames (development only, set to false in production)
    allowInvalidHostnames: false

    # Disable legacy SSL protocols
    disabledProtocols: TLS1_0,TLS1_1
EOF

# Restart MongoDB to apply TLS settings
sudo systemctl restart mongod

# Test TLS connection
mongosh --tls \
  --tlsCertificateKeyFile /etc/mongodb/ssl/client.pem \
  --tlsCAFile /etc/mongodb/ssl/ca.crt \
  --host mongodb.example.com \
  -u mongoAdmin -p 'CHANGE_THIS_TO_A_STRONG_PASSWORD' \
  --authenticationDatabase admin \
  --eval "db.adminCommand({connectionStatus: 1})"
```

## Backup Strategies

Implementing robust backup strategies is essential for disaster recovery. MongoDB provides several backup methods:

```mermaid
flowchart LR
    subgraph "Backup Strategies"
        subgraph "Logical Backup"
            MONGODUMP[mongodump]
            MONGORESTORE[mongorestore]
        end

        subgraph "Physical Backup"
            SNAPSHOT[Filesystem Snapshots]
            COPY[File Copy<br/>with fsyncLock]
        end

        subgraph "Continuous Backup"
            OPLOG[Oplog Backup]
            PITR[Point-in-Time<br/>Recovery]
        end

        subgraph "Storage"
            LOCAL[Local Storage]
            S3[S3/Object Storage]
            REMOTE[Remote Server]
        end

        MONGODUMP --> LOCAL
        MONGODUMP --> S3
        SNAPSHOT --> LOCAL
        SNAPSHOT --> REMOTE
        OPLOG --> PITR
        PITR --> S3
    end
```

Create a comprehensive backup script:

```bash
# Create a directory for backup scripts
sudo mkdir -p /opt/mongodb/scripts
sudo mkdir -p /opt/mongodb/backups

# Create a backup script with rotation and compression
sudo tee /opt/mongodb/scripts/mongodb-backup.sh << 'EOF'
#!/bin/bash

# MongoDB Backup Script
# This script performs logical backups using mongodump with compression
# and implements rotation to manage storage space

set -euo pipefail

# Configuration variables
BACKUP_DIR="/opt/mongodb/backups"
BACKUP_RETENTION_DAYS=7
MONGO_HOST="localhost"
MONGO_PORT="27017"
MONGO_USER="backupUser"
MONGO_PASSWORD="BACKUP_PASSWORD_HERE"
AUTH_DB="admin"
LOG_FILE="/var/log/mongodb/backup.log"

# AWS S3 configuration (optional)
S3_BUCKET="your-backup-bucket"
S3_PREFIX="mongodb-backups"
UPLOAD_TO_S3=false

# Create timestamp for backup filename
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="mongodb_backup_${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

# Function to log messages with timestamps
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

# Function to send alert on failure (customize as needed)
send_alert() {
    local message="$1"
    # Add your alerting mechanism here (email, Slack, PagerDuty, etc.)
    log_message "ALERT: ${message}"
}

# Function to perform the backup
perform_backup() {
    log_message "Starting MongoDB backup to ${BACKUP_PATH}"

    # Create backup directory
    mkdir -p "${BACKUP_PATH}"

    # Perform mongodump with authentication and compression
    # --oplog captures a point-in-time snapshot for replica sets
    mongodump \
        --host="${MONGO_HOST}" \
        --port="${MONGO_PORT}" \
        --username="${MONGO_USER}" \
        --password="${MONGO_PASSWORD}" \
        --authenticationDatabase="${AUTH_DB}" \
        --out="${BACKUP_PATH}" \
        --oplog \
        --gzip \
        2>&1 | tee -a "${LOG_FILE}"

    # Check if backup was successful
    if [ $? -eq 0 ]; then
        log_message "Backup completed successfully"

        # Create a compressed archive
        tar -czf "${BACKUP_PATH}.tar.gz" -C "${BACKUP_DIR}" "${BACKUP_NAME}"
        rm -rf "${BACKUP_PATH}"

        log_message "Backup compressed to ${BACKUP_PATH}.tar.gz"

        # Calculate and log backup size
        BACKUP_SIZE=$(du -h "${BACKUP_PATH}.tar.gz" | cut -f1)
        log_message "Backup size: ${BACKUP_SIZE}"

        return 0
    else
        send_alert "MongoDB backup failed!"
        return 1
    fi
}

# Function to upload backup to S3
upload_to_s3() {
    if [ "${UPLOAD_TO_S3}" = true ]; then
        log_message "Uploading backup to S3..."

        aws s3 cp "${BACKUP_PATH}.tar.gz" \
            "s3://${S3_BUCKET}/${S3_PREFIX}/${BACKUP_NAME}.tar.gz" \
            --storage-class STANDARD_IA

        if [ $? -eq 0 ]; then
            log_message "Backup uploaded to S3 successfully"
        else
            send_alert "Failed to upload backup to S3"
        fi
    fi
}

# Function to clean up old backups
cleanup_old_backups() {
    log_message "Cleaning up backups older than ${BACKUP_RETENTION_DAYS} days"

    # Remove local backups older than retention period
    find "${BACKUP_DIR}" -name "mongodb_backup_*.tar.gz" \
        -mtime +${BACKUP_RETENTION_DAYS} -delete

    # Clean up S3 backups (using lifecycle policies is recommended instead)
    if [ "${UPLOAD_TO_S3}" = true ]; then
        # List and delete old S3 backups
        CUTOFF_DATE=$(date -d "-${BACKUP_RETENTION_DAYS} days" +%Y-%m-%d)
        log_message "S3 cleanup: removing backups before ${CUTOFF_DATE}"
    fi

    log_message "Cleanup completed"
}

# Function to verify backup integrity
verify_backup() {
    log_message "Verifying backup integrity..."

    # Test that the archive can be extracted
    tar -tzf "${BACKUP_PATH}.tar.gz" > /dev/null 2>&1

    if [ $? -eq 0 ]; then
        log_message "Backup verification passed"
        return 0
    else
        send_alert "Backup verification failed - archive may be corrupted"
        return 1
    fi
}

# Main execution
main() {
    log_message "========================================="
    log_message "MongoDB Backup Script Started"
    log_message "========================================="

    perform_backup
    verify_backup
    upload_to_s3
    cleanup_old_backups

    log_message "Backup script completed"
    log_message "========================================="
}

# Run main function
main
EOF

# Make the script executable
sudo chmod +x /opt/mongodb/scripts/mongodb-backup.sh

# Set proper ownership
sudo chown -R mongodb:mongodb /opt/mongodb
```

Schedule automatic backups using cron:

```bash
# Create a cron job for daily backups at 2 AM
sudo tee /etc/cron.d/mongodb-backup << 'EOF'
# MongoDB Backup Schedule
# Run daily backup at 2:00 AM
0 2 * * * mongodb /opt/mongodb/scripts/mongodb-backup.sh >> /var/log/mongodb/backup-cron.log 2>&1

# Run hourly oplog backup for point-in-time recovery (optional)
0 * * * * mongodb /opt/mongodb/scripts/mongodb-oplog-backup.sh >> /var/log/mongodb/oplog-backup.log 2>&1
EOF

# Reload cron to apply changes
sudo systemctl reload cron
```

Create a restore script:

```bash
# Create a restore script
sudo tee /opt/mongodb/scripts/mongodb-restore.sh << 'EOF'
#!/bin/bash

# MongoDB Restore Script
# Usage: ./mongodb-restore.sh <backup_file.tar.gz> [database_name]

set -euo pipefail

BACKUP_FILE="$1"
TARGET_DB="${2:-}"  # Optional: restore only specific database
TEMP_DIR="/tmp/mongodb-restore-$$"
MONGO_HOST="localhost"
MONGO_PORT="27017"
MONGO_USER="backupUser"
MONGO_PASSWORD="BACKUP_PASSWORD_HERE"
AUTH_DB="admin"

log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

if [ -z "${BACKUP_FILE}" ]; then
    echo "Usage: $0 <backup_file.tar.gz> [database_name]"
    exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "Error: Backup file not found: ${BACKUP_FILE}"
    exit 1
fi

log_message "Starting MongoDB restore from ${BACKUP_FILE}"

# Create temporary directory for extraction
mkdir -p "${TEMP_DIR}"

# Extract the backup
log_message "Extracting backup archive..."
tar -xzf "${BACKUP_FILE}" -C "${TEMP_DIR}"

# Find the backup directory
BACKUP_DIR=$(find "${TEMP_DIR}" -maxdepth 1 -type d -name "mongodb_backup_*" | head -1)

if [ -z "${BACKUP_DIR}" ]; then
    log_message "Error: Could not find backup directory in archive"
    rm -rf "${TEMP_DIR}"
    exit 1
fi

# Perform the restore
log_message "Restoring MongoDB data..."

if [ -n "${TARGET_DB}" ]; then
    # Restore specific database
    mongorestore \
        --host="${MONGO_HOST}" \
        --port="${MONGO_PORT}" \
        --username="${MONGO_USER}" \
        --password="${MONGO_PASSWORD}" \
        --authenticationDatabase="${AUTH_DB}" \
        --db="${TARGET_DB}" \
        --gzip \
        --drop \
        "${BACKUP_DIR}/${TARGET_DB}"
else
    # Restore all databases with oplog replay
    mongorestore \
        --host="${MONGO_HOST}" \
        --port="${MONGO_PORT}" \
        --username="${MONGO_USER}" \
        --password="${MONGO_PASSWORD}" \
        --authenticationDatabase="${AUTH_DB}" \
        --gzip \
        --drop \
        --oplogReplay \
        "${BACKUP_DIR}"
fi

# Check restore status
if [ $? -eq 0 ]; then
    log_message "Restore completed successfully"
else
    log_message "Error: Restore failed"
    rm -rf "${TEMP_DIR}"
    exit 1
fi

# Clean up
rm -rf "${TEMP_DIR}"
log_message "Cleanup completed"
EOF

sudo chmod +x /opt/mongodb/scripts/mongodb-restore.sh
```

## Monitoring and Alerting

Comprehensive monitoring is essential for maintaining a healthy MongoDB deployment. Here's how to set up monitoring with Prometheus and Grafana:

```bash
# Install MongoDB Exporter for Prometheus
# Download the latest release
wget https://github.com/percona/mongodb_exporter/releases/download/v0.40.0/mongodb_exporter-0.40.0.linux-amd64.tar.gz

# Extract and install
tar -xzf mongodb_exporter-0.40.0.linux-amd64.tar.gz
sudo mv mongodb_exporter-0.40.0.linux-amd64/mongodb_exporter /usr/local/bin/

# Create a systemd service for the exporter
sudo tee /etc/systemd/system/mongodb-exporter.service << 'EOF'
[Unit]
Description=MongoDB Exporter for Prometheus
After=network.target mongod.service

[Service]
Type=simple
User=mongodb
Group=mongodb

# MongoDB connection URI with authentication
# Using the monitoring user we created earlier
Environment="MONGODB_URI=mongodb://monitoringUser:MONITORING_PASSWORD_HERE@localhost:27017/admin?authSource=admin"

# Exporter configuration
ExecStart=/usr/local/bin/mongodb_exporter \
    --web.listen-address=:9216 \
    --web.telemetry-path=/metrics \
    --collect-all \
    --compatible-mode

Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Start the MongoDB exporter
sudo systemctl daemon-reload
sudo systemctl enable mongodb-exporter
sudo systemctl start mongodb-exporter

# Verify the exporter is running
curl -s http://localhost:9216/metrics | head -20
```

Create a Prometheus configuration for MongoDB monitoring:

```yaml
# Add to your prometheus.yml configuration
# This scrape config collects metrics from MongoDB exporter
scrape_configs:
  - job_name: 'mongodb'
    static_configs:
      # List all MongoDB nodes in your replica set
      - targets:
        - 'mongo-primary:9216'
        - 'mongo-secondary1:9216'
        - 'mongo-secondary2:9216'
    # Relabel to add hostname for easier identification
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
        regex: '([^:]+):\d+'
        replacement: '${1}'
```

Create a monitoring script for health checks:

```bash
# Create a health check script for MongoDB
sudo tee /opt/mongodb/scripts/mongodb-healthcheck.sh << 'EOF'
#!/bin/bash

# MongoDB Health Check Script
# This script performs various health checks and outputs status

set -euo pipefail

MONGO_HOST="localhost"
MONGO_PORT="27017"
MONGO_USER="monitoringUser"
MONGO_PASSWORD="MONITORING_PASSWORD_HERE"
AUTH_DB="admin"

# Function to execute MongoDB commands
mongo_cmd() {
    mongosh --quiet \
        --host="${MONGO_HOST}" \
        --port="${MONGO_PORT}" \
        --username="${MONGO_USER}" \
        --password="${MONGO_PASSWORD}" \
        --authenticationDatabase="${AUTH_DB}" \
        --eval "$1"
}

echo "========================================="
echo "MongoDB Health Check Report"
echo "Timestamp: $(date)"
echo "========================================="

# Check if MongoDB is running
echo -e "\n[Service Status]"
if systemctl is-active --quiet mongod; then
    echo "MongoDB service: RUNNING"
else
    echo "MongoDB service: STOPPED"
    exit 1
fi

# Check replica set status
echo -e "\n[Replica Set Status]"
mongo_cmd '
    var status = rs.status();
    print("Replica Set Name: " + status.set);
    print("Number of Members: " + status.members.length);
    status.members.forEach(function(member) {
        print("  - " + member.name + ": " + member.stateStr +
              " (Health: " + (member.health === 1 ? "OK" : "FAILED") + ")");
    });
'

# Check server status and connections
echo -e "\n[Server Statistics]"
mongo_cmd '
    var status = db.serverStatus();
    print("Uptime: " + Math.floor(status.uptime / 86400) + " days, " +
          Math.floor((status.uptime % 86400) / 3600) + " hours");
    print("Current Connections: " + status.connections.current);
    print("Available Connections: " + status.connections.available);
    print("Total Connections Created: " + status.connections.totalCreated);
'

# Check memory usage
echo -e "\n[Memory Usage]"
mongo_cmd '
    var status = db.serverStatus();
    var wt = status.wiredTiger;
    print("Resident Memory: " + Math.round(status.mem.resident) + " MB");
    print("Virtual Memory: " + Math.round(status.mem.virtual) + " MB");
    print("WiredTiger Cache Used: " +
          Math.round(wt.cache["bytes currently in the cache"] / 1024 / 1024) + " MB");
    print("WiredTiger Cache Max: " +
          Math.round(wt.cache["maximum bytes configured"] / 1024 / 1024) + " MB");
'

# Check replication lag
echo -e "\n[Replication Lag]"
mongo_cmd '
    var status = rs.status();
    var primary = status.members.find(m => m.state === 1);
    if (primary) {
        var primaryOptime = primary.optimeDate;
        status.members.forEach(function(member) {
            if (member.state === 2) {  // Secondary
                var lag = (primaryOptime - member.optimeDate) / 1000;
                print(member.name + ": " + lag + " seconds");
            }
        });
    }
'

# Check for slow operations
echo -e "\n[Slow Operations (last 5)]"
mongo_cmd '
    var slowOps = db.currentOp({"secs_running": {$gt: 5}});
    if (slowOps.inprog.length > 0) {
        slowOps.inprog.slice(0, 5).forEach(function(op) {
            print("OpID: " + op.opid + ", Running: " + op.secs_running +
                  "s, Op: " + op.op);
        });
    } else {
        print("No slow operations detected");
    }
'

# Check database sizes
echo -e "\n[Database Sizes]"
mongo_cmd '
    var dbs = db.adminCommand({listDatabases: 1});
    dbs.databases.forEach(function(database) {
        print(database.name + ": " +
              Math.round(database.sizeOnDisk / 1024 / 1024) + " MB");
    });
    print("Total: " + Math.round(dbs.totalSize / 1024 / 1024) + " MB");
'

echo -e "\n========================================="
echo "Health check completed"
echo "========================================="
EOF

sudo chmod +x /opt/mongodb/scripts/mongodb-healthcheck.sh
```

Set up alerting rules for Prometheus:

```yaml
# MongoDB alerting rules for Prometheus
# Save as /etc/prometheus/rules/mongodb-alerts.yml
groups:
  - name: mongodb_alerts
    rules:
      # Alert when MongoDB is down
      - alert: MongoDBDown
        expr: mongodb_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "MongoDB instance is down"
          description: "MongoDB instance {{ $labels.instance }} has been down for more than 1 minute"

      # Alert on high connection usage
      - alert: MongoDBHighConnections
        expr: mongodb_ss_connections{conn_type="current"} / mongodb_ss_connections{conn_type="available"} > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "MongoDB connection usage is high"
          description: "MongoDB instance {{ $labels.instance }} is using {{ $value | humanizePercentage }} of available connections"

      # Alert on replication lag
      - alert: MongoDBReplicationLag
        expr: mongodb_mongod_replset_member_replication_lag > 30
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "MongoDB replication lag is high"
          description: "MongoDB secondary {{ $labels.instance }} has {{ $value }}s replication lag"

      # Alert when primary changes
      - alert: MongoDBPrimaryChanged
        expr: changes(mongodb_mongod_replset_member_state{state="PRIMARY"}[5m]) > 0
        labels:
          severity: warning
        annotations:
          summary: "MongoDB primary has changed"
          description: "MongoDB replica set has experienced a primary election"

      # Alert on low disk space
      - alert: MongoDBLowDiskSpace
        expr: (node_filesystem_avail_bytes{mountpoint="/var/lib/mongodb"} / node_filesystem_size_bytes{mountpoint="/var/lib/mongodb"}) < 0.15
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "MongoDB disk space is low"
          description: "MongoDB data directory has less than 15% disk space remaining"

      # Alert on high WiredTiger cache usage
      - alert: MongoDBHighCacheUsage
        expr: mongodb_ss_wt_cache_bytes_currently_in_the_cache / mongodb_ss_wt_cache_maximum_bytes_configured > 0.95
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "MongoDB WiredTiger cache usage is high"
          description: "MongoDB instance {{ $labels.instance }} WiredTiger cache is {{ $value | humanizePercentage }} full"
```

## Performance Tuning

Optimizing MongoDB performance requires attention to several areas including indexes, queries, and system configuration.

```bash
# Create a performance analysis script
sudo tee /opt/mongodb/scripts/mongodb-perf-analysis.sh << 'EOF'
#!/bin/bash

# MongoDB Performance Analysis Script
# Identifies potential performance issues and provides recommendations

MONGO_USER="mongoAdmin"
MONGO_PASSWORD="CHANGE_THIS_TO_A_STRONG_PASSWORD"
AUTH_DB="admin"

echo "MongoDB Performance Analysis"
echo "============================"

mongosh --quiet -u "${MONGO_USER}" -p "${MONGO_PASSWORD}" \
  --authenticationDatabase "${AUTH_DB}" << 'MONGOSCRIPT'

// Analyze all databases for performance issues
var dbs = db.adminCommand({listDatabases: 1}).databases;

dbs.forEach(function(database) {
    if (database.name === 'admin' || database.name === 'local' || database.name === 'config') {
        return;
    }

    print("\n========================================");
    print("Database: " + database.name);
    print("========================================");

    var targetDb = db.getSiblingDB(database.name);
    var collections = targetDb.getCollectionNames();

    collections.forEach(function(collName) {
        var coll = targetDb.getCollection(collName);
        var stats = coll.stats();

        print("\n  Collection: " + collName);
        print("  -----------");
        print("  Document Count: " + stats.count);
        print("  Size: " + Math.round(stats.size / 1024 / 1024) + " MB");
        print("  Index Size: " + Math.round(stats.totalIndexSize / 1024 / 1024) + " MB");

        // Check for missing indexes
        var indexes = coll.getIndexes();
        print("  Indexes: " + indexes.length);

        // Analyze index usage
        var indexStats = coll.aggregate([{$indexStats: {}}]).toArray();
        indexStats.forEach(function(idx) {
            if (idx.accesses.ops === 0) {
                print("  WARNING: Unused index: " + idx.name);
            }
        });

        // Check for large documents
        var largeDocCount = coll.countDocuments({
            $expr: { $gt: [{ $bsonSize: "$$ROOT" }, 1048576] }  // > 1MB
        });
        if (largeDocCount > 0) {
            print("  WARNING: " + largeDocCount + " documents larger than 1MB");
        }
    });
});

// Check current operations for slow queries
print("\n========================================");
print("Current Slow Operations");
print("========================================");
var currentOps = db.currentOp({"secs_running": {$gt: 1}});
if (currentOps.inprog.length > 0) {
    currentOps.inprog.forEach(function(op) {
        print("OpID: " + op.opid);
        print("  Type: " + op.op);
        print("  Running: " + op.secs_running + "s");
        print("  Namespace: " + op.ns);
        if (op.planSummary) {
            print("  Plan: " + op.planSummary);
        }
    });
} else {
    print("No slow operations currently running");
}

// Server status recommendations
print("\n========================================");
print("Server Status Summary");
print("========================================");
var serverStatus = db.serverStatus();

// Connection pool analysis
var connPct = (serverStatus.connections.current / serverStatus.connections.available) * 100;
print("Connection Usage: " + connPct.toFixed(2) + "%");
if (connPct > 80) {
    print("  RECOMMENDATION: Consider increasing maxIncomingConnections");
}

// Cache analysis
var cache = serverStatus.wiredTiger.cache;
var cacheUsedPct = (cache["bytes currently in the cache"] / cache["maximum bytes configured"]) * 100;
print("WiredTiger Cache Usage: " + cacheUsedPct.toFixed(2) + "%");
if (cacheUsedPct > 90) {
    print("  RECOMMENDATION: Consider increasing cacheSizeGB");
}

// Page faults
var pageFaults = serverStatus.extra_info ? serverStatus.extra_info.page_faults : 0;
print("Page Faults: " + pageFaults);

MONGOSCRIPT
EOF

sudo chmod +x /opt/mongodb/scripts/mongodb-perf-analysis.sh
```

Implement index optimization:

```bash
# Connect to MongoDB and optimize indexes
mongosh -u mongoAdmin -p 'CHANGE_THIS_TO_A_STRONG_PASSWORD' \
  --authenticationDatabase admin << 'EOF'
// Switch to your application database
use myapp

// Create compound indexes for common query patterns
// Analyze your query patterns and create appropriate indexes

// Example: Index for user queries by email with sorting by creation date
db.users.createIndex(
    { "email": 1, "createdAt": -1 },
    {
        name: "idx_users_email_created",
        background: true,  // Build index in background (doesn't block operations)
        unique: true       // Ensure email uniqueness
    }
)

// Example: Text index for full-text search
db.products.createIndex(
    { "name": "text", "description": "text" },
    {
        name: "idx_products_text_search",
        weights: { "name": 10, "description": 5 },  // Name matches are more important
        default_language: "english"
    }
)

// Example: Geospatial index for location-based queries
db.stores.createIndex(
    { "location": "2dsphere" },
    { name: "idx_stores_location" }
)

// Example: TTL index for automatic document expiration
// Documents will be deleted after 30 days
db.sessions.createIndex(
    { "createdAt": 1 },
    {
        name: "idx_sessions_ttl",
        expireAfterSeconds: 2592000  // 30 days in seconds
    }
)

// Analyze query performance with explain
db.users.find({ email: "test@example.com" }).explain("executionStats")

// View index usage statistics
db.users.aggregate([{ $indexStats: {} }])

print("Index optimization completed")
EOF
```

System-level performance tuning:

```bash
# Optimize system settings for MongoDB performance
# Add these to /etc/sysctl.conf for persistence

sudo tee -a /etc/sysctl.conf << 'EOF'
# MongoDB Performance Tuning

# Increase the maximum number of open files
fs.file-max = 98000

# Increase the maximum number of memory map areas
# MongoDB uses memory-mapped files extensively
vm.max_map_count = 262144

# Reduce swappiness to prefer keeping MongoDB data in RAM
vm.swappiness = 1

# Set dirty ratio for optimal write performance
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5

# Increase network buffer sizes for high-throughput scenarios
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 65535
net.ipv4.tcp_max_syn_backlog = 65535

# Enable TCP keepalive for replica set communication
net.ipv4.tcp_keepalive_time = 300
net.ipv4.tcp_keepalive_probes = 5
net.ipv4.tcp_keepalive_intvl = 15
EOF

# Apply the settings immediately
sudo sysctl -p

# Verify the settings
sysctl vm.swappiness vm.max_map_count fs.file-max
```

## Operational Best Practices

Following operational best practices ensures long-term stability and maintainability of your MongoDB deployment.

```bash
# Create a log rotation configuration for MongoDB
sudo tee /etc/logrotate.d/mongodb << 'EOF'
/var/log/mongodb/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 640 mongodb mongodb
    sharedscripts
    postrotate
        # Send SIGUSR1 to mongod to rotate logs
        /bin/kill -SIGUSR1 $(cat /var/run/mongodb/mongod.pid 2>/dev/null) 2>/dev/null || true
    endscript
}
EOF

# Test log rotation
sudo logrotate -d /etc/logrotate.d/mongodb
```

Create a maintenance script for regular operations:

```bash
# Create a maintenance script
sudo tee /opt/mongodb/scripts/mongodb-maintenance.sh << 'EOF'
#!/bin/bash

# MongoDB Maintenance Script
# Run weekly for optimal database health

set -euo pipefail

MONGO_USER="mongoAdmin"
MONGO_PASSWORD="CHANGE_THIS_TO_A_STRONG_PASSWORD"
AUTH_DB="admin"
LOG_FILE="/var/log/mongodb/maintenance.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

log "Starting MongoDB maintenance..."

mongosh --quiet -u "${MONGO_USER}" -p "${MONGO_PASSWORD}" \
  --authenticationDatabase "${AUTH_DB}" << 'MONGOSCRIPT'

// Compact collections to reclaim disk space
// Note: This locks the collection, run during maintenance windows
var dbs = db.adminCommand({listDatabases: 1}).databases;

dbs.forEach(function(database) {
    if (['admin', 'local', 'config'].includes(database.name)) return;

    var targetDb = db.getSiblingDB(database.name);
    var collections = targetDb.getCollectionNames();

    print("Processing database: " + database.name);

    collections.forEach(function(collName) {
        // Validate collection integrity
        print("  Validating: " + collName);
        var result = targetDb.runCommand({ validate: collName, full: true });
        if (!result.valid) {
            print("    WARNING: Collection validation failed!");
            printjson(result);
        }

        // Rebuild indexes if needed
        // Uncomment the following for index rebuild (resource intensive)
        // print("  Rebuilding indexes: " + collName);
        // targetDb.runCommand({ reIndex: collName });
    });
});

// Clear old profiling data
print("\nClearing old profiling data...");
db.getSiblingDB('admin').system.profile.drop();

// Rotate encryption keys if using encryption at rest
// db.adminCommand({ rotateMasterKey: 1 });

print("\nMaintenance completed successfully");
MONGOSCRIPT

log "MongoDB maintenance completed"
EOF

sudo chmod +x /opt/mongodb/scripts/mongodb-maintenance.sh

# Schedule weekly maintenance
echo "0 3 * * 0 mongodb /opt/mongodb/scripts/mongodb-maintenance.sh >> /var/log/mongodb/maintenance-cron.log 2>&1" | \
  sudo tee -a /etc/cron.d/mongodb-maintenance
```

Create a security audit script:

```bash
# Create a security audit script
sudo tee /opt/mongodb/scripts/mongodb-security-audit.sh << 'EOF'
#!/bin/bash

# MongoDB Security Audit Script
# Run regularly to identify security issues

MONGO_USER="mongoAdmin"
MONGO_PASSWORD="CHANGE_THIS_TO_A_STRONG_PASSWORD"
AUTH_DB="admin"

echo "========================================="
echo "MongoDB Security Audit Report"
echo "Date: $(date)"
echo "========================================="

# Check if authentication is enabled
echo -e "\n[Authentication Status]"
if grep -q "authorization: enabled" /etc/mongod.conf; then
    echo "PASS: Authorization is enabled"
else
    echo "FAIL: Authorization is NOT enabled"
fi

# Check if keyFile is configured for replica sets
echo -e "\n[Replica Set Authentication]"
if grep -q "keyFile:" /etc/mongod.conf; then
    echo "PASS: KeyFile authentication is configured"
else
    echo "WARNING: KeyFile authentication not configured (required for replica sets)"
fi

# Check TLS configuration
echo -e "\n[TLS/SSL Configuration]"
if grep -q "mode: requireTLS" /etc/mongod.conf; then
    echo "PASS: TLS is required for all connections"
elif grep -q "mode: preferTLS" /etc/mongod.conf; then
    echo "WARNING: TLS is preferred but not required"
else
    echo "FAIL: TLS is not configured"
fi

# Check bind IP configuration
echo -e "\n[Network Binding]"
BIND_IP=$(grep "bindIp:" /etc/mongod.conf | head -1)
if echo "${BIND_IP}" | grep -q "0.0.0.0"; then
    echo "WARNING: MongoDB is bound to all interfaces (0.0.0.0)"
else
    echo "PASS: MongoDB is bound to specific IPs: ${BIND_IP}"
fi

# Check firewall status
echo -e "\n[Firewall Status]"
if sudo ufw status | grep -q "Status: active"; then
    echo "PASS: UFW firewall is active"
    sudo ufw status numbered | grep 27017
else
    echo "FAIL: UFW firewall is not active"
fi

# Audit user permissions
echo -e "\n[User Permissions Audit]"
mongosh --quiet -u "${MONGO_USER}" -p "${MONGO_PASSWORD}" \
  --authenticationDatabase "${AUTH_DB}" << 'MONGOSCRIPT'
var users = db.getSiblingDB('admin').getUsers();
users.users.forEach(function(user) {
    print("User: " + user.user);
    user.roles.forEach(function(role) {
        print("  - " + role.role + " on " + role.db);
        // Flag dangerous permissions
        if (role.role === 'root' || role.role === '__system') {
            print("    WARNING: User has elevated privileges");
        }
    });
});
MONGOSCRIPT

# Check for default/weak passwords
echo -e "\n[Password Policy]"
echo "Note: Ensure all passwords meet complexity requirements:"
echo "  - Minimum 16 characters"
echo "  - Mix of uppercase, lowercase, numbers, symbols"
echo "  - No dictionary words or common patterns"

# Check file permissions
echo -e "\n[File Permissions]"
for file in /etc/mongod.conf /etc/mongodb/mongodb-keyfile /etc/mongodb/ssl/*; do
    if [ -e "$file" ]; then
        perms=$(stat -c "%a %U:%G" "$file")
        echo "$file: $perms"
    fi
done

echo -e "\n========================================="
echo "Security audit completed"
echo "========================================="
EOF

sudo chmod +x /opt/mongodb/scripts/mongodb-security-audit.sh
```

## Troubleshooting Common Issues

Here are solutions to common MongoDB production issues:

```bash
# Create a troubleshooting script
sudo tee /opt/mongodb/scripts/mongodb-troubleshoot.sh << 'EOF'
#!/bin/bash

# MongoDB Troubleshooting Script
# Quick diagnostics for common issues

echo "MongoDB Troubleshooting Diagnostics"
echo "===================================="

# Check MongoDB service status
echo -e "\n[Service Status]"
systemctl status mongod --no-pager | head -20

# Check recent errors in logs
echo -e "\n[Recent Errors in Log]"
sudo grep -i "error\|warning\|fail" /var/log/mongodb/mongod.log | tail -20

# Check disk space
echo -e "\n[Disk Space]"
df -h /var/lib/mongodb

# Check memory usage
echo -e "\n[Memory Usage]"
free -h
echo ""
ps aux | grep mongod | grep -v grep

# Check for lock files
echo -e "\n[Lock Files]"
ls -la /var/lib/mongodb/*.lock 2>/dev/null || echo "No lock files found"

# Check system limits
echo -e "\n[System Limits for MongoDB Process]"
MONGOD_PID=$(pgrep mongod)
if [ -n "${MONGOD_PID}" ]; then
    cat /proc/${MONGOD_PID}/limits | grep -E "open files|processes"
fi

# Check network connectivity
echo -e "\n[Network Connectivity]"
ss -tlnp | grep mongod

# Check MongoDB port accessibility
echo -e "\n[Port Accessibility]"
nc -zv localhost 27017 2>&1

# Check replica set connectivity (if applicable)
echo -e "\n[Replica Set Status]"
if grep -q "replSetName" /etc/mongod.conf; then
    mongosh --quiet --eval "rs.status().members.forEach(m => print(m.name + ': ' + m.stateStr))" 2>/dev/null || echo "Unable to connect to replica set"
fi

echo -e "\n===================================="
echo "Diagnostics completed"
EOF

sudo chmod +x /opt/mongodb/scripts/mongodb-troubleshoot.sh
```

Common issues and their solutions:

```bash
# Issue: MongoDB won't start
# Check the log for specific errors
sudo journalctl -u mongod -n 50 --no-pager

# Common fix: Permission issues on data directory
sudo chown -R mongodb:mongodb /var/lib/mongodb
sudo chmod 750 /var/lib/mongodb

# Common fix: Lock file from improper shutdown
sudo rm /var/lib/mongodb/mongod.lock
sudo -u mongodb mongod --repair --dbpath /var/lib/mongodb
sudo systemctl start mongod

# Issue: High CPU usage
# Identify slow queries using the profiler
mongosh -u mongoAdmin -p 'PASSWORD' --authenticationDatabase admin << 'EOF'
// Enable profiling for slow operations
db.setProfilingLevel(1, { slowms: 100 })

// View slow operations
db.system.profile.find().sort({ ts: -1 }).limit(10).pretty()

// Check current operations
db.currentOp({ "secs_running": { $gt: 5 } })
EOF

# Issue: Connection refused errors
# Check if MongoDB is listening on the correct interface
sudo ss -tlnp | grep 27017

# Ensure the bind IP includes the client's network
sudo grep bindIp /etc/mongod.conf

# Issue: Replica set election problems
# Force reconfiguration (use with caution!)
mongosh -u mongoAdmin -p 'PASSWORD' --authenticationDatabase admin << 'EOF'
// Get current config
var config = rs.conf()

// Modify if needed and reconfigure
rs.reconfig(config, { force: true })
EOF

# Issue: Out of memory errors
# Check and adjust WiredTiger cache size
sudo grep cacheSizeGB /etc/mongod.conf

# Monitor memory usage over time
watch -n 5 'free -h; echo "---"; ps aux | grep mongod | grep -v grep'
```

## Conclusion

This guide covered the essential steps for deploying MongoDB in a production environment on Ubuntu:

1. **Installation**: Installing MongoDB from the official repository ensures you have the latest security patches
2. **Authentication**: Enabling RBAC with SCRAM-SHA-256 protects your data from unauthorized access
3. **Replica Sets**: Configuring a replica set provides high availability and data redundancy
4. **Network Security**: Proper firewall rules and TLS encryption protect data in transit
5. **Backups**: Regular backups with mongodump ensure you can recover from disasters
6. **Monitoring**: Prometheus and Grafana provide visibility into database health
7. **Performance Tuning**: Proper indexing and system configuration optimize query performance
8. **Operational Practices**: Regular maintenance and security audits maintain database health

Remember to:
- Regularly update MongoDB to get security patches
- Test your backup and restore procedures
- Monitor your replica set health continuously
- Review and rotate credentials periodically
- Keep your security configurations up to date

Following these practices will help ensure your MongoDB deployment is secure, performant, and reliable for production workloads.

## Additional Resources

- [MongoDB Official Documentation](https://docs.mongodb.com/)
- [MongoDB Security Checklist](https://docs.mongodb.com/manual/administration/security-checklist/)
- [MongoDB Production Notes](https://docs.mongodb.com/manual/administration/production-notes/)
- [MongoDB University](https://university.mongodb.com/) - Free courses on MongoDB administration
- [MongoDB Community Forums](https://www.mongodb.com/community/forums/)
