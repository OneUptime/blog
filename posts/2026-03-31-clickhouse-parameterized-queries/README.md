# How to Use Parameterized Queries in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Parameterized Query, Security, SQL, Query

Description: Learn how to use parameterized queries in ClickHouse to prevent SQL injection, improve query plan reuse, and write safer application code.

---

Parameterized queries separate SQL structure from user-supplied values, preventing SQL injection and enabling query plan caching. ClickHouse supports parameters through its HTTP interface and client libraries.

## Why Parameterized Queries Matter

Without parameterization, concatenating user input into SQL is dangerous:

```python
# Unsafe - never do this
query = f"SELECT * FROM events WHERE user_id = '{user_input}'"
```

A malicious value like `' OR 1=1 --` would return all rows.

## HTTP Interface Parameters

Using the ClickHouse HTTP interface, pass parameters via query string:

```bash
curl "http://localhost:8123/?query=SELECT+*+FROM+events+WHERE+user_id={user_id:String}&param_user_id=abc123"
```

Parameters are declared with `{name:Type}` syntax inside the query. In the URL query string, parameter values are passed with the `param_` prefix (e.g., `param_user_id=abc123`).

## Supported Parameter Types

```text
String, Int8, Int16, Int32, Int64, UInt8, UInt16, UInt32, UInt64,
Float32, Float64, Date, DateTime, UUID, Array(...), Map(...), Tuple(...), Identifier
```

Most standard ClickHouse data types are supported as parameter types, including complex types like `Array(String)` and `Map(String, UInt64)`. The `Identifier` type is a special type for parameterizing database, table, or column names.

## Python Client Example

Using `clickhouse-driver`:

```python
from clickhouse_driver import Client

client = Client('localhost')

result = client.execute(
    "SELECT event, count() FROM events WHERE user_id = %(user_id)s GROUP BY event",
    {'user_id': 'abc123'}
)
```

## Go Client Example

```go
conn, _ := clickhouse.Open(&clickhouse.Options{Addr: []string{"localhost:9000"}})

chCtx := clickhouse.Context(ctx, clickhouse.WithParameters(clickhouse.Parameters{
    "user_id": "abc123",
    "ts":      time.Now().Add(-24 * time.Hour).Format("2006-01-02 15:04:05"),
}))

rows, _ := conn.Query(chCtx,
    "SELECT event FROM events WHERE user_id = {user_id:String} AND ts > {ts:DateTime}",
)
```

## Named Parameters in SQL Queries

For the HTTP interface and native protocol, use `{name:Type}` syntax for server-side parameterized queries. Client libraries may also offer their own binding syntax (e.g., `%(name)s` in Python's clickhouse-driver):

```sql
SELECT
    toStartOfHour(ts) AS hour,
    count() AS events
FROM clickstream
WHERE
    project_id = {pid:UInt64}
    AND ts BETWEEN {start:DateTime} AND {end:DateTime}
GROUP BY hour
ORDER BY hour;
```

## Benefits for Query Cache

ClickHouse's query cache stores query results keyed by the query's abstract syntax tree (AST). When parameterized queries are used, queries with different parameter values produce different ASTs and are cached separately. However, parameterized queries keep the query structure consistent, which makes cache behavior more predictable and avoids polluting the cache with syntactically different but logically equivalent queries that arise from string concatenation.

## Summary

Parameterized queries are a security baseline and a performance tool in ClickHouse. Use `{name:Type}` syntax via HTTP or your client library's binding mechanism to keep user data separate from SQL structure.
