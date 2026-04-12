# How to Run MySQL Replicas in Docker

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Docker, Replication, High Availability, DevOps

Description: Learn how to set up MySQL primary-replica replication using Docker containers with Docker Compose for a local development or staging environment.

---

## Overview

Running MySQL replication in Docker lets you test and develop against a primary-replica setup locally without provisioning multiple servers. This guide covers setting up a primary and one replica using Docker Compose with GTID-based replication, which is simpler to manage than traditional file/position-based replication.

## Docker Compose Setup

Create the directory structure:

```bash
mkdir mysql-replication
cd mysql-replication
mkdir -p primary/conf replica/conf
```

Primary configuration:

```text
# primary/conf/mysql.cnf
[mysqld]
server-id = 1
log_bin = mysql-bin
binlog_format = ROW
gtid_mode = ON
enforce_gtid_consistency = ON
binlog_expire_logs_seconds = 86400
```

Replica configuration:

```text
# replica/conf/mysql.cnf
[mysqld]
server-id = 2
log_bin = mysql-bin
binlog_format = ROW
gtid_mode = ON
enforce_gtid_consistency = ON
relay_log = relay-bin
read_only = ON
```

Docker Compose file:

```yaml
# docker-compose.yml
services:
  mysql-primary:
    image: mysql:8.0
    container_name: mysql-primary
    environment:
      MYSQL_ROOT_PASSWORD: rootsecret
      MYSQL_DATABASE: mydb
      MYSQL_USER: appuser
      MYSQL_PASSWORD: appsecret
    ports:
      - "3306:3306"
    volumes:
      - primary_data:/var/lib/mysql
      - ./primary/conf/mysql.cnf:/etc/mysql/conf.d/mysql.cnf:ro

  mysql-replica:
    image: mysql:8.0
    container_name: mysql-replica
    environment:
      MYSQL_ROOT_PASSWORD: rootsecret
    ports:
      - "3307:3306"
    volumes:
      - replica_data:/var/lib/mysql
      - ./replica/conf/mysql.cnf:/etc/mysql/conf.d/mysql.cnf:ro
    depends_on:
      - mysql-primary

volumes:
  primary_data:
  replica_data:
```

## Starting the Containers

```bash
docker compose up -d
docker compose logs -f
```

Wait until both containers show `ready for connections` in the logs.

## Creating the Replication User on the Primary

```bash
docker exec -it mysql-primary mysql -u root -prootsecret
```

```sql
CREATE USER 'replicator'@'%' IDENTIFIED WITH mysql_native_password BY 'replsecret';
GRANT REPLICATION SLAVE ON *.* TO 'replicator'@'%';
FLUSH PRIVILEGES;
```

## Configuring the Replica

Connect to the replica:

```bash
docker exec -it mysql-replica mysql -u root -prootsecret
```

Configure it to replicate from the primary:

```sql
CHANGE REPLICATION SOURCE TO
    SOURCE_HOST='mysql-primary',
    SOURCE_USER='replicator',
    SOURCE_PASSWORD='replsecret',
    SOURCE_AUTO_POSITION=1;

START REPLICA;
```

## Verifying Replication Is Working

```sql
-- On the replica
SHOW REPLICA STATUS\G
```

Check that both threads are running:

```text
Replica_IO_Running: Yes
Replica_SQL_Running: Yes
Seconds_Behind_Source: 0
```

Test replication by writing to the primary:

```bash
# On primary
docker exec mysql-primary mysql -u root -prootsecret mydb \
    -e "CREATE TABLE test (id INT AUTO_INCREMENT PRIMARY KEY, val VARCHAR(50)); INSERT INTO test (val) VALUES ('hello');"

# On replica - should see the data
docker exec mysql-replica mysql -u root -prootsecret mydb \
    -e "SELECT * FROM test;"
```

## Scaling to Multiple Replicas

Add a second replica in docker-compose.yml:

```yaml
  mysql-replica2:
    image: mysql:8.0
    container_name: mysql-replica2
    environment:
      MYSQL_ROOT_PASSWORD: rootsecret
    ports:
      - "3308:3306"
    volumes:
      - replica2_data:/var/lib/mysql
      - ./replica2/conf/mysql.cnf:/etc/mysql/conf.d/mysql.cnf:ro
    depends_on:
      - mysql-primary
```

Create a separate config with `server-id = 3` (must be unique per server).

## Stopping and Restarting Replication

```sql
-- Stop replication threads
STOP REPLICA;

-- Start replication again
START REPLICA;

-- Reset replication state (removes all replication configuration, requiring reconfiguration)
RESET REPLICA ALL;
```

## Connecting Applications to the Right Node

In a multi-service Compose setup, route reads to replica and writes to primary:

```yaml
  app:
    environment:
      DB_WRITE_HOST: mysql-primary
      DB_READ_HOST: mysql-replica
      DB_PORT: 3306
```

## Summary

Running MySQL replicas in Docker requires unique `server-id` values for each container, binary logging with ROW format, and GTID mode enabled on all nodes. Use Docker Compose to manage the multi-container topology, and GTID-based replication (`SOURCE_AUTO_POSITION=1`) for simpler failover and monitoring. Always verify both `Replica_IO_Running` and `Replica_SQL_Running` are `Yes` after setup.
