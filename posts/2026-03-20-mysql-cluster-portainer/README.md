# How to Deploy a MySQL Cluster with Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, MySQL, Database, Clustering, High Availability

Description: Deploy a MySQL InnoDB Cluster with Group Replication and MySQL Router for high availability using Portainer.

## Introduction

MySQL InnoDB Cluster provides high availability through automatic failover. It consists of 3+ MySQL instances using Group Replication plus MySQL Router for client routing. This guide covers deploying a fault-tolerant MySQL cluster using Portainer.

## Step 1: Deploy the MySQL Cluster Stack

```yaml
# docker-compose.yml - MySQL InnoDB Cluster

version: "3.8"

networks:
  mysql_cluster_net:
    driver: bridge
    ipam:
      config:
        - subnet: 172.28.0.0/24

volumes:
  mysql1_data:
  mysql2_data:
  mysql3_data:

services:
  # MySQL Node 1 (Primary)
  mysql1:
    image: mysql/mysql-server:8.0
    container_name: mysql1
    restart: unless-stopped
    hostname: mysql1
    networks:
      mysql_cluster_net:
        ipv4_address: 172.28.0.10
    ports:
      - "3306:3306"
    environment:
      - MYSQL_ROOT_PASSWORD=root_secure_password
      - MYSQL_ROOT_HOST=%
    volumes:
      - mysql1_data:/var/lib/mysql
      - ./mysql/my.cnf:/etc/mysql/conf.d/cluster.cnf
      - ./mysql/init.sql:/docker-entrypoint-initdb.d/init.sql
    command:
      - "--server-id=1"
      - "--gtid-mode=ON"
      - "--enforce-gtid-consistency=ON"
      - "--binlog-row-metadata=FULL"
      - "--binlog-transaction-dependency-tracking=WRITESET"
      - "--slave-preserve-commit-order=ON"
      - "--log-bin=mysql-binlog"
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-uroot", "-proot_secure_password"]
      interval: 10s
      retries: 5
      start_period: 30s

  # MySQL Node 2 (Secondary)
  mysql2:
    image: mysql/mysql-server:8.0
    container_name: mysql2
    restart: unless-stopped
    hostname: mysql2
    networks:
      mysql_cluster_net:
        ipv4_address: 172.28.0.11
    environment:
      - MYSQL_ROOT_PASSWORD=root_secure_password
      - MYSQL_ROOT_HOST=%
    volumes:
      - mysql2_data:/var/lib/mysql
      - ./mysql/my.cnf:/etc/mysql/conf.d/cluster.cnf
    command:
      - "--server-id=2"
      - "--gtid-mode=ON"
      - "--enforce-gtid-consistency=ON"
      - "--binlog-row-metadata=FULL"
      - "--log-bin=mysql-binlog"
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-uroot", "-proot_secure_password"]
      interval: 10s
      retries: 5
      start_period: 30s

  # MySQL Node 3 (Secondary)
  mysql3:
    image: mysql/mysql-server:8.0
    container_name: mysql3
    restart: unless-stopped
    hostname: mysql3
    networks:
      mysql_cluster_net:
        ipv4_address: 172.28.0.12
    environment:
      - MYSQL_ROOT_PASSWORD=root_secure_password
      - MYSQL_ROOT_HOST=%
    volumes:
      - mysql3_data:/var/lib/mysql
      - ./mysql/my.cnf:/etc/mysql/conf.d/cluster.cnf
    command:
      - "--server-id=3"
      - "--gtid-mode=ON"
      - "--enforce-gtid-consistency=ON"
      - "--binlog-row-metadata=FULL"
      - "--log-bin=mysql-binlog"
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-uroot", "-proot_secure_password"]
      interval: 10s
      retries: 5
      start_period: 30s

  # MySQL Router - routes connections to primary/secondary
  mysql_router:
    image: mysql/mysql-router:8.0
    container_name: mysql_router
    restart: unless-stopped
    ports:
      - "6446:6446"   # Read-write (primary)
      - "6447:6447"   # Read-only (secondaries)
    environment:
      - MYSQL_HOST=mysql1
      - MYSQL_PORT=3306
      - MYSQL_USER=root
      - MYSQL_PASSWORD=root_secure_password
      - MYSQL_INNODB_CLUSTER_MEMBERS=3
    networks:
      - mysql_cluster_net
    depends_on:
      mysql1:
        condition: service_healthy
```

## Step 2: MySQL Configuration File

```ini
# mysql/my.cnf
[mysqld]
# Group Replication settings
plugin-load-add=group_replication.so
group_replication_group_name="aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
group_replication_start_on_boot=off
group_replication_local_address=""
group_replication_group_seeds="mysql1:33061,mysql2:33061,mysql3:33061"
group_replication_bootstrap_group=off

# Performance settings
innodb_buffer_pool_size=256M
max_connections=200
```

## Step 3: Initialize the Cluster

```bash
# After deploying, initialize the cluster
docker exec -it mysql1 mysqlsh --uri root:root_secure_password@localhost

# In MySQL Shell:
# Create cluster admin user
```

```javascript
// In mysqlsh
// Set up replication user
session.runSql("CREATE USER 'clusteradmin'@'%' IDENTIFIED BY 'cluster_admin_pass'");
session.runSql("GRANT ALL ON *.* TO 'clusteradmin'@'%' WITH GRANT OPTION");

// Create the cluster
var cluster = dba.createCluster('MyCluster', {
  memberSslMode: 'REQUIRED',
  ipAllowlist: "172.28.0.0/24",
  localAddress: "mysql1:33061"
});

// Add secondary nodes
cluster.addInstance('clusteradmin@mysql2:3306', {
  password: 'cluster_admin_pass',
  recoveryMethod: 'clone',
  ipAllowlist: "172.28.0.0/24"
});

cluster.addInstance('clusteradmin@mysql3:3306', {
  password: 'cluster_admin_pass',
  recoveryMethod: 'clone',
  ipAllowlist: "172.28.0.0/24"
});

// Check cluster status
cluster.status();
```

## Step 4: Bootstrap MySQL Router

```bash
# Bootstrap MySQL Router to connect to the cluster
docker exec mysql_router mysqlrouter \
  --bootstrap root:root_secure_password@mysql1:3306 \
  --user=mysqlrouter \
  --conf-use-gr-notifications \
  --force
```

## Step 5: Connect Applications to the Cluster

```python
# Application connection via MySQL Router
import mysql.connector

# Write connection (goes to primary)
write_conn = mysql.connector.connect(
    host="mysql_router",
    port=6446,         # Read-write port
    user="appuser",
    password="app_password",
    database="myapp"
)

# Read connection (load balanced across secondaries)
read_conn = mysql.connector.connect(
    host="mysql_router",
    port=6447,         # Read-only port
    user="appuser",
    password="app_password",
    database="myapp"
)
```

## Step 6: Test Failover

```bash
# Stop the primary
docker stop mysql1

# Check cluster status (from another node)
docker exec mysql2 mysqlsh --uri clusteradmin:cluster_admin_pass@localhost \
  -e "dba.getCluster().status()"

# The router automatically routes to the new primary
# Restart original node
docker start mysql1
```

## Backup Strategy

```bash
#!/bin/bash
# backup-mysql-cluster.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups/mysql"
mkdir -p "$BACKUP_DIR"

# Use mysqldump on the read replica to avoid load on primary
docker exec mysql2 mysqldump \
  -h localhost \
  -u root \
  -proot_secure_password \
  --all-databases \
  --single-transaction \
  --routines \
  --triggers \
  | gzip > "$BACKUP_DIR/mysql_backup_$DATE.sql.gz"

echo "MySQL cluster backup: $DATE"
find "$BACKUP_DIR" -mtime +7 -delete
```

## Monitoring in Portainer

Use Portainer to:
- Monitor all three MySQL container states
- Check container CPU and memory (MySQL is memory-intensive)
- View error logs when replication issues occur

```bash
# Check replication status
docker exec mysql1 mysql -uroot -proot_secure_password \
  -e "SELECT * FROM performance_schema.replication_group_members\G"
```

## Conclusion

You now have a highly available MySQL InnoDB Cluster running in Docker managed through Portainer. The three-node cluster can survive the loss of one node without downtime, MySQL Router transparently routes writes to the primary and reads to secondaries, and automatic failover promotes a secondary when the primary fails. Portainer makes it easy to monitor all three nodes and restart any that have issues.
