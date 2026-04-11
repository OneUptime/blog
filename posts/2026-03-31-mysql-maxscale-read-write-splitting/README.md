# How to Set Up Read-Write Splitting with MaxScale for MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, MaxScale, Replication, Read-Write Splitting, Database

Description: Learn how to configure MaxScale to automatically route MySQL write queries to the primary and read queries to replicas, reducing primary load and improving scalability.

---

Read-write splitting with MaxScale routes `SELECT` queries to MySQL replicas and `INSERT`, `UPDATE`, `DELETE` queries to the primary. This reduces load on the primary and scales read capacity by adding replicas without changing application code.

## Prerequisites

You need a running MySQL replication setup with one primary and at least one replica. MaxScale must be installed and accessible on port 4006 (by default).

## Installing MaxScale

```bash
# On Ubuntu
wget https://dlm.mariadb.com/enterprise-release-helpers/mariadb_es_repo_setup
chmod +x mariadb_es_repo_setup
sudo ./mariadb_es_repo_setup --apply --mariadb-maxscale-version=23.08
sudo apt install maxscale
```

## Creating a MaxScale MySQL User

On the MySQL primary, create a dedicated user for MaxScale monitoring:

```sql
CREATE USER 'maxscale'@'%' IDENTIFIED BY 'maxscale_password';
GRANT SELECT ON mysql.* TO 'maxscale'@'%';
GRANT SHOW DATABASES ON *.* TO 'maxscale'@'%';
GRANT REPLICATION CLIENT ON *.* TO 'maxscale'@'%';
GRANT SUPER ON *.* TO 'maxscale'@'%';
FLUSH PRIVILEGES;
```

## Configuring MaxScale for Read-Write Splitting

Edit `/etc/maxscale.cnf`:

```ini
[maxscale]
threads=auto
log_augmentation=1

# Primary server
[primary]
type=server
address=192.168.1.10
port=3306
protocol=MariaDBBackend

# Replica servers
[replica1]
type=server
address=192.168.1.11
port=3306
protocol=MariaDBBackend

[replica2]
type=server
address=192.168.1.12
port=3306
protocol=MariaDBBackend

# Monitor
[mysql-monitor]
type=monitor
module=mariadbmon
servers=primary,replica1,replica2
user=maxscale
password=maxscale_password
monitor_interval=2000ms
auto_failover=false

# Read-write split router
[read-write-router]
type=service
router=readwritesplit
servers=primary,replica1,replica2
user=maxscale
password=maxscale_password
slave_selection_criteria=LEAST_CURRENT_OPERATIONS
max_slave_connections=100%

# Listener
[rw-listener]
type=listener
service=read-write-router
protocol=MariaDBClient
port=4006
address=0.0.0.0
```

## Starting MaxScale and Verifying Configuration

```bash
systemctl start maxscale
systemctl enable maxscale

# Check status of servers
maxctrl list servers

# Check service status
maxctrl list services
```

You should see output like:

```text
┌──────────┬──────────────────┬──────┬─────────────┬─────────────────────┐
│ Server   │ Address          │ Port │ Connections │ State               │
├──────────┼──────────────────┼──────┼─────────────┼─────────────────────┤
│ primary  │ 192.168.1.10     │ 3306 │ 0           │ Master, Running     │
│ replica1 │ 192.168.1.11     │ 3306 │ 0           │ Slave, Running      │
│ replica2 │ 192.168.1.12     │ 3306 │ 0           │ Slave, Running      │
└──────────┴──────────────────┴──────┴─────────────┴─────────────────────┘
```

## Testing Read-Write Splitting

Connect through MaxScale on port 4006 and verify routing:

```bash
mysql -u appuser -p -h 127.0.0.1 -P 4006 mydb
```

```sql
-- This should go to a replica
SELECT @@hostname;

-- This should go to the primary
INSERT INTO test_table (val) VALUES ('hello');

-- Force a query to the primary using a hint
SELECT @@hostname /* maxscale route to master */;
```

Check routing statistics via MaxScale admin:

```bash
maxctrl show service read-write-router
```

## Tuning Replica Selection

MaxScale supports several replica selection strategies:

```ini
# Route reads to the least loaded replica
slave_selection_criteria=LEAST_CURRENT_OPERATIONS

# Route reads to the replica with least replication lag
slave_selection_criteria=LEAST_BEHIND_MASTER

# Route to the replica with fewest total connections
slave_selection_criteria=LEAST_ROUTER_CONNECTIONS
```

## Summary

MaxScale's `readwritesplit` router automatically routes write queries to the MySQL primary and read queries to replicas, without any application changes. Configure the monitor to track replication topology, set `slave_selection_criteria` based on your workload, and use `maxctrl list servers` to verify all nodes are properly detected. This setup scales read throughput horizontally by simply adding more replicas.
