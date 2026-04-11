# How to Troubleshoot MySQL Connection Drops

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Connection, Timeout, Network, Troubleshooting

Description: Learn how to diagnose and fix MySQL connection drops caused by timeouts, max_connections limits, network issues, and firewall interference.

---

## Understanding Connection Drops

MySQL connection drops manifest as `Lost connection to MySQL server during query`, `MySQL server has gone away`, or `Can't connect to MySQL server`. These errors occur when an established connection is terminated before the client expected it.

## Step 1: Check Error Counters

```sql
SHOW STATUS LIKE 'Aborted_clients';
SHOW STATUS LIKE 'Aborted_connects';
SHOW STATUS LIKE 'Connection_errors_%';
```

- `Aborted_clients`: connections closed because the client did not close properly (e.g., application crash)
- `Aborted_connects`: failed connection attempts

## Step 2: Check Timeout Variables

Idle connections are dropped when they exceed timeout settings:

```sql
SHOW VARIABLES LIKE 'wait_timeout';
SHOW VARIABLES LIKE 'interactive_timeout';
SHOW VARIABLES LIKE 'net_read_timeout';
SHOW VARIABLES LIKE 'net_write_timeout';
```

`wait_timeout` defaults to 8 hours (28800 seconds) but many load balancers and firewalls drop idle TCP connections after 5-15 minutes. Set `wait_timeout` slightly below the infrastructure timeout:

```sql
SET GLOBAL wait_timeout         = 600;  -- 10 minutes
SET GLOBAL interactive_timeout  = 600;
```

## Step 3: Detect Firewall or NAT Drops

Firewalls and NAT gateways silently discard idle TCP connections. Enable TCP keepalive at the OS level so MySQL connections send periodic probes:

```bash
sysctl -w net.ipv4.tcp_keepalive_time=120
sysctl -w net.ipv4.tcp_keepalive_intvl=10
sysctl -w net.ipv4.tcp_keepalive_probes=6
```

To make these settings persistent across reboots, add them to `/etc/sysctl.conf`.

## Step 4: max_connections Limit

When too many clients connect simultaneously, new connections are refused:

```sql
SHOW STATUS LIKE 'Max_used_connections';
SHOW VARIABLES LIKE 'max_connections';
```

If `Max_used_connections` is approaching `max_connections`, either increase the limit or reduce connection count via pooling:

```sql
SET GLOBAL max_connections = 500;
```

Use a connection pool (e.g., PgBouncer equivalent: ProxySQL) to reduce the number of real MySQL connections:

```bash
# ProxySQL configuration snippet
mysql_servers = (
  { address="127.0.0.1", port=3306, max_connections=100 }
)
```

## Step 5: max_allowed_packet Drops

Large query results or binary blobs can exceed `max_allowed_packet`, causing connection drops:

```sql
SHOW VARIABLES LIKE 'max_allowed_packet';
SET GLOBAL max_allowed_packet = 67108864; -- 64MB
```

## Step 6: Check the Error Log for Disconnect Reasons

Enable `log_error_verbosity` to get more detail:

```sql
SET GLOBAL log_error_verbosity = 3;
```

Then check the error log:

```bash
grep -i "aborted\|lost\|disconnect" /var/log/mysql/error.log | tail -50
```

## Step 7: Application-Side Connection Validation

Configure your connection pool to validate connections before use:

```javascript
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  connectionLimit: 20,
  // Enable TCP keepalive to detect dead connections
  enableKeepAlive: true,
  keepAliveInitialDelay: 30000,
});
```

Handle reconnection in application code:

```javascript
pool.on('connection', conn => {
  conn.on('error', err => {
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.warn('MySQL connection lost, pool will reconnect');
    }
  });
});
```

## Summary

MySQL connection drops are most commonly caused by `wait_timeout` mismatches with infrastructure TCP idle timeouts, reaching `max_connections`, or firewall/NAT dropping idle connections. Set `wait_timeout` below the infrastructure idle timeout, enable TCP keepalive, use connection pooling to stay well below `max_connections`, and configure the application pool to validate connections before use and handle reconnection automatically.
