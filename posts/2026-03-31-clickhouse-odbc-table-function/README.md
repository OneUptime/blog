# How to Use odbc() Table Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, odbc(), Table Function, ODBC, Integration, SQL, External Data

Description: Learn how to use the odbc() table function in ClickHouse to query external databases via ODBC drivers, enabling ad hoc joins and data pulls from relational systems.

---

The `odbc()` table function in ClickHouse provides direct SQL access to any ODBC-compatible data source - including PostgreSQL, MySQL, Microsoft SQL Server, and Oracle - without creating a permanent table object. It complements the ODBC table engine and is suited for exploratory queries and one-time data migrations.

## Prerequisites

You need an ODBC driver manager (`unixODBC`) and the driver for your target database.

```bash
# Install unixODBC
sudo apt-get install unixodbc unixodbc-dev

# Install PostgreSQL ODBC driver
sudo apt-get install odbc-postgresql
```

Configure your DSN in `/etc/odbc.ini`:

```text
[pg_prod]
Driver   = PostgreSQL Unicode
Server   = pg-host
Port     = 5432
Database = mydb
Username = reader
Password  = secret
```

Register the driver in `/etc/odbcinst.ini`:

```text
[PostgreSQL Unicode]
Description = PostgreSQL ODBC driver
Driver      = /usr/lib/x86_64-linux-gnu/odbc/psqlodbcw.so
```

## Basic Syntax

```sql
odbc('DSN=dsn_name', 'database_or_schema', 'table')
odbc('DSN=dsn_name', 'table')
```

## Query a Remote Table via ODBC

```sql
-- Fetch rows from a PostgreSQL table through ODBC
SELECT id, name, email
FROM odbc('DSN=pg_prod', 'public', 'customers')
WHERE active = 1
LIMIT 50;
```

## Using Table Shorthand

```sql
-- Equivalent shorthand using schema and table name
SELECT *
FROM odbc('DSN=pg_prod', 'public', 'customers')
LIMIT 100;
```

## Join ClickHouse with External ODBC Data

```sql
SELECT
    e.event_time,
    e.event_type,
    c.name AS customer_name
FROM events AS e
INNER JOIN odbc('DSN=pg_prod', 'public', 'customers') AS c ON e.user_id = c.id
WHERE e.event_time >= today() - 7
ORDER BY e.event_time DESC;
```

## Migrate Data from ODBC Source into ClickHouse

```sql
INSERT INTO ch_orders (order_id, customer_id, amount, created_at)
SELECT order_id, customer_id, amount, created_at
FROM odbc('DSN=pg_prod', 'public', 'orders')
WHERE created_at > '2026-01-01';
```

## Type Mapping Considerations

ODBC types map to ClickHouse types automatically. Common mappings:

```text
ODBC Type       ClickHouse Type
INTEGER         Int32
BIGINT          Int64
VARCHAR(n)      String
TIMESTAMP       DateTime
NUMERIC(p,s)    Decimal(p,s)
BIT             UInt8
```

Verify the inferred schema before large migrations:

```sql
DESCRIBE TABLE odbc('DSN=pg_prod', 'public', 'orders');
```

## Security Considerations

Store ODBC credentials in the system DSN file with restricted permissions rather than embedding them in query strings. The ClickHouse `odbc()` function reads the DSN by name, keeping credentials out of query logs.

```bash
chmod 600 /etc/odbc.ini
```

## Testing Connectivity

```sql
-- Simple connectivity test
SELECT count() FROM odbc('DSN=pg_prod', 'public', 'customers');
```

## Summary

The `odbc()` table function enables ad hoc SQL queries against any ODBC-compatible database from within ClickHouse. Configure DSNs via `odbc.ini`, use push-down WHERE clauses to minimize data transfer, and use `INSERT INTO ... SELECT ... FROM odbc(...)` for migrations. For repeated access patterns, the ODBC table engine or a scheduled ingestion pipeline is more efficient.
