# How to Use ClickHouse Playground for Testing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Playground, Testing, Learning, SQL

Description: Learn how to use the ClickHouse Playground to test queries, explore sample datasets, and prototype analytics without installing anything locally.

---

The ClickHouse Playground at `play.clickhouse.com` is a free, hosted ClickHouse instance preloaded with sample datasets. It is the fastest way to test queries, learn new features, and prototype analytics without any local setup.

## Accessing the Playground

Open a browser and navigate to:

```text
https://play.clickhouse.com
```

You can run queries directly in the web UI or connect via the HTTP interface.

## Connecting via HTTP Interface

```bash
curl "https://play.clickhouse.com/?user=play" \
  --data-binary "SELECT version()"
```

## Connecting via clickhouse-client

```bash
clickhouse-client \
  --host play.clickhouse.com \
  --secure \
  --port 9440 \
  --user play
```

## Available Sample Datasets

The Playground includes several preloaded datasets:

```sql
SHOW DATABASES;
-- datasets include: default, system, datasets
```

### NYC Taxi Trips

```sql
SELECT
    passenger_count,
    round(avg(total_amount), 2) AS avg_fare
FROM datasets.trips
GROUP BY passenger_count
ORDER BY passenger_count;
```

### GitHub Events

```sql
SELECT
    type,
    count() AS events
FROM datasets.github_events
WHERE toYear(created_at) = 2023
GROUP BY type
ORDER BY events DESC
LIMIT 10;
```

### DNS Logs

```sql
SELECT
    DomainName,
    count() AS queries
FROM datasets.dns
GROUP BY DomainName
ORDER BY queries DESC
LIMIT 10;
```

## Testing New ClickHouse Features

The Playground usually runs the latest stable release:

```sql
SELECT version();
```

Test new syntax before upgrading your own cluster:

```sql
-- Test JSON type (production-ready since 25.3)
SELECT data.user.id
FROM (SELECT '{"user":{"id":123}}'::JSON AS data);
```

## Limitations

- Read-only access (no INSERT, CREATE, DROP)
- Shared with other users - avoid running heavy queries
- Results may be cached
- Not suitable for performance benchmarking

## Using for Query Prototyping

Draft and validate complex queries against real data before running on production:

```sql
WITH top_users AS (
    SELECT actor_login, count() AS actions
    FROM datasets.github_events
    GROUP BY actor_login
    ORDER BY actions DESC
    LIMIT 100
)
SELECT * FROM top_users;
```

## Summary

The ClickHouse Playground provides instant, zero-setup access to a real ClickHouse instance with sample data. It is ideal for learning, quick prototyping, and testing new features before deploying to your own cluster.
