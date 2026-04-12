# How to Install and Configure MaxScale for MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, MaxScale, Database Proxy, MariaDB, Load Balancing

Description: Install and configure MariaDB MaxScale as a MySQL proxy with connection pooling, read-write splitting, and automatic failover.

---

## What is MaxScale?

MariaDB MaxScale is an advanced database proxy that provides connection routing, load balancing, automatic failover, and query filtering for MySQL and MariaDB. It is protocol-aware and can parse SQL to make intelligent routing decisions.

## Installation on Ubuntu/Debian

```bash
# Add MariaDB repository
curl -LsS https://r.mariadb.com/downloads/mariadb_repo_setup | bash

apt-get update && apt-get install maxscale
```

## Installation on RHEL/CentOS

```bash
curl -LsS https://r.mariadb.com/downloads/mariadb_repo_setup | bash
yum install maxscale
```

## Basic Configuration File

MaxScale uses `/etc/maxscale.cnf` for its configuration:

```ini
[maxscale]
threads=auto
log_augmentation=1

[primary]
type=server
address=192.168.1.101
port=3306
protocol=MariaDBBackend

[replica1]
type=server
address=192.168.1.102
port=3306
protocol=MariaDBBackend

[replica2]
type=server
address=192.168.1.103
port=3306
protocol=MariaDBBackend

[replication-monitor]
type=monitor
module=mariadbmon
servers=primary,replica1,replica2
user=maxscale_monitor
password=MonitorPass123!
monitor_interval=2000ms
auto_failover=true
auto_rejoin=true

[read-write-service]
type=service
router=readwritesplit
servers=primary,replica1,replica2
user=maxscale_user
password=MaxScalePass123!
master_accept_reads=false

[read-write-listener]
type=listener
service=read-write-service
protocol=MariaDBClient
port=4006
```

## Creating Required MySQL Users

```sql
-- Monitoring user
CREATE USER 'maxscale_monitor'@'%' IDENTIFIED BY 'MonitorPass123!';
GRANT REPLICATION CLIENT, SUPER, RELOAD, PROCESS, SHOW DATABASES, EVENT ON *.* TO 'maxscale_monitor'@'%';
GRANT SELECT ON mysql.* TO 'maxscale_monitor'@'%';
GRANT SELECT ON performance_schema.* TO 'maxscale_monitor'@'%';

-- Service user
CREATE USER 'maxscale_user'@'%' IDENTIFIED BY 'MaxScalePass123!';
GRANT SELECT ON mysql.* TO 'maxscale_user'@'%';
GRANT SELECT ON performance_schema.* TO 'maxscale_user'@'%';
GRANT SHOW DATABASES ON *.* TO 'maxscale_user'@'%';
```

## Starting MaxScale

```bash
systemctl enable maxscale
systemctl start maxscale
```

Check the status:

```bash
systemctl status maxscale
journalctl -u maxscale -f
```

## Using the MaxScale CLI (maxctrl)

```bash
# Show server status
maxctrl list servers

# Show services
maxctrl list services

# Show monitors
maxctrl list monitors
```

Example output:

```text
┌──────────┬─────────────────┬──────┬─────────────┬─────────────────────────┐
│ Server   │ Address         │ Port │ Connections │ State                   │
├──────────┼─────────────────┼──────┼─────────────┼─────────────────────────┤
│ primary  │ 192.168.1.101   │ 3306 │ 5           │ Master, Running         │
│ replica1 │ 192.168.1.102   │ 3306 │ 3           │ Slave, Running          │
│ replica2 │ 192.168.1.103   │ 3306 │ 3           │ Slave, Running          │
└──────────┴─────────────────┴──────┴─────────────┴─────────────────────────┘
```

## Connecting Through MaxScale

Applications connect to MaxScale on port 4006 using standard MySQL credentials:

```bash
mysql -u appuser -pAppPass123! -h 127.0.0.1 -P 4006 mydb
```

## Adding a Read-Only Service

For applications that only need read access, add a dedicated read-only service:

```ini
[read-only-service]
type=service
router=readconnroute
servers=replica1,replica2
user=maxscale_user
password=MaxScalePass123!
router_options=slave

[read-only-listener]
type=listener
service=read-only-service
protocol=MariaDBClient
port=4007
```

## Summary

MaxScale is installed from the MariaDB repository and configured via `/etc/maxscale.cnf`. It requires three configuration blocks per component: server definitions, a monitor for health checking, and a service with a listener. The `readwritesplit` router automatically routes writes to the primary and reads to replicas, with automatic failover handled by the `mariadbmon` monitor.
