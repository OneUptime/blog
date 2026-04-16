# How to Use Named Collections in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Named Collection, Security, Configuration, Credential

Description: Learn how to use ClickHouse Named Collections to store and reuse connection credentials securely without embedding them in queries.

---

## What are Named Collections?

Named Collections, introduced in ClickHouse 21.11 (with SQL DDL support added in 22.12), are named sets of key-value parameters stored server-side. They allow you to reference external data source credentials (S3, PostgreSQL, MySQL, etc.) by name instead of embedding credentials directly in SQL queries or table definitions.

Benefits:
- Credentials are not visible in query logs
- Centralised credential management
- Reusable across tables, functions, and users
- Updatable without restarting ClickHouse

## Defining Named Collections

### Via config.xml / config.d/

```xml
<!-- /etc/clickhouse-server/config.d/named_collections.xml -->
<clickhouse>
  <named_collections>

    <s3_prod>
      <url>https://my-analytics-bucket.s3.amazonaws.com/</url>
      <access_key_id>AKIAIOSFODNN7EXAMPLE</access_key_id>
      <secret_access_key>wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY</secret_access_key>
      <region>us-east-1</region>
    </s3_prod>

    <pg_warehouse>
      <host>postgres.internal</host>
      <port>5432</port>
      <database>warehouse</database>
      <user>clickhouse_reader</user>
      <password>PGSecretPass!</password>
    </pg_warehouse>

    <mysql_app_db>
      <host>mysql.internal</host>
      <port>3306</port>
      <database>app_production</database>
      <user>ch_reader</user>
      <password>MySQLPass!</password>
    </mysql_app_db>

  </named_collections>
</clickhouse>
```

### Via SQL (ClickHouse 22.12+)

```sql
-- Create a named collection via SQL (admin only)
CREATE NAMED COLLECTION s3_backup AS
    url = 'https://backup-bucket.s3.amazonaws.com/',
    access_key_id = 'AKIAIOSFODNN7EXAMPLE',
    secret_access_key = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';

-- List named collections
SELECT name FROM system.named_collections;

-- View a named collection (credentials may be masked)
SELECT name, collection FROM system.named_collections WHERE name = 's3_backup';
```

## Using Named Collections in Table Functions

### S3 Table Function

```sql
-- Without named collection (credentials in query - bad practice)
SELECT count()
FROM s3('https://my-bucket.s3.amazonaws.com/events/*.parquet',
        'AKIAIOSFODNN7EXAMPLE',
        'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        'Parquet');

-- With named collection (credentials stored server-side)
SELECT count()
FROM s3(s3_prod, filename = 'events/*.parquet', format = 'Parquet');
```

### PostgreSQL Table Function

```sql
-- Without named collection
SELECT * FROM postgresql('postgres.internal:5432', 'warehouse', 'users', 'clickhouse_reader', 'PGSecretPass!');

-- With named collection
SELECT * FROM postgresql(pg_warehouse, table = 'users');
```

### MySQL Table Function

```sql
-- Using named collection for MySQL
SELECT * FROM mysql(mysql_app_db, table = 'orders');
```

## Using Named Collections in CREATE TABLE

```sql
-- S3 external table using named collection
CREATE TABLE analytics.s3_events
(
    event_date Date,
    user_id UInt64,
    event_type String
)
ENGINE = S3(s3_prod, filename = 'events/2024/*.parquet', format = 'Parquet');

-- PostgreSQL engine table
CREATE TABLE analytics.pg_users
(
    id UInt64,
    email String,
    created_at DateTime
)
ENGINE = PostgreSQL(pg_warehouse, table = 'users');
```

## Managing Named Collections

```sql
-- Update an existing named collection (SQL-created ones)
ALTER NAMED COLLECTION s3_backup SET
    access_key_id = 'NEW_KEY_ID',
    secret_access_key = 'NEW_SECRET_KEY';

-- Drop a named collection
DROP NAMED COLLECTION s3_backup;
```

## Access Control for Named Collections

```sql
-- Grant a user access to use a specific named collection
GRANT NAMED COLLECTION ON s3_prod TO analyst_user;

-- Grant access to all named collections
GRANT NAMED COLLECTION ON * TO etl_service;
```

## Summary

ClickHouse Named Collections provide a secure, centralised way to store external data source credentials that can be referenced by name in SQL queries and table definitions. Define them in `config.d/named_collections.xml` or via `CREATE NAMED COLLECTION` SQL statements, then use them in S3, PostgreSQL, MySQL, and other table functions. This keeps credentials out of query logs and makes credential rotation straightforward without modifying table definitions.
