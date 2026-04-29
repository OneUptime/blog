# How to Configure K3s with an External Database (MySQL) - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, Rancher, MySQL, External Database, High Availability

Description: Learn how to configure K3s to use MySQL as an external datastore for highly available clusters without embedded etcd.

## Introduction

By default, K3s uses embedded SQLite for single-server deployments or embedded etcd for HA. However, if your organization already manages a MySQL/MariaDB database cluster, you can use it as K3s's external datastore. This enables multiple K3s server nodes to share state through a managed database, providing high availability without the complexity of managing etcd.

## Architecture

```text
         ┌─────────────────┐
         │  Load Balancer  │
         │  (HAProxy/NGINX) │
         └────────┬────────┘
                  │
         ┌────────┼────────┐
         │        │        │
    ┌────┴──┐ ┌───┴───┐ ┌──┴────┐
    │K3s-01 │ │K3s-02 │ │K3s-03 │
    └────┬──┘ └───┬───┘ └──┬────┘
         └────────┼────────┘
                  │
         ┌────────┴────────┐
         │ MySQL Primary/   │
         │     Replica      │
         └─────────────────┘
```

## Step 1: Set Up MySQL

Install and configure MySQL on a dedicated server:

```bash
# Install MySQL on Ubuntu

sudo apt-get update
sudo apt-get install -y mysql-server

# Secure the installation
sudo mysql_secure_installation

# Start MySQL
sudo systemctl enable mysql
sudo systemctl start mysql
```

## Step 2: Create the K3s Database and User

```bash
# Connect to MySQL
sudo mysql -u root -p

# Execute the following SQL commands
```

```sql
-- Create the K3s database
CREATE DATABASE k3s CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create a dedicated K3s user
CREATE USER 'k3suser'@'%' IDENTIFIED BY 'K3sSecurePassword123!';

-- Grant necessary privileges
GRANT ALL PRIVILEGES ON k3s.* TO 'k3suser'@'%';

-- Apply privilege changes
FLUSH PRIVILEGES;

-- Verify the user and database
SHOW DATABASES LIKE 'k3s';
SELECT user, host FROM mysql.user WHERE user = 'k3suser';

EXIT;
```

## Step 3: Configure MySQL for K3s

Configure MySQL for remote access and, if needed, replication:

```bash
# Edit MySQL configuration
sudo tee /etc/mysql/mysql.conf.d/k3s.cnf > /dev/null <<EOF
[mysqld]
# Example settings for K3s connectivity
max_allowed_packet = 32M
innodb_redo_log_capacity = 256M
innodb_buffer_pool_size = 512M

# Durability settings
innodb_flush_log_at_trx_commit = 1
sync_binlog = 1

# Allow remote connections
bind-address = 0.0.0.0

# Enable binary logging for replication (needed if you follow Step 9)
server-id = 1
log_bin = /var/log/mysql/mysql-bin.log
binlog_expire_logs_seconds = 604800
EOF

sudo systemctl restart mysql
```

## Step 4: Configure Firewall for MySQL Access

```bash
# Allow K3s server nodes to connect to MySQL
sudo ufw allow from 192.168.1.100 to any port 3306
sudo ufw allow from 192.168.1.101 to any port 3306
sudo ufw allow from 192.168.1.102 to any port 3306
```

## Step 5: Test MySQL Connectivity from K3s Nodes

```bash
# Install MySQL client on each K3s server node
sudo apt-get install -y mysql-client

# Test connectivity from K3s server node
mysql -h 192.168.1.200 -u k3suser -p'K3sSecurePassword123!' k3s -e "SELECT 1;"

# Expected output: 1
```

## Step 6: Install K3s with MySQL Datastore

### First Server Node

```bash
sudo mkdir -p /etc/rancher/k3s

sudo tee /etc/rancher/k3s/config.yaml > /dev/null <<EOF
# K3s server with MySQL external datastore
token: "K3sMySQLToken"

# MySQL datastore connection string
datastore-endpoint: "mysql://k3suser:K3sSecurePassword123!@tcp(192.168.1.200:3306)/k3s"

# TLS SANs
tls-san:
  - 192.168.1.99   # Load balancer IP
  - 192.168.1.100  # This server's IP
  - k3s.example.com

# Kubelet configuration
kubelet-arg:
  - "max-pods=110"
EOF

# Install K3s
curl -sfL https://get.k3s.io | sudo sh -

# Monitor startup
sudo journalctl -u k3s -f
```

### Second and Third Server Nodes

```bash
# Configure and install additional server nodes
sudo mkdir -p /etc/rancher/k3s

sudo tee /etc/rancher/k3s/config.yaml > /dev/null <<EOF
token: "K3sMySQLToken"
datastore-endpoint: "mysql://k3suser:K3sSecurePassword123!@tcp(192.168.1.200:3306)/k3s"
tls-san:
  - 192.168.1.99
  - 192.168.1.101   # This server's IP
  - k3s.example.com
kubelet-arg:
  - "max-pods=110"
EOF

curl -sfL https://get.k3s.io | sudo sh -
```

## Step 7: Add Agent Nodes

```bash
# On each agent node
sudo mkdir -p /etc/rancher/k3s

sudo tee /etc/rancher/k3s/config.yaml > /dev/null <<EOF
server: "https://192.168.1.99:6443"
token: "K3sMySQLToken"
EOF

curl -sfL https://get.k3s.io | sudo sh -s - agent
```

## Step 8: Verify the Cluster

```bash
# Configure kubectl
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config

# Check all server nodes are Ready
kubectl get nodes

# Check the MySQL datastore is being used
sudo journalctl -u k3s | grep -i mysql

# Verify by checking the MySQL tables K3s created
mysql -h 192.168.1.200 -u k3suser -p'K3sSecurePassword123!' k3s \
    -e "SHOW TABLES;"
```

## Step 9: Set Up MySQL Replication (Recommended)

For production, use MySQL replication for database redundancy and pair it with a failover mechanism or managed HA service. Ensure the primary and each replica use unique `server-id` values:

```sql
-- On the MySQL primary, create a replication user
CREATE USER 'replicator'@'%' IDENTIFIED BY 'ReplicaPassword';
GRANT REPLICATION SLAVE ON *.* TO 'replicator'@'%';
FLUSH PRIVILEGES;
-- Record the File and Position values from this command
-- On MySQL 8.4, use SHOW BINARY LOG STATUS instead
SHOW MASTER STATUS;
```

```sql
-- On the MySQL replica
-- Ensure this replica has a unique server-id before running these commands
CHANGE REPLICATION SOURCE TO
    SOURCE_HOST='192.168.1.200',
    SOURCE_USER='replicator',
    SOURCE_PASSWORD='ReplicaPassword',
    SOURCE_LOG_FILE='<file-from-SHOW-MASTER-STATUS>',
    SOURCE_LOG_POS=<position-from-SHOW-MASTER-STATUS>;
START REPLICA;
SHOW REPLICA STATUS\G;
```

## Step 10: Using SSL for MySQL Connection

```yaml
# /etc/rancher/k3s/config.yaml
datastore-endpoint: "mysql://k3suser:K3sSecurePassword123!@tcp(192.168.1.200:3306)/k3s"

# SSL certificates for MySQL TLS
datastore-certfile: "/etc/rancher/k3s/mysql-client.crt"
datastore-keyfile: "/etc/rancher/k3s/mysql-client.key"
datastore-cafile: "/etc/rancher/k3s/mysql-ca.crt"
```

## Monitoring MySQL Datastore Health

```bash
# Check MySQL connection from K3s
sudo journalctl -u k3s | grep -E "database|mysql|datastore"

# If enabled, check the MySQL slow query log
sudo tail -f /var/log/mysql/mysql-slow.log

# Monitor MySQL connections
mysql -h 192.168.1.200 -u root -p -e "SHOW PROCESSLIST;"
```

## Conclusion

Using MySQL as a K3s external datastore enables multiple K3s server nodes to share state through a managed database without requiring embedded etcd. The setup involves creating a dedicated MySQL database and user, configuring the `datastore-endpoint` in K3s's configuration, and deploying multiple server nodes pointing to the same database. For production deployments, make sure the external MySQL layer is also highly available by pairing replication with a failover mechanism or managed HA service, and use TLS connections to protect database traffic.
