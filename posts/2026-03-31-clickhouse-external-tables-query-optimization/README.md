# How to Use External Tables for Query Optimization in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, External Table, Query Optimization, Temporary Table, Join, Performance

Description: Learn how to use external tables and temporary tables in ClickHouse to pass data for IN clauses and JOINs without loading data into permanent storage.

---

External tables in ClickHouse allow clients to pass data alongside a query, which ClickHouse stores temporarily as a table for the duration of that query. This is powerful for filtering or joining against external datasets without permanently loading them into ClickHouse.

## What Are External Tables?

When you send an HTTP query to ClickHouse, you can attach external data in the request body. ClickHouse creates a temporary table from this data, which you can reference in your query. The table is deleted when the connection closes.

Common use cases:
- Passing a list of IDs to filter results
- Joining against a dataset from another system
- Testing join logic before loading data

## Using External Tables via HTTP

Send a query with attached external data:

```bash
echo "1
2
3
4
5" | curl 'http://localhost:8123/?query=SELECT+*+FROM+events+WHERE+user_id+IN+filter_ids&filter_ids_format=TabSeparated&filter_ids_structure=user_id+UInt64' \
  --data-binary @-
```

More practical with a file:

```bash
curl 'http://localhost:8123/?query=SELECT+count()+FROM+events+WHERE+user_id+IN+target_ids&target_ids_format=TabSeparated&target_ids_structure=user_id+UInt64' \
  --form 'target_ids=@/tmp/user_ids.tsv;type=text/plain'
```

## Using Temporary Tables in SQL

Create in-session temporary tables for query optimization:

```sql
-- Create a temporary table (Memory engine, session-scoped)
CREATE TEMPORARY TABLE high_value_users (user_id UInt64)
ENGINE = Memory;

-- Populate from another source
INSERT INTO high_value_users VALUES (1001), (1002), (1003);

-- Use in query
SELECT e.user_id, count() AS events
FROM events e
INNER JOIN high_value_users hv ON e.user_id = hv.user_id
GROUP BY e.user_id;

-- Table is automatically dropped at session end
```

## External Tables for JOIN Optimization

When joining small lookup data against a large table:

```sql
-- Small dimension table as temporary table
CREATE TEMPORARY TABLE country_lookup (
    country_code String,
    region String,
    continent String
) ENGINE = Memory;

INSERT INTO country_lookup VALUES
    ('US', 'North America', 'Americas'),
    ('DE', 'Western Europe', 'Europe'),
    ('JP', 'East Asia', 'Asia');

-- Join with large events table
SELECT
    cl.continent,
    count() AS events,
    uniq(e.user_id) AS unique_users
FROM events e
INNER JOIN country_lookup cl ON e.country_code = cl.country_code
GROUP BY cl.continent
ORDER BY events DESC;
```

## Using Dictionaries as External Data Sources

For persistent lookup tables, use dictionaries which load external data and cache it in memory:

```sql
CREATE DICTIONARY country_dict (
    country_code String,
    country_name String,
    region String
)
PRIMARY KEY country_code
SOURCE(HTTP(URL 'https://api.example.com/countries' FORMAT 'CSV'))
LIFETIME(MIN 60 MAX 3600)
LAYOUT(HASHED());

-- Use in queries
SELECT
    event_type,
    dictGet('country_dict', 'region', country_code) AS region,
    count() AS events
FROM events
GROUP BY event_type, region;
```

## External Data via Python Client

Using the Python clickhouse-driver to pass external data:

```python
from clickhouse_driver import Client

client = Client('localhost')

# Pass external table data
result = client.execute(
    'SELECT * FROM events WHERE user_id IN user_filter',
    external_tables=[{
        'name': 'user_filter',
        'structure': [('user_id', 'UInt64')],
        'data': [{'user_id': 1001}, {'user_id': 1002}, {'user_id': 1003}]
    }]
)
```

## Performance Comparison

Benchmark external table vs. subquery vs. IN list:

```sql
-- Check query metrics for different approaches
SELECT
    query,
    query_duration_ms,
    read_rows,
    memory_usage
FROM system.query_log
WHERE type = 'QueryFinish'
  AND event_date = today()
  AND (query LIKE '%user_filter%' OR query LIKE '%IN (%')
ORDER BY event_time DESC;
```

## Summary

External tables and temporary tables in ClickHouse provide a flexible way to join or filter against external datasets without permanently loading them. Use HTTP external tables for API-driven workflows, SQL temporary tables for session-scoped lookups, and dictionaries for persistent cached external data sources. This approach keeps your ClickHouse schema clean while enabling rich joins with external systems.
