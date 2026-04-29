# How to Configure K3s with an External Database (PostgreSQL) - Postgres

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, Rancher, PostgreSQL, External Database, High Availability

Description: Learn how to configure K3s to use PostgreSQL as an external datastore for multi-server high availability clusters.

## Introduction

PostgreSQL is a powerful, enterprise-grade relational database that K3s supports as an external datastore. Using PostgreSQL with K3s allows you to leverage existing database infrastructure, managed PostgreSQL services (like AWS RDS, Azure Database, or Google Cloud SQL), and battle-tested database HA patterns.

## PostgreSQL Connection String Format

K3s uses the following format for PostgreSQL:

```text
postgres://username:password@hostname:port/dbname?sslmode=disable
postgres://username:password@hostname:port/dbname?sslmode=require
```

## Step 1: Set Up PostgreSQL

```bash
# Install PostgreSQL on Ubuntu/Debian

sudo apt-get update
sudo apt-get install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

## Step 2: Create the K3s Database and User

```bash
# Switch to the postgres user
sudo -i -u postgres

# Open the PostgreSQL shell
psql
```

```sql
-- Create a dedicated user for K3s
CREATE USER k3suser WITH PASSWORD 'K3sPostgresPassword123!';

-- Create the K3s database
CREATE DATABASE k3s OWNER k3suser;

-- Grant all privileges on the database
GRANT ALL PRIVILEGES ON DATABASE k3s TO k3suser;

-- Connect to the k3s database
\c k3s

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO k3suser;

-- Verify
\du k3suser
\l k3s

\q
```

## Step 3: Configure PostgreSQL for Remote Access

```bash
# Edit postgresql.conf
sudo nano /etc/postgresql/*/main/postgresql.conf
```

```ini
# postgresql.conf settings for K3s
listen_addresses = '*'          # Allow connections from any address
max_connections = 200           # Increase if needed
shared_buffers = 256MB
effective_cache_size = 768MB
```

```bash
# Edit pg_hba.conf to allow K3s server connections
sudo nano /etc/postgresql/*/main/pg_hba.conf
```

Add these lines:

```text
# K3s server nodes - allow SCRAM authentication
host    k3s    k3suser    192.168.1.100/32    scram-sha-256
host    k3s    k3suser    192.168.1.101/32    scram-sha-256
host    k3s    k3suser    192.168.1.102/32    scram-sha-256
# Or allow all from the cluster subnet
# host    k3s    k3suser    192.168.1.0/24    scram-sha-256
```

```bash
# Restart PostgreSQL
sudo systemctl restart postgresql

# Open firewall port
sudo ufw allow from 192.168.1.0/24 to any port 5432
```

## Step 4: Test Connectivity from K3s Nodes

```bash
# Install psql client on K3s server nodes
sudo apt-get install -y postgresql-client

# Test connection
psql -h 192.168.1.200 -U k3suser -d k3s -c "SELECT version();"

# Expected output: Version info of PostgreSQL
```

## Step 5: Install K3s with PostgreSQL Datastore

### First Server Node

```bash
sudo mkdir -p /etc/rancher/k3s

sudo tee /etc/rancher/k3s/config.yaml > /dev/null <<EOF
# K3s server configuration with PostgreSQL
token: "K3sPostgresToken"

# PostgreSQL connection string
# sslmode options: disable, require, verify-ca, verify-full
datastore-endpoint: "postgres://k3suser:K3sPostgresPassword123!@192.168.1.200:5432/k3s?sslmode=disable"

# TLS configuration
tls-san:
  - 192.168.1.99    # Load balancer VIP
  - 192.168.1.100   # This server
  - k3s.example.com

# Component configuration
kubelet-arg:
  - "max-pods=110"
  - "kube-reserved=cpu=300m,memory=512Mi"
  - "system-reserved=cpu=200m,memory=256Mi"

disable:
  - servicelb
EOF

# Install K3s
curl -sfL https://get.k3s.io | sudo sh -

# Monitor startup
sudo journalctl -u k3s -f
```

### Additional Server Nodes

```bash
# On server nodes 2 and 3
sudo mkdir -p /etc/rancher/k3s

sudo tee /etc/rancher/k3s/config.yaml > /dev/null <<EOF
token: "K3sPostgresToken"
datastore-endpoint: "postgres://k3suser:K3sPostgresPassword123!@192.168.1.200:5432/k3s?sslmode=disable"
tls-san:
  - 192.168.1.99
  - 192.168.1.101   # Replace with this server's IP on each node
  - k3s.example.com
kubelet-arg:
  - "max-pods=110"
disable:
  - servicelb
EOF

curl -sfL https://get.k3s.io | sudo sh -
```

## Step 6: Using PostgreSQL with SSL

For production, enable SSL between K3s and PostgreSQL:

```bash
# Generate a self-signed server certificate in the PostgreSQL data directory
sudo -i -u postgres
cd /var/lib/postgresql/*/main
openssl req -new -x509 -days 365 -nodes -text -out server.crt \
  -keyout server.key -subj "/CN=db.example.internal"
chmod og-rwx server.key
exit
```

Enable SSL in PostgreSQL and configure K3s to verify the server certificate:

```ini
# /etc/postgresql/<version>/main/postgresql.conf
ssl = on
ssl_cert_file = 'server.crt'
ssl_key_file = 'server.key'
```

```bash
sudo systemctl restart postgresql
```

```yaml
# /etc/rancher/k3s/config.yaml
datastore-endpoint: "postgres://k3suser:password@db.example.internal:5432/k3s?sslmode=verify-full"

# Copy the certificate used to trust the PostgreSQL server certificate to each K3s server and reference it here
datastore-cafile: "/etc/rancher/k3s/pg-ca.crt"
```

Only add `datastore-certfile` and `datastore-keyfile` if PostgreSQL is configured to require client certificate authentication.

## Step 7: Using Managed PostgreSQL (AWS RDS)

K3s works with managed PostgreSQL services:

```yaml
# /etc/rancher/k3s/config.yaml
# AWS RDS PostgreSQL connection
datastore-endpoint: "postgres://k3suser:password@mydb.123456789012.us-east-1.rds.amazonaws.com:5432/k3s?sslmode=verify-full"

# RDS CA bundle
datastore-cafile: "/etc/rancher/k3s/rds-ca-bundle.pem"
```

```bash
# Download the RDS CA bundle
curl -o /etc/rancher/k3s/rds-ca-bundle.pem \
    https://truststore.pki.rds.amazonaws.com/us-east-1/us-east-1-bundle.pem
```

## Step 8: Add Agent Nodes

```bash
sudo mkdir -p /etc/rancher/k3s

sudo tee /etc/rancher/k3s/config.yaml > /dev/null <<EOF
server: "https://192.168.1.99:6443"
token: "K3sPostgresToken"
node-label:
  - "tier=worker"
EOF

curl -sfL https://get.k3s.io | \
    INSTALL_K3S_EXEC="agent" \
    sudo sh -
```

## Step 9: Verify the Setup

```bash
# Set up kubectl
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config

# Check all nodes are Ready
kubectl get nodes

# Check K3s created its tables in PostgreSQL
psql -h 192.168.1.200 -U k3suser -d k3s -c "\dt"
# K3s stores data in a single 'kine' table
psql -h 192.168.1.200 -U k3suser -d k3s -c "SELECT COUNT(*) FROM kine;"
```

## Monitoring PostgreSQL Performance for K3s

```sql
-- Check active connections from K3s
SELECT application_name, state, count(*)
FROM pg_stat_activity
WHERE datname = 'k3s'
GROUP BY application_name, state;

-- Check table sizes
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public';

-- Check slow queries
-- Requires pg_stat_statements to be enabled
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

## PostgreSQL Backup for K3s Data

```bash
# Run on the PostgreSQL host
sudo -u postgres pg_dump k3s | \
    gzip > k3s-postgres-backup-$(date +%Y%m%d).sql.gz

# Schedule automatic backups
echo '0 */6 * * * postgres pg_dump k3s | gzip > /backups/k3s-$(date +\%Y\%m\%d-\%H\%M).sql.gz' | \
    sudo tee /etc/cron.d/k3s-backup
```

## Conclusion

Configuring K3s with PostgreSQL as an external datastore provides a flexible, production-ready alternative to embedded etcd. PostgreSQL's rich ecosystem, excellent tooling, and managed cloud offerings make it an attractive choice for organizations already invested in the PostgreSQL stack. The `datastore-endpoint` configuration option accepts a standard PostgreSQL connection string, and K3s handles all schema creation and management automatically through its Kine compatibility layer.
