# How to Use remote() and remoteSecure() Table Functions in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Table Function, Distributed, SQL, Database, Networking

Description: Learn how to use the remote() and remoteSecure() table functions in ClickHouse to query tables on other ClickHouse servers without permanent configuration or Distributed table setup.

---

The `remote()` and `remoteSecure()` table functions in ClickHouse let you query tables on any other ClickHouse server using an ad-hoc connection - no cluster configuration, no Distributed table DDL required. This makes them invaluable for cross-instance data exploration, migrations, and one-off federated queries.

## What Are remote() and remoteSecure()?

- `remote()` connects over the native ClickHouse TCP protocol (default port 9000).
- `remoteSecure()` connects over the native protocol with TLS encryption (default port 9440).

Both functions open a connection to the target server, execute the query there, stream the results back to the calling server, and present them as a virtual table.

```sql
-- Query a table on another ClickHouse server
SELECT count()
FROM remote('ch-server2.internal:9000', default.events, 'read_user', 'secret_password');
```

## Basic Syntax

```sql
remote(addresses_expr, db.table [, user [, password [, sharding_key]]])
remote(addresses_expr, db, table [, user [, password [, sharding_key]]])
remoteSecure(addresses_expr, db.table [, user [, password [, sharding_key]]])
remoteSecure(addresses_expr, db, table [, user [, password [, sharding_key]]])
```

| Parameter        | Description |
|------------------|-------------|
| `addresses_expr` | Host(s): single host, comma-separated list, or `{n..m}` range |
| `db.table`       | Target database and table name |
| `user`           | Remote user (defaults to `default`) |
| `password`       | Remote user's password |
| `sharding_key`   | Expression for consistent hashing across multiple addresses |

## Reading from a Single Remote Server

```sql
-- Basic remote query
SELECT
    toDate(ts) AS date,
    count()    AS event_count
FROM remote('ch-analytics.internal', default.events, 'analyst', 'p@ssw0rd')
WHERE ts >= now() - INTERVAL 7 DAY
GROUP BY date
ORDER BY date;
```

## Using remoteSecure() for Encrypted Connections

```sql
-- Same query but over TLS
SELECT count()
FROM remoteSecure('ch-analytics.internal:9440', default.events, 'analyst', 'p@ssw0rd');
```

## Specifying Port Explicitly

```sql
SELECT *
FROM remote('ch-server2.internal:9001', default.logs, 'logger', 'logpass')
LIMIT 100;
```

## Querying Multiple Shards at Once

Pass multiple hosts as a comma-separated list or use range syntax:

```sql
-- Comma-separated hosts (acts like multiple shards)
SELECT count()
FROM remote('ch-shard1.internal,ch-shard2.internal,ch-shard3.internal', default.events, 'reader', 'pass');

-- Range syntax: queries ch-node1 through ch-node4
SELECT count()
FROM remote('ch-node{1..4}.internal', default.events, 'reader', 'pass');
```

## Migrating Data Between Instances

`remote()` is extremely useful for pulling data from an old server into a new one during migrations:

```sql
-- On the new server: pull historical data from the old server
INSERT INTO events_new
SELECT *
FROM remote('old-clickhouse.internal:9000', default.events, 'migrator', 'migratorpass')
WHERE ts BETWEEN '2025-01-01' AND '2025-12-31';
```

Break large migrations into date-range batches to avoid memory pressure:

```sql
-- Migrate month by month
INSERT INTO events_new
SELECT *
FROM remote('old-clickhouse.internal', default.events, 'migrator', 'pass')
WHERE toYYYYMM(ts) = 202501;

INSERT INTO events_new
SELECT *
FROM remote('old-clickhouse.internal', default.events, 'migrator', 'pass')
WHERE toYYYYMM(ts) = 202502;
```

## Joining Local and Remote Tables

```sql
-- Enrich local order data with user profiles from a remote CRM instance
SELECT
    o.order_id,
    o.amount,
    u.username,
    u.country
FROM orders AS o
JOIN remote('crm-clickhouse.internal', crm.users, 'api_user', 'api_pass') AS u
    ON o.user_id = u.user_id
WHERE o.created_at >= today()
LIMIT 1000;
```

## Comparing Data Between Two Instances

Useful for verifying that a migration or replication is consistent:

```sql
SELECT
    'source' AS instance,
    count()  AS row_count,
    max(ts)  AS latest_event
FROM remote('source-ch.internal', default.events, 'checker', 'pass')

UNION ALL

SELECT
    'destination',
    count(),
    max(ts)
FROM events;
```

## Cross-Instance Aggregation

```sql
-- Aggregate metrics from two regional ClickHouse deployments
SELECT
    region,
    sum(request_count) AS total_requests,
    avg(latency_p99)   AS avg_p99
FROM (
    SELECT 'us-east' AS region, request_count, latency_p99
    FROM remote('ch-us-east.internal', metrics.http, 'reader', 'pass')
    UNION ALL
    SELECT 'eu-west', request_count, latency_p99
    FROM remote('ch-eu-west.internal', metrics.http, 'reader', 'pass')
)
GROUP BY region;
```

## Using remote() vs cluster()

| Feature | `remote()` | `cluster()` |
|---|---|---|
| Requires `remote_servers` config | No | Yes |
| Specify credentials per query | Yes | No (uses current user) |
| Good for ad-hoc / migrations | Yes | Less convenient |
| Good for production fan-outs | Verbose | Preferred |
| TLS support | `remoteSecure()` | Via cluster config |

## Security Best Practices

Create a dedicated read-only user for cross-instance queries:

```sql
-- On the remote server, create a restricted user
CREATE USER remote_reader IDENTIFIED BY 'strong_password';
GRANT SELECT ON default.* TO remote_reader;
```

Use `remoteSecure()` whenever credentials travel over a network:

```sql
SELECT count()
FROM remoteSecure('analytics.internal', default.events, 'remote_reader', 'strong_password');
```

## Allowing Remote Access in Configuration

By default, ClickHouse only listens on localhost. To allow remote connections, update `config.xml`:

```xml
<listen_host>0.0.0.0</listen_host>
```

And restrict access using network-level controls or ClickHouse user IP restrictions:

```sql
CREATE USER remote_reader HOST IP '10.0.0.0/8' IDENTIFIED BY 'strong_password';
```

## Performance Considerations

- `remote()` transfers data over the network. Minimize transferred data by pushing aggregations and filters.
- For very large remote tables, avoid `SELECT *` - select only needed columns.
- The query is partially executed on the remote side (predicate pushdown), so the remote server bears most of the CPU cost.
- Consider using `Distributed` tables for production workloads where the same fan-out pattern is used repeatedly.

## Summary

The `remote()` and `remoteSecure()` table functions offer flexible ad-hoc connectivity between ClickHouse instances. Key points:

- Connect to any ClickHouse server without permanent configuration.
- Use `remoteSecure()` for encrypted connections.
- Query multiple hosts at once using comma lists or range syntax.
- Ideal for migrations, one-off federated queries, and cross-instance comparisons.
- For recurring distributed queries, graduate to named cluster + Distributed tables.
