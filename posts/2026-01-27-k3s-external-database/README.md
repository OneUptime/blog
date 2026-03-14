# How to Use K3s with External Database

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Kubernetes, K3s, PostgreSQL, MySQL, etcd, High Availability, Database, DevOps

Description: A comprehensive guide to configuring K3s with external datastores including PostgreSQL, MySQL/MariaDB, and etcd for production-ready, highly available Kubernetes clusters.

---

> **Key Insight:** K3s defaults to an embedded SQLite database, which works great for single-node deployments. For production clusters requiring high availability and data durability, external datastores like PostgreSQL, MySQL, or etcd are essential. The choice of datastore directly impacts your cluster's resilience, scalability, and operational complexity.

K3s is a lightweight Kubernetes distribution that packs the full Kubernetes API into a single binary under 100MB. While its simplicity makes it perfect for edge computing, IoT, and development environments, production deployments demand more robust data storage solutions. This guide walks through configuring K3s with external databases, setting up high availability, and implementing backup strategies.

For a broader comparison of Kubernetes distributions, see [Choosing the Right Kubernetes Distribution](https://oneuptime.com/blog/post/2025-11-27-choosing-the-right-kubernetes-distribution/view).

## Understanding K3s Datastore Options

K3s supports multiple datastore backends, each with distinct trade-offs:

```mermaid
flowchart TD
    A[K3s Datastore Options] --> B[Embedded SQLite]
    A --> C[Embedded etcd]
    A --> D[External Database]

    B --> B1[Single Node Only]
    B --> B2[Zero Configuration]
    B --> B3[Development/Edge]

    C --> C1[Multi-Server HA]
    C --> C2[Built-in Clustering]
    C --> C3[No External Dependencies]

    D --> D1[PostgreSQL]
    D --> D2[MySQL/MariaDB]
    D --> D3[External etcd]

    D1 --> E[Managed DB Services]
    D2 --> E
    D3 --> F[Dedicated etcd Cluster]
```

| Datastore | Best For | HA Support | Operational Complexity |
|-----------|----------|------------|------------------------|
| SQLite | Single node, edge | No | Minimal |
| Embedded etcd | Small HA clusters | Yes | Low |
| PostgreSQL | Cloud-native, managed DB | Yes | Medium |
| MySQL/MariaDB | Existing MySQL infrastructure | Yes | Medium |
| External etcd | Large clusters, strict requirements | Yes | High |

## PostgreSQL as Datastore

PostgreSQL is an excellent choice for K3s in cloud environments where managed database services (AWS RDS, Google Cloud SQL, Azure Database) provide automatic backups, failover, and scaling.

### Prerequisites

Before configuring K3s with PostgreSQL, ensure your database is ready:

```bash
# Connect to PostgreSQL and create the K3s database
# Replace with your PostgreSQL host and credentials
psql -h postgres.example.com -U admin -d postgres

# Inside psql, create a dedicated database for K3s
# The database stores all Kubernetes objects (pods, services, secrets, etc.)
CREATE DATABASE k3s;

# Create a dedicated user with limited privileges
# This follows the principle of least privilege
CREATE USER k3s_user WITH ENCRYPTED PASSWORD 'your-secure-password';

# Grant all privileges on the k3s database to the new user
# K3s needs full control to create tables and manage data
GRANT ALL PRIVILEGES ON DATABASE k3s TO k3s_user;

# Exit psql
\q
```

### K3s Server Configuration with PostgreSQL

```bash
# Install K3s server with PostgreSQL datastore
# The --datastore-endpoint flag specifies the connection string
# Format: postgres://username:password@hostname:port/database

curl -sfL https://get.k3s.io | sh -s - server \
  --datastore-endpoint="postgres://k3s_user:your-secure-password@postgres.example.com:5432/k3s" \
  --tls-san="k3s-api.example.com" \
  --node-taint CriticalAddonsOnly=true:NoExecute
```

For production deployments, use a systemd configuration file for better control:

```bash
# Create K3s configuration file
# This file is read by K3s on startup and provides cleaner configuration management
sudo mkdir -p /etc/rancher/k3s

# Write the configuration with PostgreSQL connection details
sudo tee /etc/rancher/k3s/config.yaml > /dev/null << 'EOF'
# K3s Server Configuration for PostgreSQL Backend
# This configuration enables a production-ready K3s server

# PostgreSQL connection string
# Use SSL mode 'require' for encrypted connections in production
datastore-endpoint: "postgres://k3s_user:your-secure-password@postgres.example.com:5432/k3s?sslmode=require"

# TLS Subject Alternative Names for API server certificate
# Include all hostnames and IPs that will access the API
tls-san:
  - "k3s-api.example.com"
  - "10.0.0.10"
  - "192.168.1.100"

# Disable local storage provisioner if using external storage
disable:
  - local-storage

# Write kubeconfig with correct permissions
write-kubeconfig-mode: "0644"

# Enable secrets encryption at rest
secrets-encryption: true
EOF

# Install K3s using the configuration file
curl -sfL https://get.k3s.io | sh -s - server
```

### PostgreSQL Connection String Options

```bash
# Basic connection (not recommended for production)
postgres://user:password@host:5432/database

# With SSL required (recommended for production)
postgres://user:password@host:5432/database?sslmode=require

# With SSL verification (most secure)
postgres://user:password@host:5432/database?sslmode=verify-full&sslrootcert=/path/to/ca.crt

# With connection pooling parameters
# These help manage database connections efficiently
postgres://user:password@host:5432/database?sslmode=require&connect_timeout=10&pool_max_conns=10
```

## MySQL/MariaDB Configuration

MySQL and MariaDB work interchangeably with K3s. This option is ideal when you have existing MySQL infrastructure or prefer MySQL's operational characteristics.

### Database Preparation

```bash
# Connect to MySQL server
mysql -h mysql.example.com -u admin -p

# Create the K3s database with UTF8 encoding
# The character set ensures proper handling of Kubernetes object names
CREATE DATABASE k3s CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Create a dedicated user for K3s
# Using mysql_native_password for broader compatibility
CREATE USER 'k3s_user'@'%' IDENTIFIED WITH mysql_native_password BY 'your-secure-password';

# Grant necessary privileges
# K3s needs full access to manage its schema
GRANT ALL PRIVILEGES ON k3s.* TO 'k3s_user'@'%';

# Apply privilege changes
FLUSH PRIVILEGES;

# Exit MySQL
EXIT;
```

### K3s Server Configuration with MySQL

```bash
# Install K3s with MySQL datastore
# Format: mysql://username:password@tcp(hostname:port)/database

curl -sfL https://get.k3s.io | sh -s - server \
  --datastore-endpoint="mysql://k3s_user:your-secure-password@tcp(mysql.example.com:3306)/k3s"
```

For production, create a comprehensive configuration:

```bash
# Create K3s configuration for MySQL backend
sudo mkdir -p /etc/rancher/k3s

sudo tee /etc/rancher/k3s/config.yaml > /dev/null << 'EOF'
# K3s Server Configuration for MySQL Backend

# MySQL connection string with TLS enabled
# The tls=true parameter enables encrypted connections
datastore-endpoint: "mysql://k3s_user:your-secure-password@tcp(mysql.example.com:3306)/k3s?tls=true"

# API server endpoint configuration
tls-san:
  - "k3s-api.example.com"
  - "k3s-server-1.internal"
  - "k3s-server-2.internal"
  - "k3s-server-3.internal"

# Cluster CIDR ranges (customize for your network)
cluster-cidr: "10.42.0.0/16"
service-cidr: "10.43.0.0/16"

# Enable Prometheus metrics
# Useful for monitoring K3s with OneUptime
kube-controller-manager-arg:
  - "bind-address=0.0.0.0"
kube-scheduler-arg:
  - "bind-address=0.0.0.0"
EOF

# Install K3s
curl -sfL https://get.k3s.io | sh -s - server
```

### MySQL Connection String Variants

```bash
# Basic MySQL connection
mysql://user:password@tcp(host:3306)/database

# With TLS enabled
mysql://user:password@tcp(host:3306)/database?tls=true

# With custom TLS configuration
mysql://user:password@tcp(host:3306)/database?tls=custom&tls-ca=/path/to/ca.pem

# With additional parameters for production
mysql://user:password@tcp(host:3306)/database?tls=true&parseTime=true&timeout=10s&readTimeout=30s&writeTimeout=30s
```

## External etcd Cluster

For the most robust high-availability setup, an external etcd cluster provides the same datastore that upstream Kubernetes uses. This option is best for large clusters or when you need strict consistency guarantees.

### etcd Cluster Architecture

```mermaid
flowchart TB
    subgraph K3s Servers
        S1[K3s Server 1]
        S2[K3s Server 2]
        S3[K3s Server 3]
    end

    subgraph External etcd Cluster
        E1[etcd Node 1]
        E2[etcd Node 2]
        E3[etcd Node 3]
    end

    S1 --> E1
    S1 --> E2
    S1 --> E3
    S2 --> E1
    S2 --> E2
    S2 --> E3
    S3 --> E1
    S3 --> E2
    S3 --> E3

    E1 <--> E2
    E2 <--> E3
    E1 <--> E3
```

### Setting Up External etcd

First, deploy a 3-node etcd cluster:

```bash
# On each etcd node, install etcd
# This example uses etcd v3.5.x

# Download and install etcd
ETCD_VERSION="v3.5.12"
wget https://github.com/etcd-io/etcd/releases/download/${ETCD_VERSION}/etcd-${ETCD_VERSION}-linux-amd64.tar.gz
tar xzf etcd-${ETCD_VERSION}-linux-amd64.tar.gz
sudo mv etcd-${ETCD_VERSION}-linux-amd64/etcd* /usr/local/bin/

# Create etcd user and directories
sudo useradd --system --no-create-home etcd
sudo mkdir -p /var/lib/etcd /etc/etcd
sudo chown etcd:etcd /var/lib/etcd
```

Create the etcd configuration for each node:

```bash
# etcd configuration file (adjust for each node)
# Save as /etc/etcd/etcd.conf

# Node-specific settings (change for each node)
ETCD_NAME="etcd-1"
ETCD_DATA_DIR="/var/lib/etcd"

# Client URLs (how K3s connects to etcd)
ETCD_LISTEN_CLIENT_URLS="https://0.0.0.0:2379"
ETCD_ADVERTISE_CLIENT_URLS="https://etcd-1.example.com:2379"

# Peer URLs (how etcd nodes communicate)
ETCD_LISTEN_PEER_URLS="https://0.0.0.0:2380"
ETCD_INITIAL_ADVERTISE_PEER_URLS="https://etcd-1.example.com:2380"

# Cluster configuration
ETCD_INITIAL_CLUSTER="etcd-1=https://etcd-1.example.com:2380,etcd-2=https://etcd-2.example.com:2380,etcd-3=https://etcd-3.example.com:2380"
ETCD_INITIAL_CLUSTER_STATE="new"
ETCD_INITIAL_CLUSTER_TOKEN="k3s-etcd-cluster"

# TLS certificates (required for production)
ETCD_CERT_FILE="/etc/etcd/pki/server.crt"
ETCD_KEY_FILE="/etc/etcd/pki/server.key"
ETCD_TRUSTED_CA_FILE="/etc/etcd/pki/ca.crt"
ETCD_PEER_CERT_FILE="/etc/etcd/pki/peer.crt"
ETCD_PEER_KEY_FILE="/etc/etcd/pki/peer.key"
ETCD_PEER_TRUSTED_CA_FILE="/etc/etcd/pki/ca.crt"
ETCD_CLIENT_CERT_AUTH="true"
ETCD_PEER_CLIENT_CERT_AUTH="true"
```

Create a systemd service for etcd:

```bash
# /etc/systemd/system/etcd.service
[Unit]
Description=etcd key-value store
Documentation=https://etcd.io/docs/
After=network.target

[Service]
Type=notify
User=etcd
EnvironmentFile=/etc/etcd/etcd.conf
ExecStart=/usr/local/bin/etcd
Restart=always
RestartSec=5
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

### K3s Configuration with External etcd

```bash
# K3s configuration for external etcd cluster
sudo mkdir -p /etc/rancher/k3s

sudo tee /etc/rancher/k3s/config.yaml > /dev/null << 'EOF'
# K3s Server Configuration with External etcd

# etcd endpoint configuration
# List all etcd endpoints for failover capability
datastore-endpoint: "https://etcd-1.example.com:2379,https://etcd-2.example.com:2379,https://etcd-3.example.com:2379"

# etcd TLS certificates
# These certificates authenticate K3s to the etcd cluster
datastore-cafile: "/etc/rancher/k3s/etcd-ca.crt"
datastore-certfile: "/etc/rancher/k3s/etcd-client.crt"
datastore-keyfile: "/etc/rancher/k3s/etcd-client.key"

# API server configuration
tls-san:
  - "k3s-api.example.com"
  - "k3s-vip.internal"

# Disable embedded etcd since we're using external
disable-etcd: true

# Enable HA features
cluster-init: false
EOF

# Copy etcd client certificates to K3s
sudo cp /path/to/etcd-ca.crt /etc/rancher/k3s/
sudo cp /path/to/etcd-client.crt /etc/rancher/k3s/
sudo cp /path/to/etcd-client.key /etc/rancher/k3s/
sudo chmod 600 /etc/rancher/k3s/etcd-client.key

# Install K3s
curl -sfL https://get.k3s.io | sh -s - server
```

## High Availability Setup

A production K3s cluster requires multiple server nodes behind a load balancer. Here's the complete architecture:

```mermaid
flowchart TB
    LB[Load Balancer<br/>k3s-api.example.com:6443]

    subgraph K3s Server Nodes
        S1[K3s Server 1<br/>10.0.0.11]
        S2[K3s Server 2<br/>10.0.0.12]
        S3[K3s Server 3<br/>10.0.0.13]
    end

    subgraph External Database
        DB[(PostgreSQL/MySQL<br/>or etcd Cluster)]
    end

    subgraph K3s Agent Nodes
        A1[Agent 1]
        A2[Agent 2]
        A3[Agent 3]
        A4[Agent N...]
    end

    LB --> S1
    LB --> S2
    LB --> S3

    S1 --> DB
    S2 --> DB
    S3 --> DB

    A1 --> LB
    A2 --> LB
    A3 --> LB
    A4 --> LB
```

### Load Balancer Configuration (HAProxy)

```bash
# /etc/haproxy/haproxy.cfg
# HAProxy configuration for K3s API server load balancing

global
    log /dev/log local0
    maxconn 4096

defaults
    log     global
    mode    tcp
    option  tcplog
    timeout connect 10s
    timeout client  1m
    timeout server  1m

# Frontend for K3s API server
# Clients connect here to access the Kubernetes API
frontend k3s_api
    bind *:6443
    default_backend k3s_servers

# Backend pool of K3s server nodes
# Health checks ensure traffic only goes to healthy nodes
backend k3s_servers
    balance roundrobin
    option tcp-check

    # K3s server nodes with health checks
    # The 'check' keyword enables active health monitoring
    server k3s-server-1 10.0.0.11:6443 check inter 5s fall 3 rise 2
    server k3s-server-2 10.0.0.12:6443 check inter 5s fall 3 rise 2
    server k3s-server-3 10.0.0.13:6443 check inter 5s fall 3 rise 2
```

### First Server Node Setup

```bash
# On the first K3s server node
# This node initializes the cluster

sudo mkdir -p /etc/rancher/k3s

sudo tee /etc/rancher/k3s/config.yaml > /dev/null << 'EOF'
# First K3s Server Configuration

# External PostgreSQL datastore
datastore-endpoint: "postgres://k3s_user:password@postgres.example.com:5432/k3s?sslmode=require"

# Load balancer address for TLS certificate
# This ensures the API certificate is valid for the LB hostname
tls-san:
  - "k3s-api.example.com"
  - "10.0.0.10"  # Load balancer IP

# Generate a token for other nodes to join
# Store this securely - it authenticates cluster membership
token: "your-secure-cluster-token"

# Cluster initialization flag
cluster-init: true

# Enable secrets encryption
secrets-encryption: true

# Node labels for identification
node-label:
  - "node.kubernetes.io/role=control-plane"
EOF

# Install K3s server
curl -sfL https://get.k3s.io | sh -s - server
```

### Additional Server Nodes

```bash
# On additional K3s server nodes (2nd, 3rd, etc.)
# These nodes join the existing cluster

sudo mkdir -p /etc/rancher/k3s

sudo tee /etc/rancher/k3s/config.yaml > /dev/null << 'EOF'
# Additional K3s Server Configuration

# Same datastore as the first server
datastore-endpoint: "postgres://k3s_user:password@postgres.example.com:5432/k3s?sslmode=require"

# Must match the first server's TLS SANs
tls-san:
  - "k3s-api.example.com"
  - "10.0.0.10"

# Same token as the first server
token: "your-secure-cluster-token"

# Connect to existing cluster via load balancer
server: "https://k3s-api.example.com:6443"

# Node labels
node-label:
  - "node.kubernetes.io/role=control-plane"
EOF

# Install K3s server (joins existing cluster)
curl -sfL https://get.k3s.io | sh -s - server
```

### Agent Node Configuration

```bash
# On K3s agent (worker) nodes
# Agents run workloads but don't participate in control plane

# Join agents to the cluster via the load balancer
curl -sfL https://get.k3s.io | sh -s - agent \
  --server "https://k3s-api.example.com:6443" \
  --token "your-secure-cluster-token" \
  --node-label "node.kubernetes.io/role=worker"
```

## Database Backup Strategies

Regardless of which external datastore you choose, implementing robust backup procedures is critical for disaster recovery.

### PostgreSQL Backup with pg_dump

```bash
#!/bin/bash
# k3s-postgres-backup.sh
# Automated backup script for K3s PostgreSQL datastore

# Configuration
DB_HOST="postgres.example.com"
DB_PORT="5432"
DB_NAME="k3s"
DB_USER="k3s_user"
BACKUP_DIR="/var/backups/k3s"
RETENTION_DAYS=30

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Generate timestamp for backup filename
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/k3s_backup_${TIMESTAMP}.sql.gz"

# Perform the backup
# --no-owner: Don't output commands to set object ownership
# --no-acl: Don't output commands to set access privileges
# Compress with gzip to save storage space
PGPASSWORD="${DB_PASSWORD}" pg_dump \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    --no-owner \
    --no-acl \
    --format=plain \
    | gzip > "${BACKUP_FILE}"

# Verify backup was created successfully
if [ -f "${BACKUP_FILE}" ] && [ -s "${BACKUP_FILE}" ]; then
    echo "Backup successful: ${BACKUP_FILE}"

    # Calculate and store checksum for integrity verification
    sha256sum "${BACKUP_FILE}" > "${BACKUP_FILE}.sha256"
else
    echo "Backup failed!"
    exit 1
fi

# Clean up old backups beyond retention period
find "${BACKUP_DIR}" -name "k3s_backup_*.sql.gz" -mtime +${RETENTION_DAYS} -delete
find "${BACKUP_DIR}" -name "k3s_backup_*.sha256" -mtime +${RETENTION_DAYS} -delete

echo "Backup complete. Old backups cleaned up."
```

### MySQL Backup with mysqldump

```bash
#!/bin/bash
# k3s-mysql-backup.sh
# Automated backup script for K3s MySQL datastore

# Configuration
DB_HOST="mysql.example.com"
DB_PORT="3306"
DB_NAME="k3s"
DB_USER="k3s_user"
BACKUP_DIR="/var/backups/k3s"
RETENTION_DAYS=30

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Generate timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/k3s_backup_${TIMESTAMP}.sql.gz"

# Perform the backup
# --single-transaction: Consistent snapshot without locking tables
# --routines: Include stored procedures and functions
# --triggers: Include triggers
# --quick: Retrieve rows one at a time (memory efficient for large databases)
mysqldump \
    -h "${DB_HOST}" \
    -P "${DB_PORT}" \
    -u "${DB_USER}" \
    -p"${DB_PASSWORD}" \
    --single-transaction \
    --routines \
    --triggers \
    --quick \
    "${DB_NAME}" \
    | gzip > "${BACKUP_FILE}"

# Verify backup
if [ -f "${BACKUP_FILE}" ] && [ -s "${BACKUP_FILE}" ]; then
    echo "Backup successful: ${BACKUP_FILE}"
    sha256sum "${BACKUP_FILE}" > "${BACKUP_FILE}.sha256"
else
    echo "Backup failed!"
    exit 1
fi

# Clean up old backups
find "${BACKUP_DIR}" -name "k3s_backup_*.sql.gz" -mtime +${RETENTION_DAYS} -delete
find "${BACKUP_DIR}" -name "k3s_backup_*.sha256" -mtime +${RETENTION_DAYS} -delete
```

### etcd Backup with etcdctl

```bash
#!/bin/bash
# k3s-etcd-backup.sh
# Automated backup script for K3s external etcd datastore

# Configuration
ETCD_ENDPOINTS="https://etcd-1.example.com:2379,https://etcd-2.example.com:2379,https://etcd-3.example.com:2379"
ETCD_CACERT="/etc/etcd/pki/ca.crt"
ETCD_CERT="/etc/etcd/pki/client.crt"
ETCD_KEY="/etc/etcd/pki/client.key"
BACKUP_DIR="/var/backups/k3s-etcd"
RETENTION_DAYS=30

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Generate timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/etcd_snapshot_${TIMESTAMP}.db"

# Create etcd snapshot
# The snapshot captures the entire etcd database state
etcdctl snapshot save "${BACKUP_FILE}" \
    --endpoints="${ETCD_ENDPOINTS}" \
    --cacert="${ETCD_CACERT}" \
    --cert="${ETCD_CERT}" \
    --key="${ETCD_KEY}"

# Verify snapshot integrity
# This ensures the backup is not corrupted
etcdctl snapshot status "${BACKUP_FILE}" \
    --write-out=table

if [ $? -eq 0 ]; then
    echo "etcd snapshot successful: ${BACKUP_FILE}"

    # Compress the snapshot
    gzip "${BACKUP_FILE}"

    # Generate checksum
    sha256sum "${BACKUP_FILE}.gz" > "${BACKUP_FILE}.gz.sha256"
else
    echo "etcd snapshot failed!"
    rm -f "${BACKUP_FILE}"
    exit 1
fi

# Clean up old snapshots
find "${BACKUP_DIR}" -name "etcd_snapshot_*.db.gz" -mtime +${RETENTION_DAYS} -delete
find "${BACKUP_DIR}" -name "etcd_snapshot_*.sha256" -mtime +${RETENTION_DAYS} -delete
```

### Automated Backup with Kubernetes CronJob

```yaml
# k3s-backup-cronjob.yaml
# Deploy this to your K3s cluster to automate database backups
apiVersion: batch/v1
kind: CronJob
metadata:
  name: k3s-datastore-backup
  namespace: kube-system
spec:
  # Run backup every 6 hours
  schedule: "0 */6 * * *"
  # Keep last 3 successful and 1 failed job for debugging
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: postgres:15-alpine  # or mysql:8 for MySQL
            env:
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: k3s-db-credentials
                  key: password
            command:
            - /bin/sh
            - -c
            - |
              # Create backup with timestamp
              TIMESTAMP=$(date +%Y%m%d_%H%M%S)
              pg_dump -h $DB_HOST -U $DB_USER -d k3s | gzip > /backups/k3s_${TIMESTAMP}.sql.gz
              # Upload to S3 (optional)
              # aws s3 cp /backups/k3s_${TIMESTAMP}.sql.gz s3://your-bucket/k3s-backups/
            volumeMounts:
            - name: backup-storage
              mountPath: /backups
          restartPolicy: OnFailure
          volumes:
          - name: backup-storage
            persistentVolumeClaim:
              claimName: k3s-backup-pvc
```

## Best Practices Summary

1. **Choose the right datastore for your scale:**
   - SQLite: Single-node development/edge deployments
   - PostgreSQL/MySQL: Small to medium HA clusters with managed database services
   - External etcd: Large clusters or strict consistency requirements

2. **Always use TLS for database connections:**
   - Enable SSL/TLS encryption for all datastore connections
   - Use certificate authentication when possible
   - Rotate credentials regularly

3. **Implement automated backups:**
   - Schedule backups at least every 6 hours for production
   - Test restore procedures quarterly
   - Store backups in multiple locations (local + cloud)

4. **Design for high availability:**
   - Deploy at least 3 server nodes for quorum
   - Use a load balancer in front of server nodes
   - Distribute nodes across failure domains (racks, zones)

5. **Monitor your datastore:**
   - Track connection pool usage and query latency
   - Set up alerts for replication lag (if applicable)
   - Monitor disk space and I/O performance
   - Use [OneUptime](https://oneuptime.com) to monitor K3s clusters and datastore health

6. **Secure your configuration:**
   - Store database credentials in secrets management (Vault, AWS Secrets Manager)
   - Use dedicated database users with minimal privileges
   - Enable encryption at rest for sensitive data

7. **Plan for disaster recovery:**
   - Document restore procedures
   - Practice recovery in staging environments
   - Keep backups for at least 30 days
   - Test failover scenarios regularly

For comprehensive monitoring of your K3s clusters and external databases, consider setting up observability with [OneUptime](https://oneuptime.com), which provides unified monitoring for Kubernetes clusters, databases, and application performance.
