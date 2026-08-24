# How to Detect MySQL Connection Churn Before `Threads_connected` Reaches `max_connections`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Connection Pools, Performance Schema, Capacity Monitoring, Database Alerts

Description: Detect costly MySQL connection turnover with interval rates, thread-cache evidence, pool telemetry, and refusal counters before the simultaneous connection ceiling is exhausted.

---

`Threads_connected` is a gauge of connections open at one moment. An application can open and close thousands of connections per minute while that gauge remains comfortably below `max_connections`.

Connection churn still consumes TCP, TLS, authentication, thread, and session-initialization work. It can cause tail latency or exhaust an intermediary before MySQL's simultaneous connection count looks alarming.

The server variables in this post cover classic MySQL protocol connections. X Protocol uses separate `Mysqlx_*` status variables and the `mysqlx_max_connections` limit.

## Collect the cumulative evidence

Use explicit global status for a server-wide alert. Plain `SHOW STATUS` defaults to session scope; the variables selected below are global-only, but stating `GLOBAL` avoids ambiguity:

```sql
SHOW GLOBAL STATUS
WHERE Variable_name IN (
  'Connections',
  'Threads_connected',
  'Threads_running',
  'Threads_created',
  'Aborted_connects',
  'Connection_errors_max_connections',
  'Max_used_connections'
);

SHOW GLOBAL VARIABLES
WHERE Variable_name IN (
  'max_connections',
  'thread_cache_size',
  'connect_timeout',
  'thread_handling'
);
```

Interpret them separately:

- `Connections` counts connection attempts, successful or not;
- `Threads_connected` counts currently open connections;
- `Threads_running` counts threads that are not sleeping;
- `Threads_created` counts threads created to handle connections;
- `Aborted_connects` counts failed attempts to connect;
- `Connection_errors_max_connections` counts refusals because the limit was reached;
- `Max_used_connections` is a high-water mark since startup or the last `FLUSH STATUS`, which rebases it to the current number of open connections.

`Connections`, `Threads_created`, `Aborted_connects`, and `Connection_errors_max_connections` accumulate since server start. `Threads_connected` and `Threads_running` are gauges, while `Max_used_connections` is a high-water mark rather than a counter to difference. Export the raw values and calculate rates for the event counters from successive successful samples. Reject intervals after a restart or unexpected counter decrease.

## Derive churn and thread-cache pressure

Over the same interval, calculate:

```text
attempt_rate       = delta(Connections) / seconds
thread_create_rate = delta(Threads_created) / seconds
abort_rate         = delta(Aborted_connects) / seconds
cache_miss_share   = delta(Threads_created) / delta(Connections)
connection_use     = Threads_connected / max_connections
```

Return no ratio when the denominator is zero. With the default `one-thread-per-connection` handler, MySQL's documentation suggests `Threads_created / Connections` as an indication of thread-cache misses; the interval ratio responds faster than the lifetime value. It is not a direct measure of application pool misses because `Connections` also includes failed attempts. With MySQL Enterprise Thread Pool (`thread_handling = loaded-dynamically`), connections and execution threads are decoupled, so this ratio is not a thread-cache miss measure.

A high attempt rate with a low `Threads_connected` gauge is the signature that a point-in-time connection alert misses. With the default handler, a rising `Threads_created` rate shows that the server is also creating connection threads rather than reusing cached ones. Under that handler, increasing `thread_cache_size` can reduce thread creation, but it does not fix a disabled pool, excessively short connection lifetime, DNS/TLS problems, or retry storms.

## Add the client-side half

Database status cannot show how long callers waited to obtain a pooled connection or why a connection was retired. Collect per application pool:

- acquisition latency and timeout rate;
- active, idle, maximum, and pending borrowers;
- physical connections opened and closed;
- configured maximum lifetime, idle timeout, and validation policy;
- request rate and deploy/restart annotations.

Compare the pool's physical-open rate with MySQL's attempt rate. They need not match: proxies, health checks, administrators, replicas, and other applications also connect. Segment by database user, service, proxy, and endpoint where available.

Performance Schema's `threads` and connection attribute tables can identify current clients, but they are snapshots, not a durable connection history. Avoid attaching high-cardinality client attributes directly to every Prometheus series.

## Alert before refusal

Use multiple conditions rather than a single percentage:

- connection-attempt rate materially exceeds the established service baseline;
- thread-create rate or interval cache-miss share rises with it;
- pool acquisition latency or pending borrowers rise;
- abort or connection-error counters increase;
- `Threads_connected / max_connections` is consuming the capacity reserved for failover and operations.

Require a sustained interval and minimum traffic. A deployment naturally opens warm pools; a short burst that settles is different from continuous turnover. For each possible database target, including a replica that may be promoted, compare its capacity with the sum of maxima for all service-instance pools that can connect to it concurrently after failover.

MySQL normally permits one extra connection beyond `max_connections` for an account with `CONNECTION_ADMIN` (or the deprecated `SUPER`) so an administrator can diagnose the server. Do not include that emergency path in application capacity. `Connection_errors_max_connections` is already late evidence that a client was refused because the server limit was reached.

## Diagnose common patterns

| Evidence | Likely direction |
|---|---|
| High attempt rate, stable low concurrency, high physical opens | Pool disabled or connections retired too aggressively |
| High attempts and `Aborted_connects`, low opens in the app | Authentication, network, TLS, or retry problem |
| Rising `Threads_created` with attempts | With the default handler, the thread cache cannot reuse connection threads at that turnover rate |
| High pool pending and high `Threads_connected` | Genuine concurrency or database latency is holding connections |
| High MySQL attempts but stable application pools | Proxy, health check, job, or another client is the source |

Confirm with the global `Connection_errors_*` counters, the per-host error columns in `performance_schema.host_cache` when the host cache is enabled, server logs, network telemetry, and a bounded client trace. Do not diagnose purely from a ratio: workload and architecture determine whether a rate is expensive.

## Official Documentation

- [MySQL server status variables](https://dev.mysql.com/doc/refman/8.4/en/server-status-variables.html)
- [MySQL connection handling and `max_connections`](https://dev.mysql.com/doc/refman/8.4/en/too-many-connections.html)
- [MySQL connection interfaces](https://dev.mysql.com/doc/refman/8.4/en/connection-interfaces.html)
- [MySQL Performance Schema threads table](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-threads-table.html)
- [MySQL Performance Schema connection attribute tables](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-connection-attribute-tables.html)

## Conclusion

Detect MySQL connection churn from reset-aware rates of `Connections`, `Threads_created`, and connection failures, then correlate them with pool acquisition and physical-open telemetry. This exposes expensive turnover while `Threads_connected` is still low and leaves time to correct pool, retry, or network behavior before normal clients reach the connection ceiling.
