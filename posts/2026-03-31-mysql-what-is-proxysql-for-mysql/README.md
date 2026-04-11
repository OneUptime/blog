# What Is ProxySQL for MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, ProxySQL, Proxy, Load Balancing, High Availability

Description: ProxySQL is a high-performance MySQL protocol-aware proxy that provides connection pooling, query routing, load balancing, and query rewriting between applications and MySQL servers.

---

## Overview

ProxySQL is an open-source, high-performance proxy designed specifically for MySQL (and MySQL-compatible databases like Percona Server and MariaDB). It sits between your application tier and your MySQL servers, transparently handling connection pooling, read/write splitting, query routing, and failover without requiring application code changes.

## Architecture

```text
Application Servers
       |
       v
  ProxySQL (port 3306)
  - Connection Multiplexing
  - Query Routing Rules
  - Query Cache
  - Query Rewriting
       |
       +---> MySQL Primary  (writes)
       |
       +---> MySQL Replica 1 (reads)
       |
       +---> MySQL Replica 2 (reads)

ProxySQL Admin (port 6032)
  - Runtime configuration
  - Monitoring dashboard
```

## Installation

```bash
# On RHEL/CentOS/Amazon Linux
rpm -ivh proxysql-2.6.0-1-centos7.x86_64.rpm
systemctl enable proxysql
systemctl start proxysql

# On Debian/Ubuntu
dpkg -i proxysql_2.6.0-ubuntu22_amd64.deb
systemctl start proxysql
```

## Basic Configuration

ProxySQL uses an in-memory SQLite database for configuration. Connect to the admin interface:

```bash
mysql -h 127.0.0.1 -P 6032 -u admin -padmin --prompt "ProxySQL Admin> "
```

### Add MySQL Servers

```sql
-- Add backend MySQL servers
INSERT INTO mysql_servers (hostgroup_id, hostname, port, weight, comment)
VALUES
    (10, '10.0.1.10', 3306, 1000, 'primary'),
    (20, '10.0.1.11', 3306, 1000, 'replica-1'),
    (20, '10.0.1.12', 3306, 1000, 'replica-2');

-- Hostgroup 10 = writes, Hostgroup 20 = reads
```

### Add MySQL Users

```sql
INSERT INTO mysql_users (username, password, default_hostgroup, transaction_persistent)
VALUES ('appuser', 'secret', 10, 1);
-- default_hostgroup=10 means writes go to primary by default
```

### Configure Read/Write Splitting

```sql
-- Route SELECT queries to the read hostgroup (20)
INSERT INTO mysql_query_rules (rule_id, active, match_pattern, destination_hostgroup, apply)
VALUES
    (1, 1, '^SELECT.*FOR UPDATE', 10, 1),  -- SELECT FOR UPDATE stays on primary
    (2, 1, '^SELECT', 20, 1);              -- All other SELECTs go to replicas

-- Apply changes
LOAD MYSQL SERVERS TO RUNTIME;
SAVE MYSQL SERVERS TO DISK;
LOAD MYSQL USERS TO RUNTIME;
SAVE MYSQL USERS TO DISK;
LOAD MYSQL QUERY RULES TO RUNTIME;
SAVE MYSQL QUERY RULES TO DISK;
```

## Monitoring Backends

```sql
-- Check server health status
SELECT * FROM mysql_server_ping_log ORDER BY time_start_us DESC LIMIT 10;

-- Check connection pool stats
SELECT hostgroup, srv_host, status, ConnUsed, ConnFree, ConnERR
FROM stats_mysql_connection_pool;
```

```text
+-----------+------------+--------+----------+----------+---------+
| hostgroup | srv_host   | status | ConnUsed | ConnFree | ConnERR |
+-----------+------------+--------+----------+----------+---------+
|        10 | 10.0.1.10  | ONLINE |        5 |       15 |       0 |
|        20 | 10.0.1.11  | ONLINE |        3 |       17 |       0 |
|        20 | 10.0.1.12  | ONLINE |        2 |       18 |       0 |
+-----------+------------+--------+----------+----------+---------+
```

## Query Statistics

ProxySQL tracks query performance for every distinct query digest:

```sql
SELECT digest_text, count_star, sum_time, min_time, max_time, sum_time/count_star AS avg_time
FROM stats_mysql_query_digest
ORDER BY sum_time DESC
LIMIT 10;
```

This makes ProxySQL an invaluable tool for identifying slow queries without relying on the MySQL slow query log.

## Connection Multiplexing

ProxySQL multiplexes thousands of application connections onto a much smaller number of backend connections:

```sql
-- Configure connection pool size per hostgroup
UPDATE mysql_servers SET max_connections = 50
WHERE hostgroup_id = 10;

UPDATE mysql_servers SET max_connections = 100
WHERE hostgroup_id = 20;

LOAD MYSQL SERVERS TO RUNTIME;
```

## Query Caching

```sql
-- Cache queries matching a pattern for 5 seconds
INSERT INTO mysql_query_rules (rule_id, active, match_pattern, cache_ttl, apply)
VALUES (100, 1, '^SELECT.*FROM product_catalog', 5000, 1);

LOAD MYSQL QUERY RULES TO RUNTIME;
```

## Failover Handling

Combined with a replication topology manager like Orchestrator or MHA, ProxySQL can automatically update routing when a primary fails:

```bash
# Orchestrator calls this on failover
mysql -h 127.0.0.1 -P 6032 -u admin -padmin -e "
    UPDATE mysql_servers SET status = 'OFFLINE_HARD'
    WHERE hostname = 'old-primary-host';
    UPDATE mysql_servers
    SET hostgroup_id = 10
    WHERE hostname = 'new-primary-host';
    LOAD MYSQL SERVERS TO RUNTIME;
    SAVE MYSQL SERVERS TO DISK;
"
```

## Summary

ProxySQL is the de facto standard proxy for MySQL deployments requiring high availability, read scaling, and connection management at scale. It provides transparent read/write splitting, connection pooling that reduces MySQL connection overhead by orders of magnitude, and real-time query analytics. Its runtime-reconfigurable architecture means topology changes and query routing updates happen without application restarts or downtime.
