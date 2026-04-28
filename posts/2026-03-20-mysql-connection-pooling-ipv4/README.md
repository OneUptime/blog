# How to Set Up MySQL Connection Pooling with ProxySQL on IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, ProxySQL, Connection Pooling, IPv4, Performance, Database

Description: Configure ProxySQL as a MySQL connection pool on IPv4, define backend servers, set connection limits, and route read queries to replicas for improved performance.

## Introduction

MySQL has a connection limit and each connection consumes memory. ProxySQL acts as a proxy that maintains a connection pool, multiplexing many client connections over fewer persistent MySQL connections. It also enables read/write splitting between primary and replicas.

## Installing ProxySQL

```bash
# Debian/Ubuntu

curl -LO https://github.com/sysown/proxysql/releases/download/v2.5.5/proxysql_2.5.5-debian11_amd64.deb
sudo dpkg -i proxysql_2.5.5-debian11_amd64.deb

# RHEL/CentOS
sudo yum install proxysql

# Start ProxySQL
sudo systemctl enable --now proxysql

# Connect to ProxySQL admin interface
mysql -h 127.0.0.1 -P 6032 -u admin -padmin --prompt='ProxySQL> '
```

## Configuring Backend MySQL Servers

```sql
-- Connect to ProxySQL admin (port 6032)
-- Add MySQL backend servers

-- Primary (read-write)
INSERT INTO mysql_servers (hostgroup_id, hostname, port, max_connections)
VALUES (10, '10.0.0.1', 3306, 100);

-- Replica 1 (read-only)
INSERT INTO mysql_servers (hostgroup_id, hostname, port, max_connections)
VALUES (20, '10.0.0.2', 3306, 100);

-- Replica 2 (read-only)
INSERT INTO mysql_servers (hostgroup_id, hostname, port, max_connections)
VALUES (20, '10.0.0.3', 3306, 100);

-- Apply changes
LOAD MYSQL SERVERS TO RUNTIME;
SAVE MYSQL SERVERS TO DISK;
```

## Configuring MySQL User

```sql
-- In ProxySQL admin:
INSERT INTO mysql_users (username, password, default_hostgroup)
VALUES ('appuser', 'password', 10);   -- Default: read-write hostgroup

LOAD MYSQL USERS TO RUNTIME;
SAVE MYSQL USERS TO DISK;

-- In MySQL backend (on each server):
-- CREATE USER 'appuser'@'10.0.0.%' IDENTIFIED BY 'password';
-- GRANT ALL ON appdb.* TO 'appuser'@'10.0.0.%';
-- GRANT SELECT ON appdb.* TO 'appuser'@'10.0.0.%';  -- On replicas
```

## Read/Write Splitting

```sql
-- In ProxySQL admin: Route SELECT to replicas, writes to primary
INSERT INTO mysql_query_rules (rule_id, active, match_pattern, destination_hostgroup)
VALUES (1, 1, '^SELECT .* FOR UPDATE', 10);   -- SELECT FOR UPDATE → primary

INSERT INTO mysql_query_rules (rule_id, active, match_pattern, destination_hostgroup)
VALUES (2, 1, '^SELECT', 20);                 -- All other SELECTs → replicas

LOAD MYSQL QUERY RULES TO RUNTIME;
SAVE MYSQL QUERY RULES TO DISK;
```

## ProxySQL Listener Configuration

```sql
-- ProxySQL by default listens on 0.0.0.0:6033 for MySQL clients
-- Restrict to specific IPv4:
-- /etc/proxysql.cnf
-- mysql_variables = { interfaces="10.0.0.5:6033" }

-- Check current interfaces
SELECT * FROM global_variables WHERE variable_name LIKE 'mysql-interfaces';

-- Update if needed (mysql-interfaces cannot be changed at runtime;
-- save to disk and restart ProxySQL for the change to take effect)
UPDATE global_variables SET variable_value='10.0.0.5:6033'
WHERE variable_name='mysql-interfaces';
SAVE MYSQL VARIABLES TO DISK;
-- sudo systemctl restart proxysql
```

## Connecting Through ProxySQL

```bash
# Applications connect to ProxySQL (port 6033) instead of MySQL directly
mysql -h 10.0.0.5 -P 6033 -u appuser -p appdb

# Verify connection pooling stats
mysql -h 127.0.0.1 -P 6032 -u admin -padmin \
  -e "SELECT * FROM stats.stats_mysql_connection_pool;"
```

## Conclusion

ProxySQL connection pooling reduces MySQL connection overhead by multiplexing client connections. Configure backend servers in `mysql_servers`, define users in `mysql_users`, and use `mysql_query_rules` for read/write splitting. Applications connect to ProxySQL on port 6033 using the same MySQL protocol. Monitor pool health with `stats.stats_mysql_connection_pool`.
