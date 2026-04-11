# How to Track MySQL Connections per Second

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Monitoring, Performance, Database, Metric

Description: Learn how to track MySQL connections per second using status variables, Performance Schema, and alerting to detect connection spikes early.

---

## Why Connections per Second Matters

MySQL has a hard limit on concurrent connections controlled by `max_connections`. When your application starts opening connections faster than it closes them, you risk hitting that ceiling. Tracking the rate of new connections per second gives you an early warning signal before the server becomes overwhelmed and starts refusing connections.

A sudden spike in connections per second often indicates:
- A misconfigured connection pool that is not reusing connections
- A deployment that spawned many new application instances simultaneously
- A traffic surge hitting unauthenticated or expensive code paths
- A connection leak where connections are opened but never closed

## Reading the Connections Status Variable

MySQL increments the `Connections` status variable each time a new connection attempt is made. You can read the current cumulative value with:

```sql
SHOW GLOBAL STATUS LIKE 'Connections';
```

To calculate the rate, take two readings separated by a known time interval and compute the difference. A simple shell approach:

```bash
#!/bin/bash
MYSQL="mysql -u monitor -p'secret' -N -B"

V1=$($MYSQL -e "SHOW GLOBAL STATUS LIKE 'Connections';" | awk '{print $2}')
sleep 60
V2=$($MYSQL -e "SHOW GLOBAL STATUS LIKE 'Connections';" | awk '{print $2}')

RATE=$(( (V2 - V1) / 60 ))
echo "New connections per second: $RATE"
```

## Using Performance Schema for Connection Metrics

Performance Schema provides richer data. The `accounts` table lets you break down connections by user or host:

```sql
SELECT
  USER,
  HOST,
  TOTAL_CONNECTIONS,
  CURRENT_CONNECTIONS
FROM performance_schema.accounts
ORDER BY TOTAL_CONNECTIONS DESC
LIMIT 20;
```

This tells you which application user or host is generating the most connection churn. If one service account dominates the list, that is where to focus tuning efforts.

## Tracking with mysqladmin

The `mysqladmin` tool provides a quick status snapshot without writing SQL:

```bash
mysqladmin -u monitor -p'secret' extended-status | grep -E 'Connections|Threads_connected|Max_used_connections'
```

For continuous monitoring, use the repeat flag:

```bash
mysqladmin -u monitor -p'secret' extended-status -i 10 -r | grep Connections
```

The `-r` flag outputs relative (delta) values between intervals, giving you the rate directly without manual subtraction.

## Alerting on Connection Rate

A Prometheus-based alerting rule using the `mysqld_exporter` metric `mysql_global_status_connections` might look like:

```yaml
groups:
  - name: mysql_connections
    rules:
      - alert: MySQLHighConnectionRate
        expr: rate(mysql_global_status_connections[1m]) > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "MySQL connection rate is high on {{ $labels.instance }}"
          description: "More than 100 new connections per second for 5 minutes."
```

Adjust the threshold based on your baseline. A well-configured application with a connection pool should see near-zero new connections per second during steady state.

## Connecting Metrics to Max Connections

Cross-reference the connection rate with `Max_used_connections` to understand peak usage:

```sql
SHOW GLOBAL STATUS LIKE 'Max_used_connections';
SHOW GLOBAL VARIABLES LIKE 'max_connections';
```

If `Max_used_connections` is close to `max_connections`, you are running close to the limit. Either increase `max_connections`, improve pooling, or reduce connection churn.

## Summary

Tracking MySQL connections per second requires reading the cumulative `Connections` status variable over time intervals, using `mysqladmin` for quick checks, or scraping metrics with `mysqld_exporter`. Alerting when the rate spikes above a baseline threshold gives you early warning of connection pool misconfigurations or traffic anomalies before the server starts rejecting connections.
