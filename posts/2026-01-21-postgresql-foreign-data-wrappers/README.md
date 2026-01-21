# How to Use PostgreSQL Foreign Data Wrappers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Foreign Data Wrappers, FDW, Data Integration, Federation

Description: A guide to using PostgreSQL Foreign Data Wrappers (FDW) to query external data sources like other databases, files, and APIs.

---

Foreign Data Wrappers (FDW) allow PostgreSQL to query external data sources as if they were local tables. This guide covers common FDW implementations.

## postgres_fdw (PostgreSQL to PostgreSQL)

### Setup

```sql
-- Install extension
CREATE EXTENSION postgres_fdw;

-- Create server
CREATE SERVER remote_server
    FOREIGN DATA WRAPPER postgres_fdw
    OPTIONS (host 'remote.example.com', port '5432', dbname 'remotedb');

-- Create user mapping
CREATE USER MAPPING FOR local_user
    SERVER remote_server
    OPTIONS (user 'remote_user', password 'password');

-- Import foreign table
CREATE FOREIGN TABLE remote_users (
    id INTEGER,
    name VARCHAR(100),
    email VARCHAR(255)
) SERVER remote_server OPTIONS (table_name 'users');
```

### Query Remote Data

```sql
-- Query like local table
SELECT * FROM remote_users WHERE id = 1;

-- Join local and remote
SELECT l.order_id, r.name
FROM orders l
JOIN remote_users r ON l.user_id = r.id;
```

### Import Schema

```sql
-- Import all tables from remote schema
IMPORT FOREIGN SCHEMA public
    FROM SERVER remote_server
    INTO local_schema;
```

## file_fdw (CSV Files)

```sql
CREATE EXTENSION file_fdw;

CREATE SERVER file_server FOREIGN DATA WRAPPER file_fdw;

CREATE FOREIGN TABLE log_data (
    timestamp TIMESTAMP,
    level VARCHAR(10),
    message TEXT
) SERVER file_server
OPTIONS (filename '/var/log/app/data.csv', format 'csv', header 'true');

SELECT * FROM log_data WHERE level = 'ERROR';
```

## mysql_fdw

```sql
CREATE EXTENSION mysql_fdw;

CREATE SERVER mysql_server
    FOREIGN DATA WRAPPER mysql_fdw
    OPTIONS (host 'mysql.example.com', port '3306');

CREATE USER MAPPING FOR postgres
    SERVER mysql_server
    OPTIONS (username 'mysql_user', password 'password');

CREATE FOREIGN TABLE mysql_products (
    id INT,
    name VARCHAR(100),
    price DECIMAL(10,2)
) SERVER mysql_server
OPTIONS (dbname 'shop', table_name 'products');
```

## Performance Tips

```sql
-- Push down WHERE clauses
SELECT * FROM remote_users WHERE id > 1000;
-- FDW sends: SELECT ... WHERE id > 1000

-- Use ANALYZE
ANALYZE remote_users;

-- Check query plan
EXPLAIN SELECT * FROM remote_users WHERE id = 1;
```

## Best Practices

1. **Use connection pooling** - For remote PostgreSQL
2. **Limit columns** - Only import needed columns
3. **Push down predicates** - Filter at source
4. **Cache when appropriate** - Materialized views
5. **Monitor performance** - Remote queries can be slow

## Conclusion

FDW enables data federation across diverse sources. Use for cross-database queries, data integration, and accessing external files.
