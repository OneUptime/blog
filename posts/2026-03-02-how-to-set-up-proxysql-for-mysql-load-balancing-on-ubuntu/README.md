# How to Set Up ProxySQL for MySQL Load Balancing on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, MySQL, ProxySQL, Load Balancing, Database

Description: Install and configure ProxySQL on Ubuntu to load balance MySQL connections across read replicas, with automatic failover and query routing rules.

---

ProxySQL sits between your application and MySQL servers, routing queries intelligently. It can send write queries to the primary and read queries to replicas, pool connections to reduce overhead on MySQL, and automatically remove failed servers from the rotation. For applications that generate heavy read traffic, ProxySQL with a primary-replica setup can dramatically increase throughput.

## What ProxySQL Does

ProxySQL operates at the MySQL protocol level. Applications connect to ProxySQL as if it were a MySQL server. ProxySQL then:

- Routes `SELECT` queries to read replicas
- Routes `INSERT`, `UPDATE`, `DELETE` to the primary
- Maintains persistent connection pools to MySQL backends
- Monitors backend health and removes failed servers
- Can rewrite queries, enforce connection limits, and cache query results

## Architecture

```text
Applications -> ProxySQL (port 6033) -> Primary MySQL (writes)
                                     -> Replica MySQL 1 (reads)
                                     -> Replica MySQL 2 (reads)
ProxySQL Admin Interface (port 6032) for configuration
```

This guide assumes you have a MySQL primary at `10.0.0.1` and replicas at `10.0.0.2` and `10.0.0.3`. Adjust IPs for your environment.

## Installing ProxySQL on Ubuntu

```bash
# Add ProxySQL repository
wget -O- 'https://repo.proxysql.com/ProxySQL/proxysql-2.x-repo/proxysql_pub_key' | \
    sudo apt-key add -
echo "deb https://repo.proxysql.com/ProxySQL/proxysql-2.x-repo/$(lsb_release -sc)/ ./" | \
    sudo tee /etc/apt/sources.list.d/proxysql.list

sudo apt update
sudo apt install proxysql -y

# Start ProxySQL
sudo systemctl start proxysql
sudo systemctl enable proxysql
sudo systemctl status proxysql
```

## Initial ProxySQL Configuration

Connect to the ProxySQL admin interface (different port and credentials than MySQL):

```bash
# Default admin credentials: admin/admin on port 6032
mysql -h 127.0.0.1 -P 6032 -u admin -padmin --prompt='ProxySQL> '
```

**Important**: Change the default admin password first:

```sql
-- Change admin password
UPDATE global_variables SET variable_value='admin:new-admin-password'
    WHERE variable_name='admin-admin_credentials';
LOAD ADMIN VARIABLES TO RUNTIME;
SAVE ADMIN VARIABLES TO DISK;
```

## Configuring MySQL Backend Servers

Add your MySQL servers to ProxySQL:

```sql
-- Add the primary server (hostgroup 0 = writes)
INSERT INTO mysql_servers (hostgroup_id, hostname, port, weight, comment)
    VALUES (0, '10.0.0.1', 3306, 1000, 'Primary - Writes');

-- Add replica servers (hostgroup 1 = reads)
INSERT INTO mysql_servers (hostgroup_id, hostname, port, weight, comment)
    VALUES (1, '10.0.0.2', 3306, 1000, 'Replica 1 - Reads');
INSERT INTO mysql_servers (hostgroup_id, hostname, port, weight, comment)
    VALUES (1, '10.0.0.3', 3306, 1000, 'Replica 2 - Reads');

-- Weight controls load distribution - equal weight means equal distribution
-- weight=2000 for a server means it gets 2x the connections of weight=1000

-- Apply configuration to runtime and persist to disk
LOAD MYSQL SERVERS TO RUNTIME;
SAVE MYSQL SERVERS TO DISK;
```

## Creating MySQL Users in ProxySQL

ProxySQL needs credentials to connect to MySQL backends, and applications need credentials to connect to ProxySQL:

First, create the monitoring user on all MySQL servers:

```sql
-- Run this on MySQL PRIMARY server
-- This user is used by ProxySQL to monitor backend health
CREATE USER 'proxysql_monitor'@'%' IDENTIFIED BY 'monitor-password';
GRANT REPLICATION CLIENT ON *.* TO 'proxysql_monitor'@'%';
FLUSH PRIVILEGES;
```

Create the application user on MySQL:

```sql
-- Run on MySQL PRIMARY (it will replicate to replicas)
CREATE USER 'appuser'@'%' IDENTIFIED BY 'app-password';
GRANT SELECT, INSERT, UPDATE, DELETE ON myapp_db.* TO 'appuser'@'%';
FLUSH PRIVILEGES;
```

Configure ProxySQL:

```sql
-- Connect to ProxySQL admin interface
-- Configure monitoring user
UPDATE global_variables SET variable_value='proxysql_monitor'
    WHERE variable_name='mysql-monitor_username';
UPDATE global_variables SET variable_value='monitor-password'
    WHERE variable_name='mysql-monitor_password';

LOAD MYSQL VARIABLES TO RUNTIME;
SAVE MYSQL VARIABLES TO DISK;

-- Add application user to ProxySQL user table
-- default_hostgroup = where queries go by default (write hostgroup)
INSERT INTO mysql_users (username, password, default_hostgroup, transaction_persistent)
    VALUES ('appuser', 'app-password', 0, 1);

-- transaction_persistent=1 keeps all queries in a transaction on the same hostgroup

LOAD MYSQL USERS TO RUNTIME;
SAVE MYSQL USERS TO DISK;
```

## Configuring Query Routing Rules

ProxySQL routes queries based on rules. Set up read/write splitting:

```sql
-- Rule 1: Send SELECTs to read hostgroup (1)
-- The regex matches SELECT statements at the start of the query
INSERT INTO mysql_query_rules (
    rule_id, active, match_digest, destination_hostgroup, apply
) VALUES (
    1, 1, '^SELECT', 1, 1
);

-- Rule 2: SELECTs inside transactions go to the write hostgroup
-- This prevents reading stale data during transactions
INSERT INTO mysql_query_rules (
    rule_id, active, match_digest, destination_hostgroup, apply
) VALUES (
    2, 1, '^SELECT.*FOR UPDATE$', 0, 1
);

-- Rules are evaluated in order by rule_id (lower = higher priority)
-- Make the FOR UPDATE rule higher priority by giving it a lower ID
UPDATE mysql_query_rules SET rule_id=1 WHERE match_digest='^SELECT.*FOR UPDATE$';
UPDATE mysql_query_rules SET rule_id=2 WHERE match_digest='^SELECT';

LOAD MYSQL QUERY RULES TO RUNTIME;
SAVE MYSQL QUERY RULES TO DISK;
```

## Backend Health Monitoring

ProxySQL automatically monitors backends. Configure the monitoring parameters:

```sql
-- How often to check backend health (milliseconds)
UPDATE global_variables SET variable_value=2000
    WHERE variable_name='mysql-monitor_ping_interval';

-- Mark server as DOWN after this many consecutive failures
UPDATE global_variables SET variable_value=3
    WHERE variable_name='mysql-monitor_ping_max_failures';

-- For MySQL Replication - monitor replica lag
UPDATE global_variables SET variable_value=10000
    WHERE variable_name='mysql-monitor_replication_lag_interval';

-- Put replica in SHUNNED state if lag exceeds this (seconds)
UPDATE mysql_servers SET max_replication_lag=30
    WHERE hostgroup_id=1;

LOAD MYSQL VARIABLES TO RUNTIME;
SAVE MYSQL VARIABLES TO DISK;
```

## Connection Pooling Configuration

```sql
-- Maximum connections to each backend
UPDATE mysql_servers SET max_connections=100 WHERE hostgroup_id=0;  -- Primary
UPDATE mysql_servers SET max_connections=200 WHERE hostgroup_id=1;  -- Replicas

-- ProxySQL global connection limits
UPDATE global_variables SET variable_value=2048
    WHERE variable_name='mysql-max_connections';

-- Timeout for idle connections in pool (milliseconds)
UPDATE global_variables SET variable_value=28800000
    WHERE variable_name='mysql-connection_max_age_ms';

LOAD MYSQL VARIABLES TO RUNTIME;
SAVE MYSQL VARIABLES TO DISK;
```

## Testing the Configuration

```bash
# Test connection through ProxySQL (port 6033)
mysql -h 127.0.0.1 -P 6033 -u appuser -p myapp_db

# Verify the connection works
mysql -h 127.0.0.1 -P 6033 -u appuser -p -e "SELECT @@hostname, @@port;"
```

Run multiple SELECT queries and verify they distribute across replicas:

```bash
for i in {1..6}; do
    mysql -h 127.0.0.1 -P 6033 -u appuser -papp-password \
        -e "SELECT @@hostname;" 2>/dev/null
done
# Should show alternating hostnames between replicas
```

## Monitoring ProxySQL

```sql
-- Connect to admin interface
-- Check server status
SELECT hostgroup_id, hostname, port, status, connections_used, connections_free
    FROM stats_mysql_connection_pool;

-- Check query routing (which rules are being hit)
SELECT rule_id, hits, match_digest, destination_hostgroup
    FROM stats_mysql_query_rules;

-- Check recent queries
SELECT digest_text, count_star, first_seen, last_seen, sum_time
    FROM stats_mysql_query_digest
    ORDER BY count_star DESC
    LIMIT 20;

-- Check backend errors
SELECT * FROM stats_mysql_global WHERE Variable_Name LIKE '%error%';
```

## Handling Failover

ProxySQL automatically detects when a backend goes down and stops routing traffic to it:

```bash
# Simulate primary failure - check ProxySQL logs
sudo tail -f /var/log/proxysql.log

# Manually OFFLINE a server for maintenance
mysql -h 127.0.0.1 -P 6032 -u admin -padmin \
    -e "UPDATE mysql_servers SET status='OFFLINE_SOFT' WHERE hostname='10.0.0.2'; LOAD MYSQL SERVERS TO RUNTIME;"
```

ProxySQL with MySQL replication gives you a production-grade read scale-out setup that applications can use transparently by just pointing to ProxySQL instead of MySQL directly.
