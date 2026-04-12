# How to Configure Read-Write Splitting with ProxySQL for MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, ProxySQL, Read-Write Splitting, Load Balancing, Replication

Description: Configure ProxySQL query rules to automatically route SELECT statements to replicas and writes to the primary MySQL server.

---

## Overview

Read-write splitting routes write queries (INSERT, UPDATE, DELETE) to the primary MySQL server and read queries (SELECT) to one or more replicas. ProxySQL implements this transparently using query rules, so applications need no code changes.

## Prerequisites

- ProxySQL installed and running
- MySQL primary and at least one replica configured
- Backend servers added to ProxySQL

## Hostgroup Design

Use two hostgroups:
- Hostgroup `10` - primary (writes)
- Hostgroup `20` - replicas (reads)

```sql
-- Add primary server to write hostgroup
INSERT INTO mysql_servers (hostgroup_id, hostname, port) VALUES
  (10, '192.168.1.101', 3306);

-- Add replicas to read hostgroup
INSERT INTO mysql_servers (hostgroup_id, hostname, port) VALUES
  (20, '192.168.1.102', 3306),
  (20, '192.168.1.103', 3306);

LOAD MYSQL SERVERS TO RUNTIME;
SAVE MYSQL SERVERS TO DISK;
```

## Configuring the Application User

Set the application user's default hostgroup to the write group. Query rules will handle routing reads to the replica hostgroup:

```sql
INSERT INTO mysql_users (username, password, default_hostgroup) VALUES
  ('appuser', 'AppPass123!', 10);

LOAD MYSQL USERS TO RUNTIME;
SAVE MYSQL USERS TO DISK;
```

## Creating Query Rules for Read-Write Splitting

```sql
-- Route SELECT statements to replica hostgroup (hostgroup 20)
INSERT INTO mysql_query_rules (rule_id, active, match_pattern, destination_hostgroup, apply) VALUES
  (1, 1, '^SELECT .* FOR UPDATE', 10, 1),   -- SELECT FOR UPDATE goes to primary
  (2, 1, '^SELECT', 20, 1);                  -- All other SELECTs go to replicas

LOAD MYSQL QUERY RULES TO RUNTIME;
SAVE MYSQL QUERY RULES TO DISK;
```

Rule order matters. Rule 1 is evaluated first and catches `SELECT ... FOR UPDATE` (which needs the primary), then rule 2 catches all remaining SELECT queries.

## Verifying Query Routing

Check the stats to confirm queries are being routed correctly:

```sql
SELECT hostgroup, schemaname, username, digest_text,
       count_star, sum_rows_affected, sum_rows_sent
FROM stats_mysql_query_digest
ORDER BY count_star DESC
LIMIT 20;
```

## Testing Read-Write Splitting

```bash
# Run a write query - should go to primary (HG 10)
mysql -u appuser -pAppPass123! -h 127.0.0.1 -P 6033 -e \
  "INSERT INTO mydb.test (name) VALUES ('test1');"

# Run a read query - should go to replica (HG 20)
mysql -u appuser -pAppPass123! -h 127.0.0.1 -P 6033 -e \
  "SELECT @@hostname, @@port;"
```

## Handling Replication Lag

ProxySQL can monitor replication lag and remove lagged replicas from the read pool:

```sql
UPDATE global_variables
SET variable_value='5000'
WHERE variable_name='mysql-monitor_replication_lag_interval';

UPDATE global_variables
SET variable_value='60000'
WHERE variable_name='mysql-monitor_slave_lag_when_null';

LOAD MYSQL VARIABLES TO RUNTIME;
SAVE MYSQL VARIABLES TO DISK;
```

Set max replication lag per server:

```sql
UPDATE mysql_servers SET max_replication_lag=30
WHERE hostgroup_id=20;

LOAD MYSQL SERVERS TO RUNTIME;
SAVE MYSQL SERVERS TO DISK;
```

## Using Multiplexing and Connection Stickiness

For sessions that mix reads and writes (e.g., read after write), use transaction awareness:

```sql
UPDATE global_variables
SET variable_value='1'
WHERE variable_name='mysql-autocommit_false_is_transaction';

LOAD MYSQL VARIABLES TO RUNTIME;
SAVE MYSQL VARIABLES TO DISK;
```

This ensures queries inside a transaction all go to the primary.

## Monitoring Rule Hit Counts

```sql
SELECT s.rule_id, s.hits, r.destination_hostgroup
FROM stats_mysql_query_rules s
JOIN runtime_mysql_query_rules r USING (rule_id)
ORDER BY s.rule_id;
```

## Summary

ProxySQL read-write splitting uses ordered query rules to match SQL patterns and route them to different hostgroups. SELECT queries (except SELECT FOR UPDATE) are sent to the replica hostgroup, while all writes and transactional SELECTs go to the primary hostgroup. Replication lag monitoring ensures lagged replicas are automatically removed from the read pool.
