# How to Write a MySQL Long-Running Query Killer Script

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Script, Performance, Monitoring, Database

Description: Learn how to write a MySQL script that detects and kills long-running queries to protect server stability during traffic spikes or runaway queries.

---

## Why Killing Long-Running Queries Is Necessary

A single runaway query can hold locks that block hundreds of other queries, consume enough CPU to starve the server, or perform a full table scan that floods the buffer pool. In production, you often cannot wait for a query to finish naturally. A long-running query killer script gives operations teams an automated safety net that acts faster than a human can respond.

Common scenarios that produce runaway queries:

- An analyst runs an ad-hoc report without a LIMIT clause on a large table
- A deployment introduces a missing index, turning a fast lookup into a full table scan
- A large replicated transaction on a read replica holds locks while applying, blocking user queries and causing them to pile up
- An ORM generates an unexpectedly expensive query after a model change

## Identifying Long-Running Queries

MySQL exposes active connections and their current query through the `PROCESSLIST`:

```sql
SELECT
  ID,
  USER,
  HOST,
  DB,
  COMMAND,
  TIME,
  STATE,
  LEFT(INFO, 200) AS query_snippet
FROM information_schema.PROCESSLIST
WHERE COMMAND != 'Sleep'
  AND TIME > 60
ORDER BY TIME DESC;
```

The `TIME` column is in seconds. This query finds all non-idle connections that have been running for more than 60 seconds.

## Building the Killer Script

The following script identifies queries running longer than a threshold and kills them, logging each action:

```bash
#!/bin/bash
# mysql-query-killer.sh
# Usage: ./mysql-query-killer.sh [max_seconds] [dry_run]

MYSQL_HOST="localhost"
MYSQL_USER="monitor"
MYSQL_PASS="secret"
MAX_SECONDS="${1:-120}"    # Kill queries running longer than 2 minutes
DRY_RUN="${2:-false}"
LOG_FILE="/var/log/mysql-query-killer.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Fetch long-running process IDs
PIDS=$(mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASS" \
  -N -B -e "
    SELECT ID FROM information_schema.PROCESSLIST
    WHERE COMMAND NOT IN ('Sleep', 'Binlog Dump', 'Binlog Dump GTID')
      AND USER NOT IN ('system user', 'replication', 'event_scheduler')
      AND TIME > ${MAX_SECONDS};
  " 2>/dev/null)

if [ -z "$PIDS" ]; then
  echo "[$DATE] No long-running queries found (threshold: ${MAX_SECONDS}s)." >> "$LOG_FILE"
  exit 0
fi

for PID in $PIDS; do
  # Log query details before killing
  DETAILS=$(mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASS" \
    -N -B -e "
      SELECT CONCAT(USER, '@', HOST, ' | ', TIME, 's | ', LEFT(IFNULL(INFO,'NULL'),300))
      FROM information_schema.PROCESSLIST WHERE ID = ${PID};
    " 2>/dev/null)

  echo "[$DATE] Long query found (PID $PID): $DETAILS" >> "$LOG_FILE"

  if [ "$DRY_RUN" != "true" ]; then
    mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASS" \
      -e "KILL QUERY ${PID};" 2>/dev/null
    echo "[$DATE] Killed PID $PID" >> "$LOG_FILE"
  else
    echo "[$DATE] DRY RUN - would kill PID $PID" >> "$LOG_FILE"
  fi
done
```

## Using KILL QUERY vs KILL CONNECTION

MySQL provides two kill modes:

- `KILL QUERY <id>` - terminates the currently running statement but keeps the connection open. The client receives an error and can retry.
- `KILL <id>` or `KILL CONNECTION <id>` - closes the connection entirely. The client must reconnect.

In most cases, `KILL QUERY` is preferable because it is less disruptive to the application. Reserve `KILL CONNECTION` for connections that appear stuck in a state from which they cannot recover, such as `Waiting for table lock` after the lock holder has been killed.

## Scheduling the Script

Run the killer script frequently enough to catch problems quickly, but not so frequently that it generates noise:

```bash
chmod +x /usr/local/bin/mysql-query-killer.sh

# Add to crontab - runs every 5 minutes
crontab -e
# */5 * * * * /usr/local/bin/mysql-query-killer.sh 120
```

## Dry Run First

Always test with dry run mode before enabling automatic kills in production:

```bash
/usr/local/bin/mysql-query-killer.sh 60 true
```

Review the log output to ensure the script would only kill legitimate offenders and not critical background processes like event schedulers or replication threads.

## Excluding Protected Users

Add exclusions for system users, replication threads, and known long-running maintenance jobs. The script already excludes `system user`, `replication`, and `event_scheduler`. Add your own backup user:

```bash
AND USER NOT IN ('system user', 'replication', 'event_scheduler', 'backup_user')
```

## Summary

A MySQL long-running query killer script queries `information_schema.PROCESSLIST` for connections exceeding a time threshold, logs their details, and issues `KILL QUERY` to terminate them. Running the script every few minutes via cron, excluding replication and system users, and testing with dry run mode first gives you an automated safety net that protects server stability from runaway queries without requiring manual intervention.
