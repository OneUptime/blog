# What Is MaxScale for MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, MaxScale, MariaDB, Proxy, Load Balancing, High Availability

Description: MaxScale is an open-source database proxy from MariaDB Corporation that provides intelligent query routing, load balancing, and automatic failover for MySQL and MariaDB clusters.

---

## Overview

MaxScale is a database proxy developed by MariaDB Corporation, designed to work with both MariaDB and MySQL. It provides advanced query routing, connection pooling, automatic failover detection, and read/write splitting at the proxy layer. Unlike simple load balancers, MaxScale understands the MySQL protocol at a deep level, enabling sophisticated routing decisions based on query type, user, and server health.

## MaxScale vs ProxySQL

| Feature | MaxScale | ProxySQL |
|---------|----------|----------|
| Primary focus | MariaDB/MySQL routing | MySQL connection pooling |
| Topology awareness | Built-in Galera/replication monitor | Requires external tools |
| Configuration | File-based (maxscale.cnf) | Runtime SQL interface |
| Filters | Rich plugin filter system | Limited query rewriting |
| License | BSL (Business Source License) | GPLv3 |
| Admin interface | MaxCtrl CLI + REST API | MySQL admin protocol |

## Installation

```bash
# On RHEL/CentOS
curl -LsS https://downloads.mariadb.com/MaxScale/2.5/centos/7/x86_64/maxscale-2.5.20-1.rhel.7.x86_64.rpm -o maxscale.rpm
rpm -ivh maxscale.rpm
systemctl enable maxscale
systemctl start maxscale
```

## Basic Configuration

MaxScale is configured via `/etc/maxscale.cnf`:

```text
[maxscale]
threads=auto
log_info=true

# Define backend servers
[primary]
type=server
address=10.0.1.10
port=3306
protocol=MariaDBBackend

[replica-1]
type=server
address=10.0.1.11
port=3306
protocol=MariaDBBackend

[replica-2]
type=server
address=10.0.1.12
port=3306
protocol=MariaDBBackend

# Replication monitor - detects topology changes automatically
[replication-monitor]
type=monitor
module=mariadbmon
servers=primary,replica-1,replica-2
user=maxscale_monitor
password=monitorpass
monitor_interval=2000ms
auto_failover=true
auto_rejoin=true
replication_user=repl_user
replication_password=replpass

# Read/Write Split Service
[rw-split-service]
type=service
router=readwritesplit
servers=primary,replica-1,replica-2
user=maxscale_router
password=routerpass
master_failure_mode=fail_on_write
transaction_replay=true

# Listener - the port applications connect to
[rw-split-listener]
type=listener
service=rw-split-service
protocol=MariaDBClient
port=3306
```

## Creating Monitor and Router Users in MySQL

```sql
-- User for the MaxScale monitor
CREATE USER 'maxscale_monitor'@'%' IDENTIFIED BY 'monitorpass';
GRANT REPLICATION CLIENT, SUPER, RELOAD, PROCESS ON *.* TO 'maxscale_monitor'@'%';

-- User for the router (needs to see all databases and users)
CREATE USER 'maxscale_router'@'%' IDENTIFIED BY 'routerpass';
GRANT SELECT ON mysql.user TO 'maxscale_router'@'%';
GRANT SELECT ON mysql.db TO 'maxscale_router'@'%';
GRANT SELECT ON mysql.tables_priv TO 'maxscale_router'@'%';
GRANT SELECT ON mysql.columns_priv TO 'maxscale_router'@'%';
GRANT SELECT ON mysql.procs_priv TO 'maxscale_router'@'%';
GRANT SELECT ON mysql.proxies_priv TO 'maxscale_router'@'%';
GRANT SELECT ON mysql.roles_mapping TO 'maxscale_router'@'%';
GRANT SHOW DATABASES ON *.* TO 'maxscale_router'@'%';
FLUSH PRIVILEGES;
```

## MaxCtrl - Administration CLI

```bash
# List all servers and their current state
maxctrl list servers

# List services
maxctrl list services

# Show server details
maxctrl show server primary

# Drain a server (stop new connections, wait for existing to finish)
maxctrl set server replica-1 drain

# Clear the drain state
maxctrl clear server replica-1 drain

# Show monitor status
maxctrl show monitor replication-monitor
```

```text
maxctrl list servers:
+-----------+------------+------+-------------+-----------------+
| Server    | Address    | Port | Connections | State           |
+-----------+------------+------+-------------+-----------------+
| primary   | 10.0.1.10  | 3306 | 45          | Master, Running |
| replica-1 | 10.0.1.11  | 3306 | 23          | Slave, Running  |
| replica-2 | 10.0.1.12  | 3306 | 19          | Slave, Running  |
+-----------+------------+------+-------------+-----------------+
```

## Query Filters

MaxScale supports a powerful filter system that can transform queries:

```text
# Add a query logging filter
[query-log-filter]
type=filter
module=qlafilter
filebase=/var/log/maxscale/query
log_type=unified
log_data=date,user,reply_time,query

# Add the filter to a service
[rw-split-service]
type=service
router=readwritesplit
filters=query-log-filter
...
```

## Automatic Failover

MaxScale's `mariadbmon` module continuously monitors replication and can automatically promote a replica when the primary fails:

```text
[replication-monitor]
type=monitor
module=mariadbmon
auto_failover=true           # Automatically elect new primary
auto_rejoin=true             # Automatically rejoin old primary as replica
failcount=3                  # Fail after 3 consecutive failed health checks
```

When failover occurs, MaxScale updates its routing tables instantly - applications connected to MaxScale automatically start using the new primary with no code changes.

## REST API

MaxScale exposes a REST API for programmatic management:

```bash
# Get server status via REST API
curl -u admin:mariadb http://localhost:8989/v1/servers/primary | jq '.data.attributes.state'

# Trigger manual failover
curl -X POST -u admin:mariadb \
  http://localhost:8989/v1/monitors/replication-monitor/failover
```

## Summary

MaxScale is a feature-rich MySQL and MariaDB proxy offering deep protocol awareness, automatic topology detection, and self-healing failover capabilities. Its built-in replication monitor distinguishes it from simpler proxies by providing automatic primary promotion without external orchestration tools. For organizations running MariaDB Galera clusters or standard MySQL replication, MaxScale provides a robust, policy-driven routing layer that abstracts backend topology from applications.
