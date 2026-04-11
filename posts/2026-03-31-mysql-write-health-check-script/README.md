# How to Write a MySQL Health Check Script

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Health Check, Script

Description: Write a MySQL health check script that tests connectivity, checks replication lag, buffer pool hit rate, connection count, and slow query rate.

---

A MySQL health check script is a fast, scriptable way to assess whether MySQL is healthy without opening a full monitoring dashboard. It is useful for deployment gates, Kubernetes liveness probes, load balancer checks, and on-call runbooks.

## What to Check

A complete health check should verify:

1. MySQL is reachable and accepting connections
2. Replication is running and not lagging (if replica)
3. Connection count is below a safe threshold
4. Buffer pool hit rate is above a minimum
5. No runaway queries are active

## The Health Check Script

```bash
#!/bin/bash
# mysql_health_check.sh

MYSQL_CMD="mysql -u health_checker -p${HEALTH_CHECK_PASSWORD} -h 127.0.0.1 --connect-timeout=5 -se"
EXIT_CODE=0
ISSUES=()

# 1. Basic connectivity
if ! $MYSQL_CMD "SELECT 1" > /dev/null 2>&1; then
  echo "CRITICAL: MySQL is not reachable"
  exit 2
fi

# 2. Too many connections
MAX_CONN=$($MYSQL_CMD "SELECT VARIABLE_VALUE FROM performance_schema.global_variables WHERE VARIABLE_NAME='max_connections'")
CURR_CONN=$($MYSQL_CMD "SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME='Threads_connected'")
CONN_PCT=$(echo "scale=0; $CURR_CONN * 100 / $MAX_CONN" | bc)
if [ "$CONN_PCT" -gt 80 ]; then
  ISSUES+=("WARNING: Connections at ${CONN_PCT}% of max (${CURR_CONN}/${MAX_CONN})")
  EXIT_CODE=1
fi

# 3. Buffer pool hit rate
BP_READS=$(    $MYSQL_CMD "SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME='Innodb_buffer_pool_reads'")
BP_REQUESTS=$( $MYSQL_CMD "SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME='Innodb_buffer_pool_read_requests'")
if [ "$BP_REQUESTS" -gt 0 ]; then
  HIT_RATE=$(echo "scale=0; ($BP_REQUESTS - $BP_READS) * 100 / $BP_REQUESTS" | bc)
  if [ "$HIT_RATE" -lt 95 ]; then
    ISSUES+=("WARNING: Buffer pool hit rate is ${HIT_RATE}% (below 95%)")
    EXIT_CODE=1
  fi
fi

# 4. Replication lag (only on replicas)
SLAVE_STATUS=$($MYSQL_CMD "SHOW SLAVE STATUS\G" 2>/dev/null)
if echo "$SLAVE_STATUS" | grep -q "Slave_IO_Running: Yes"; then
  LAG=$(echo "$SLAVE_STATUS" | grep "Seconds_Behind_Master" | awk '{print $2}')
  if [ "$LAG" -gt 30 ]; then
    ISSUES+=("WARNING: Replication lag is ${LAG}s")
    EXIT_CODE=1
  fi
fi

# 5. Long-running queries
LONG_QUERIES=$($MYSQL_CMD "SELECT COUNT(*) FROM information_schema.PROCESSLIST WHERE COMMAND != 'Sleep' AND TIME > 60")
if [ "$LONG_QUERIES" -gt 5 ]; then
  ISSUES+=("WARNING: ${LONG_QUERIES} queries running longer than 60s")
  EXIT_CODE=1
fi

# Output results
if [ ${#ISSUES[@]} -eq 0 ]; then
  echo "OK: MySQL is healthy"
else
  for ISSUE in "${ISSUES[@]}"; do
    echo "$ISSUE"
  done
fi

exit $EXIT_CODE
```

## Creating the Health Check User

```sql
CREATE USER 'health_checker'@'127.0.0.1' IDENTIFIED BY 'healthpassword';
GRANT REPLICATION CLIENT, PROCESS ON *.* TO 'health_checker'@'127.0.0.1';
GRANT SELECT ON performance_schema.* TO 'health_checker'@'127.0.0.1';
FLUSH PRIVILEGES;
```

## Using as a Kubernetes Liveness Probe

```yaml
livenessProbe:
  exec:
    command:
      - /bin/bash
      - /opt/scripts/mysql_health_check.sh
  initialDelaySeconds: 30
  periodSeconds: 20
  failureThreshold: 3
```

## Summary

A MySQL health check script should test connectivity, connection saturation, buffer pool hit rate, replication lag, and long-running queries. Create a dedicated low-privilege user for the check, use exit codes 0 (OK) and 1/2 (warning/critical) for compatibility with Nagios-compatible monitoring systems, and integrate with Kubernetes probes for automated pod lifecycle management.
