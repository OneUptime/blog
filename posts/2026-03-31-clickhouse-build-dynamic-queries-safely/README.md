# How to Build Dynamic Queries Safely in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Dynamic Query, SQL Injection, Security, Query Builder

Description: Learn techniques for building dynamic ClickHouse queries safely, avoiding SQL injection while supporting flexible filters, sorting, and column selection.

---

Dynamic query generation is common in dashboards and APIs where filters, sort orders, and selected columns come from user input. Doing this safely requires distinguishing between values (always parameterized) and structural elements (validated via allowlists).

## The Core Rule

- **Values** (filter conditions, thresholds): always use parameters
- **Structural elements** (table names, column names, operators): validate against an allowlist

## Safe Value Injection

```python
from clickhouse_driver import Client

client = Client('localhost')

def get_user_events(user_id: str, event_type: str):
    return client.execute(
        """
        SELECT ts, event_type, metadata
        FROM events
        WHERE user_id = %(uid)s
          AND event_type = %(et)s
        ORDER BY ts DESC
        LIMIT 100
        """,
        {'uid': user_id, 'et': event_type}
    )
```

## Safe Column Selection with Allowlists

```python
ALLOWED_COLUMNS = {'ts', 'user_id', 'event_type', 'session_id', 'country'}
ALLOWED_SORT_DIRS = {'ASC', 'DESC'}

def build_select(columns: list, sort_col: str, sort_dir: str):
    safe_cols = [c for c in columns if c in ALLOWED_COLUMNS]
    if sort_col not in ALLOWED_COLUMNS:
        sort_col = 'ts'
    if sort_dir.upper() not in ALLOWED_SORT_DIRS:
        sort_dir = 'DESC'

    col_list = ', '.join(safe_cols) or '*'
    return f"SELECT {col_list} FROM events ORDER BY {sort_col} {sort_dir} LIMIT 1000"
```

## Safe Dynamic Filters

```python
def build_filter_query(filters: dict):
    allowed_filters = {
        'country': 'String',
        'platform': 'String',
        'version': 'String',
    }
    conditions = []
    params = {}

    for key, val in filters.items():
        if key in allowed_filters:
            conditions.append(f"{key} = %({key})s")
            params[key] = val

    where = ' AND '.join(conditions) if conditions else '1=1'
    query = f"SELECT count() FROM events WHERE {where}"
    return query, params
```

## Avoiding Common Mistakes

Never interpolate user input into SQL directly:

```python
# UNSAFE
query = f"SELECT * FROM events WHERE country = '{user_country}'"

# SAFE
query = "SELECT * FROM events WHERE country = %(country)s"
params = {'country': user_country}
```

## Using ClickHouse HTTP Parameters for Structural Safety

For column names passed via API, validate them server-side before using the ClickHouse parameter system for values:

```bash
# Only value substitution via ClickHouse params - column name is pre-validated
curl "http://localhost:8123/?query=SELECT+ts,{col:Identifier}+FROM+events+WHERE+user_id={uid:String}&param_col=country&param_uid=abc"
```

Note: `Identifier` type is available in newer ClickHouse versions for safe identifier injection.

## Summary

Safe dynamic queries in ClickHouse combine parameterized values with allowlist-validated structural elements. Never interpolate raw user input into SQL - always validate column names and use typed parameters for all values.
