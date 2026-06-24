# How to Deploy MariaDB via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, MariaDB, Database, Self-Hosted, MySQL

Description: Deploy MariaDB via Portainer as a MySQL-compatible database with Galera clustering support, persistent storage, and optimized configuration.

## Introduction

MariaDB is a community-driven MySQL fork with additional storage engines and Galera clustering options for high availability. It is the default MySQL replacement in many Linux distributions and is highly compatible with MySQL protocols, connectors, and many applications, though there are compatibility differences to test.

## Deploy as a Stack

In Portainer, create a stack named `mariadb`:

```yaml
version: "3.8"

services:
  mariadb:
    image: mariadb:11.4
    container_name: mariadb
    environment:
      MARIADB_ROOT_PASSWORD: change_this_root_password
      MARIADB_DATABASE: myapp
      MARIADB_USER: myapp_user
      MARIADB_PASSWORD: change_this_app_password
    volumes:
      # Persistent data
      - mariadb_data:/var/lib/mysql
      # Optional: mount host paths for custom configuration or init scripts
      # - /opt/stacks/mariadb/mariadb.cnf:/etc/mysql/conf.d/custom.cnf:ro
      # - /opt/stacks/mariadb/init:/docker-entrypoint-initdb.d:ro
    ports:
      - "3306:3306"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 60s

  # Adminer - lightweight database admin UI
  adminer:
    image: adminer:latest
    container_name: adminer
    ports:
      - "8080:8080"
    environment:
      ADMINER_DEFAULT_SERVER: mariadb
    restart: unless-stopped

volumes:
  mariadb_data:
```

## MariaDB-Specific Configuration

Create `mariadb.cnf` and mount it into `/etc/mysql/conf.d/custom.cnf` if you want a custom server configuration:

```ini
[mysqld]
# Character set and collation

character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci

# InnoDB settings
innodb_buffer_pool_size = 512M
innodb_log_file_size = 128M
innodb_flush_log_at_trx_commit = 1

# MariaDB-specific: Aria storage engine (replacement for MyISAM)
aria_pagecache_buffer_size = 128M

# Connection settings
max_connections = 150
wait_timeout = 600

# Binary log for replication
log_bin = /var/lib/mysql/mysql-bin
binlog_format = ROW
expire_logs_days = 7

# Slow query log
slow_query_log = ON
slow_query_log_file = /var/lib/mysql/slow-query.log
long_query_time = 1
log_queries_not_using_indexes = ON
```

## MariaDB vs MySQL Key Differences

| Feature | MariaDB | MySQL |
|---------|---------|-------|
| JSON support | Yes (different implementation) | Yes |
| Galera Clustering | Available via MariaDB Galera Cluster | Requires InnoDB Cluster |
| Virtual columns | More features | Basic |
| Storage engines | Aria, MyRocks, ColumnStore | InnoDB, MyISAM |
| Default auth plugin | mysql_native_password | caching_sha2_password |

## Setting Up MariaDB Replication

For read scaling with a replica, the primary needs binary logging enabled and the replica needs a unique server ID:

```yaml
version: "3.8"

services:
  mariadb-primary:
    image: mariadb:11.4
    container_name: mariadb-primary
    command: --log-bin --log-basename=mariadb
    environment:
      MARIADB_ROOT_PASSWORD: root_password
      MARIADB_DATABASE: myapp
      MARIADB_REPLICATION_USER: replicator
      MARIADB_REPLICATION_PASSWORD: replication_password
    volumes:
      - primary_data:/var/lib/mysql
    ports:
      - "3306:3306"
    restart: unless-stopped

  mariadb-replica:
    image: mariadb:11.4
    container_name: mariadb-replica
    command: --server-id=2 --log-basename=mariadb
    environment:
      MARIADB_ROOT_PASSWORD: root_password
      MARIADB_REPLICATION_USER: replicator
      MARIADB_REPLICATION_PASSWORD: replication_password
      MARIADB_MASTER_HOST: mariadb-primary
    volumes:
      - replica_data:/var/lib/mysql
    ports:
      - "3307:3306"
    depends_on:
      - mariadb-primary
    restart: unless-stopped

volumes:
  primary_data:
  replica_data:
```

## Backup with mariadb-dump

```bash
# Full backup
docker exec mariadb mariadb-dump \
  -u root -p"change_this_root_password" \
  --all-databases \
  --single-transaction \
  --flush-logs \
  --master-data=2 \
  > mariadb-backup-$(date +%Y%m%d).sql

# Compressed backup
docker exec mariadb mariadb-dump \
  -u root -p"change_this_root_password" \
  --all-databases \
  --single-transaction | gzip > mariadb-backup-$(date +%Y%m%d).sql.gz
```

## Conclusion

MariaDB deployed via Portainer is a strong MySQL-compatible database choice with flexible clustering and replication options. The Adminer interface provides lightweight database management, and the persistent volume ensures data survives container updates. MariaDB works with many MySQL connectors and applications, but you should still validate compatibility for your specific workload.
