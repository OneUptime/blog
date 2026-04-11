# How to Export Redis Data to PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, PostgreSQL, Export, ETL, Data Migration

Description: Learn how to export Redis data to PostgreSQL by scanning keys, reading values by type, and writing them into relational tables with Python.

---

Moving data from Redis to PostgreSQL is a common task when you need to persist Redis data for long-term storage, analytics, or reporting. Since Redis stores data by type (string, hash, list, set, sorted set), each type needs a different export strategy.

## Setup

```python
import redis
import psycopg2

r = redis.Redis(host="localhost", port=6379, password="your-password", decode_responses=True)
pg = psycopg2.connect("postgresql://user:password@localhost:5432/mydb")
cur = pg.cursor()
```

## Export String Keys

Strings are the simplest - scan keys and insert as key-value rows:

```python
def export_strings_to_pg(key_pattern="session:*", table="redis_sessions"):
    cur.execute(f"""
        CREATE TABLE IF NOT EXISTS {table} (
            key TEXT PRIMARY KEY,
            value TEXT,
            ttl_seconds INTEGER,
            exported_at TIMESTAMPTZ DEFAULT NOW()
        )
    """)
    pg.commit()

    count = 0
    for key in r.scan_iter(key_pattern, count=500):
        if r.type(key) != "string":
            continue
        value = r.get(key)
        ttl = r.ttl(key)
        cur.execute(f"""
            INSERT INTO {table} (key, value, ttl_seconds)
            VALUES (%s, %s, %s)
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, ttl_seconds = EXCLUDED.ttl_seconds
        """, (key, value, ttl if ttl > 0 else None))
        count += 1
        if count % 1000 == 0:
            pg.commit()
            print(f"Exported {count} strings...")

    pg.commit()
    print(f"Done: {count} strings exported")
```

## Export Hash Keys

Hashes map naturally to relational rows:

```python
def export_hashes_to_pg(key_pattern="user:*", table="users"):
    # First, discover all field names from a sample of keys
    sample_keys = list(r.scan_iter(key_pattern, count=10))[:5]
    all_fields = set()
    for key in sample_keys:
        all_fields.update(r.hkeys(key))

    # Create table with dynamic columns
    col_defs = ", ".join([f'"{f}" TEXT' for f in sorted(all_fields)])
    cur.execute(f"""
        CREATE TABLE IF NOT EXISTS {table} (
            redis_key TEXT PRIMARY KEY,
            {col_defs},
            exported_at TIMESTAMPTZ DEFAULT NOW()
        )
    """)
    pg.commit()

    count = 0
    for key in r.scan_iter(key_pattern, count=500):
        if r.type(key) != "hash":
            continue
        data = r.hgetall(key)
        fields = ["redis_key"] + list(data.keys())
        values = [key] + list(data.values())
        placeholders = ", ".join(["%s"] * len(values))
        col_names = ", ".join(['"redis_key"'] + [f'"{f}"' for f in data.keys()])
        cur.execute(f"""
            INSERT INTO {table} ({col_names})
            VALUES ({placeholders})
            ON CONFLICT (redis_key) DO NOTHING
        """, values)
        count += 1
        if count % 500 == 0:
            pg.commit()
            print(f"Exported {count} hashes...")

    pg.commit()
    print(f"Done: {count} hashes exported")
```

## Export List Keys

```python
def export_lists_to_pg(key_pattern="queue:*", table="queue_items"):
    cur.execute(f"""
        CREATE TABLE IF NOT EXISTS {table} (
            id SERIAL PRIMARY KEY,
            list_key TEXT,
            position INTEGER,
            value TEXT,
            exported_at TIMESTAMPTZ DEFAULT NOW()
        )
    """)
    pg.commit()

    count = 0
    for key in r.scan_iter(key_pattern, count=100):
        if r.type(key) != "list":
            continue
        items = r.lrange(key, 0, -1)
        for i, item in enumerate(items):
            cur.execute(f"""
                INSERT INTO {table} (list_key, position, value)
                VALUES (%s, %s, %s)
            """, (key, i, item))
            count += 1
        if count % 1000 == 0:
            pg.commit()

    pg.commit()
    print(f"Done: {count} list items exported")
```

## Export Sorted Set Keys (with Scores)

```python
def export_sorted_sets_to_pg(key_pattern="leaderboard:*", table="leaderboard"):
    cur.execute(f"""
        CREATE TABLE IF NOT EXISTS {table} (
            zset_key TEXT,
            member TEXT,
            score DOUBLE PRECISION,
            exported_at TIMESTAMPTZ DEFAULT NOW(),
            PRIMARY KEY (zset_key, member)
        )
    """)
    pg.commit()

    count = 0
    for key in r.scan_iter(key_pattern, count=100):
        if r.type(key) != "zset":
            continue
        members = r.zrange(key, 0, -1, withscores=True)
        for member, score in members:
            cur.execute(f"""
                INSERT INTO {table} (zset_key, member, score)
                VALUES (%s, %s, %s)
                ON CONFLICT (zset_key, member) DO UPDATE SET score = EXCLUDED.score
            """, (key, member, score))
            count += 1
        if count % 5000 == 0:
            pg.commit()

    pg.commit()
    print(f"Done: {count} sorted set members exported")
```

## Run All Exports

```python
if __name__ == "__main__":
    export_strings_to_pg("session:*", "redis_sessions")
    export_hashes_to_pg("user:*", "users")
    export_lists_to_pg("queue:*", "queue_items")
    export_sorted_sets_to_pg("leaderboard:*", "leaderboard")

    cur.close()
    pg.close()
    print("All exports complete")
```

## Summary

Exporting Redis data to PostgreSQL requires handling each Redis data type separately. Use `SCAN` to iterate keys safely without blocking Redis, batch your commits for performance, and map Redis types to appropriate relational schemas. Hashes map cleanly to rows, lists to ordered tables, and sorted sets to tables with score columns.
