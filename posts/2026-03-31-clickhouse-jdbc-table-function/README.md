# How to Use jdbc() Table Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, jdbc(), Table Function, JDBC, Integration, SQL, External Data

Description: Learn how to use the jdbc() table function in ClickHouse to query external relational databases like PostgreSQL and MySQL directly from ClickHouse SQL queries.

---

The `jdbc()` table function in ClickHouse allows you to execute SQL queries against external JDBC-compatible databases - including PostgreSQL, MySQL, Oracle, and SQL Server - directly from ClickHouse queries. Unlike the JDBC table engine, which creates a permanent table object, `jdbc()` is a one-off function call, making it ideal for ad hoc joins and data pulls.

## Prerequisites

The `jdbc()` function requires the ClickHouse JDBC Bridge to be running as a separate Java process. Install it from the official ClickHouse repository.

```bash
# Download JDBC Bridge JAR (latest release at the time of writing)
wget https://github.com/ClickHouse/clickhouse-jdbc-bridge/releases/download/v2.1.0/clickhouse-jdbc-bridge-2.1.0-shaded.jar

# Start the bridge (default port 9019)
java -jar clickhouse-jdbc-bridge-2.1.0-shaded.jar
```

Configure the data source by dropping a JSON file (for example `pg_prod.json`) into the bridge's `config/datasources/` directory:

```text
{
  "pg_prod": {
    "driverUrls": ["https://jdbc.postgresql.org/download/postgresql-42.7.1.jar"],
    "driverClassName": "org.postgresql.Driver",
    "jdbcUrl": "jdbc:postgresql://pg-host:5432/mydb",
    "username": "reader",
    "password": "secret"
  }
}
```

## Basic Syntax

```sql
jdbc('datasource_name', 'query')
jdbc('datasource_name', 'database', 'table')
jdbc('datasource_name', 'schema', 'table')
```

## Query a Remote PostgreSQL Table

```sql
-- Pull all rows from a PostgreSQL table
SELECT *
FROM jdbc('pg_prod', 'SELECT id, name, email FROM customers WHERE active = true')
LIMIT 100;
```

## Join ClickHouse Data with External JDBC Data

```sql
-- Enrich ClickHouse events with customer data from PostgreSQL
SELECT
    e.event_time,
    e.event_type,
    c.name  AS customer_name,
    c.plan  AS customer_plan
FROM events AS e
INNER JOIN (
    SELECT id, name, plan
    FROM jdbc('pg_prod', 'SELECT id, name, plan FROM customers')
) AS c ON e.user_id = c.id
WHERE e.event_time >= today() - 7
ORDER BY e.event_time DESC
LIMIT 1000;
```

## Aggregating External Data

```sql
-- Aggregate directly over a remote table
SELECT
    region,
    count()         AS customer_count,
    sum(lifetime_value) AS total_ltv
FROM jdbc('pg_prod', 'SELECT region, lifetime_value FROM customers')
GROUP BY region
ORDER BY total_ltv DESC;
```

## Using jdbc() with INSERT INTO

Migrate data from an external source into ClickHouse:

```sql
INSERT INTO ch_customers (id, name, email, created_at)
SELECT id, name, email, created_at
FROM jdbc('pg_prod', 'SELECT id, name, email, created_at FROM customers');
```

## Checking Available JDBC Sources

The bridge exposes a special `show datasources` query:

```sql
SELECT *
FROM jdbc('', 'show datasources');
```

## Performance Considerations

- `jdbc()` pushes the query string as-is to the remote database - use precise WHERE clauses to avoid full-table scans on the remote side.
- For repeated access, consider the JDBC table engine or materializing data into a local ClickHouse table with a scheduled INSERT pipeline.
- Network latency between ClickHouse and the JDBC Bridge matters; co-locate them when possible.

```sql
-- Push filtering to the remote side to minimize data transfer
SELECT *
FROM jdbc('pg_prod', 'SELECT id, revenue FROM orders WHERE created_at > NOW() - INTERVAL ''7 days''')
```

## Troubleshooting Connection Issues

```sql
-- Test connectivity
SELECT count() FROM jdbc('pg_prod', 'SELECT 1 AS n');
```

Check the JDBC Bridge logs for driver errors or authentication failures. Ensure the ClickHouse server can reach the bridge on port 9019 (or your configured port).

## Summary

The `jdbc()` table function lets ClickHouse query any JDBC-compatible database on the fly, enabling ad hoc joins and data migrations without creating permanent table objects. It requires the ClickHouse JDBC Bridge as a sidecar process, and performance depends on pushing WHERE predicates to the remote database. For high-frequency or production use, prefer the JDBC table engine or a scheduled data ingestion pipeline into native ClickHouse tables.
