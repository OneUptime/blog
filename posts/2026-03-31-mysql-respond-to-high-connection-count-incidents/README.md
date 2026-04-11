# How to Respond to MySQL High Connection Count Incidents

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Incident Response, Connection Pool, Monitoring, Runbook

Description: A step-by-step guide for diagnosing and resolving MySQL high connection count incidents before they cause service outages.

---

## Understanding the Problem

MySQL has a hard ceiling on simultaneous connections defined by the `max_connections` variable. When your server approaches this limit, new connection attempts are refused with the error `Too many connections`, causing application failures. High connection counts typically stem from connection leaks, slow queries holding connections open, sudden traffic spikes, or misconfigured connection pools.

## Immediate Triage

When an alert fires, start by checking the current state:

```sql
SHOW GLOBAL STATUS LIKE 'Threads_connected';
SHOW GLOBAL STATUS LIKE 'Max_used_connections';
SHOW GLOBAL STATUS LIKE 'Connection_errors_max_connections';
SHOW PROCESSLIST;
```

If `Threads_connected` is near `max_connections`, you have an active incident. Check `Connection_errors_max_connections` to see how many connection attempts have already been refused.

To find which hosts and users are consuming the most connections:

```sql
SELECT user, host, COUNT(*) AS connection_count
FROM information_schema.PROCESSLIST
GROUP BY user, host
ORDER BY connection_count DESC;
```

## Short-Term Mitigation

If connections are exhausted, you can temporarily increase `max_connections` without a restart:

```sql
SET GLOBAL max_connections = 500;
```

To kill idle connections that are blocking capacity, identify and terminate them:

```sql
SELECT CONCAT('KILL ', id, ';')
FROM information_schema.PROCESSLIST
WHERE command = 'Sleep'
  AND time > 300
ORDER BY time DESC;
```

Run the generated KILL statements to reclaim connections. Be careful not to kill active transactions.

## Root Cause Analysis

After stabilizing the incident, investigate the root cause:

```sql
-- Check for queries holding connections open
SELECT id, user, host, db, command, time, state, info
FROM information_schema.PROCESSLIST
WHERE command != 'Sleep'
ORDER BY time DESC
LIMIT 20;
```

Common causes and fixes:
- Connection leaks in application code (fix by auditing connection close/release logic)
- Pool misconfiguration (set `min_pool_size` and `max_pool_size` appropriately)
- Slow queries blocking threads (optimize queries or add indexes)

## Connection Pool Configuration

Misconfigured pools are the most common cause. A well-tuned Node.js pool looks like this:

```javascript
const pool = mysql.createPool({
  host: 'db.example.com',
  user: 'app_user',
  password: process.env.DB_PASSWORD,
  database: 'myapp',
  connectionLimit: 20,
  waitForConnections: true,
  queueLimit: 50,
  connectTimeout: 10000,
  acquireTimeout: 10000
});
```

Set `connectionLimit` based on the formula: `max_connections / number_of_app_instances`, leaving headroom for administrative connections.

## Monitoring and Alerting

Set up proactive monitoring to catch the issue before connections are exhausted:

```bash
# Alert when connections exceed 80% of max_connections
mysql -u monitor_user -p -e "
  SELECT
    (Threads_connected / max_connections) * 100 AS connection_pct
  FROM
    (SELECT VARIABLE_VALUE AS Threads_connected FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Threads_connected') t1,
    (SELECT VARIABLE_VALUE AS max_connections FROM performance_schema.global_variables WHERE VARIABLE_NAME = 'max_connections') t2;
"
```

In OneUptime or a similar monitoring tool, set a threshold alert at 75-80% connection utilization to give your team time to respond before the limit is hit.

## Prevention

- Use connection pooling in all application services
- Set `wait_timeout` and `interactive_timeout` to reclaim idle connections automatically
- Monitor `Threads_connected` as a key metric in your dashboard
- Load test your application to validate pool settings before production deployments

## Summary

Responding to MySQL high connection count incidents requires fast triage using `SHOW PROCESSLIST` and global status variables, followed by short-term mitigation via `max_connections` tuning or killing idle connections. Long-term prevention relies on proper connection pool configuration, query optimization, and proactive monitoring with alerts set below the connection limit ceiling.
