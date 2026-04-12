# How to Monitor MySQL Group Replication Status

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Group Replication, Monitoring, Performance Schema, Replication

Description: Use Performance Schema tables and system variables to monitor MySQL Group Replication member state, lag, and transaction certification health.

---

## Key Performance Schema Tables

MySQL Group Replication exposes monitoring data through `performance_schema` tables. These tables provide real-time visibility into member state, replication channels, and certification.

## Check Member Status

```sql
SELECT
  MEMBER_ID,
  MEMBER_HOST,
  MEMBER_PORT,
  MEMBER_STATE,
  MEMBER_ROLE,
  MEMBER_VERSION
FROM performance_schema.replication_group_members;
```

```text
+--------------------------------------+-------------+-------------+--------------+-------------+----------------+
| MEMBER_ID                            | MEMBER_HOST | MEMBER_PORT | MEMBER_STATE | MEMBER_ROLE | MEMBER_VERSION |
+--------------------------------------+-------------+-------------+--------------+-------------+----------------+
| aaaa-bbbb-cccc-dddd-eeee             | node1       | 3306        | ONLINE       | PRIMARY     | 8.0.35         |
| ffff-gggg-hhhh-iiii-jjjj             | node2       | 3306        | ONLINE       | SECONDARY   | 8.0.35         |
+--------------------------------------+-------------+-------------+--------------+-------------+----------------+
```

Member states to watch for:
- `ONLINE` - fully synchronized and operational
- `RECOVERING` - catching up via distributed recovery
- `UNREACHABLE` - temporarily unreachable, pending expulsion
- `ERROR` - node encountered an error and left the group

## Check Transaction Queue and Lag

The `replication_group_member_stats` table shows certification and queue information per member:

```sql
SELECT
  MEMBER_ID,
  COUNT_TRANSACTIONS_IN_QUEUE,
  COUNT_TRANSACTIONS_CHECKED,
  COUNT_CONFLICTS_DETECTED,
  COUNT_TRANSACTIONS_ROWS_VALIDATING,
  TRANSACTIONS_COMMITTED_ALL_MEMBERS,
  LAST_CONFLICT_FREE_TRANSACTION
FROM performance_schema.replication_group_member_stats\G
```

Important columns:
- `COUNT_TRANSACTIONS_IN_QUEUE` - pending transactions waiting for certification
- `COUNT_CONFLICTS_DETECTED` - total certification conflicts (high values indicate write contention)
- `COUNT_TRANSACTIONS_ROWS_VALIDATING` - current certification database size

## Monitor Replication Channels

```sql
SELECT
  CHANNEL_NAME,
  SERVICE_STATE,
  RECEIVED_TRANSACTION_SET,
  LAST_ERROR_MESSAGE,
  LAST_ERROR_TIMESTAMP
FROM performance_schema.replication_connection_status
WHERE CHANNEL_NAME LIKE 'group_replication%';
```

## Check Applied Transactions

```sql
SELECT
  CHANNEL_NAME,
  SERVICE_STATE,
  APPLYING_TRANSACTION,
  LAST_APPLIED_TRANSACTION,
  LAST_ERROR_MESSAGE
FROM performance_schema.replication_applier_status_by_worker
WHERE CHANNEL_NAME LIKE 'group_replication%';
```

## Monitor Group Replication Status Variables

```sql
SHOW STATUS LIKE 'group_replication%';
```

```text
+-----------------------------------------------+-------+
| Variable_name                                 | Value |
+-----------------------------------------------+-------+
| group_replication_primary_member              | uuid  |
+-----------------------------------------------+-------+
```

## Create a Health Check View

Create a convenient monitoring view:

```sql
CREATE OR REPLACE VIEW gr_health AS
SELECT
  m.MEMBER_HOST AS host,
  m.MEMBER_ROLE AS role,
  m.MEMBER_STATE AS state,
  s.COUNT_TRANSACTIONS_IN_QUEUE AS queue_size,
  s.COUNT_CONFLICTS_DETECTED AS conflicts
FROM performance_schema.replication_group_members m
JOIN performance_schema.replication_group_member_stats s
  ON m.MEMBER_ID = s.MEMBER_ID;
```

```sql
SELECT * FROM gr_health;
```

## Alert on Degraded Cluster

Use a script or monitoring tool to alert when member count drops below quorum:

```bash
#!/bin/bash
# Check group replication health
ONLINE=$(mysql -u monitor -pSecret -e \
  "SELECT COUNT(*) FROM performance_schema.replication_group_members WHERE MEMBER_STATE='ONLINE';" \
  -sN 2>/dev/null)

if [ "$ONLINE" -lt 2 ]; then
  echo "CRITICAL: Only $ONLINE members ONLINE in group replication"
  exit 2
fi
echo "OK: $ONLINE members ONLINE"
exit 0
```

## Summary

Monitor MySQL Group Replication using `performance_schema.replication_group_members` for member state and role, `replication_group_member_stats` for certification lag and conflicts, and `replication_applier_status_by_worker` for apply errors. Create a monitoring view for convenience and use scripted health checks to alert on quorum loss. Integrate these checks with OneUptime for automated incident management.
