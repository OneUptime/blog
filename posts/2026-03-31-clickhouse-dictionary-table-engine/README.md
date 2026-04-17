# How to Use Dictionary Table Engine in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Dictionary, Table Engine, Lookup, Performance

Description: Learn how the Dictionary table engine in ClickHouse exposes external dictionaries as queryable tables, enabling fast key-value lookups in SQL.

---

The Dictionary table engine in ClickHouse creates a read-only table interface over an existing ClickHouse dictionary. It allows you to query dictionary data using standard SQL SELECT statements without using dictionary functions like `dictGet`.

## What Is a Dictionary in ClickHouse?

Dictionaries are in-memory key-value stores that ClickHouse loads from external sources (files, databases, HTTP endpoints, other ClickHouse tables). They are primarily used for fast lookups in queries, like enriching event data with user or product metadata.

## Creating a Dictionary

Before using the Dictionary table engine, you need a dictionary:

```sql
CREATE DICTIONARY country_dict
(
    country_code String,
    country_name String,
    continent String
)
PRIMARY KEY country_code
SOURCE(CLICKHOUSE(
    TABLE 'countries'
    DB 'reference'
))
LAYOUT(COMPLEX_KEY_HASHED())
LIFETIME(MIN 300 MAX 600);
```

## Creating a Dictionary Table Engine

Once a dictionary exists, wrap it with the Dictionary table engine:

```sql
CREATE TABLE country_lookup
ENGINE = Dictionary(country_dict);
```

Now you can query it like a regular table:

```sql
SELECT * FROM country_lookup LIMIT 10;

SELECT country_code, country_name
FROM country_lookup
WHERE continent = 'Europe';
```

## Using Dictionary Tables in Joins

The real value of the Dictionary table engine appears in JOINs - it is more readable than `dictGet` and supports complex filtering:

```sql
SELECT
    e.user_id,
    e.event_name,
    c.country_name,
    c.continent
FROM events AS e
INNER JOIN country_lookup AS c ON e.country_code = c.country_code
WHERE e.event_date = today();
```

Internally, ClickHouse still uses the dictionary's hash table for the join, so performance is equivalent to using `dictGet`.

## dictGet vs. Dictionary Table Engine

```sql
-- Using dictGet function
SELECT
    user_id,
    dictGet('country_dict', 'country_name', country_code) AS country_name
FROM events;

-- Using Dictionary table engine
SELECT
    e.user_id,
    c.country_name
FROM events AS e
LEFT JOIN country_lookup AS c ON e.country_code = c.country_code;
```

Both approaches read from the same in-memory dictionary. The table engine approach is preferred when:
- You need to filter or aggregate on dictionary attributes
- Your team prefers standard SQL over function syntax
- You want to inspect dictionary contents directly

## Reloading the Dictionary

The underlying dictionary refreshes on its LIFETIME schedule, and the Dictionary table reflects changes automatically:

```sql
SYSTEM RELOAD DICTIONARY country_dict;
SELECT count() FROM country_lookup;
```

## Summary

The Dictionary table engine bridges ClickHouse dictionaries and SQL, letting you query, join, and filter dictionary data using familiar syntax. It is a thin wrapper - no data is duplicated - and provides full SQL expressiveness over in-memory lookup structures. Use it to simplify enrichment queries and keep your analytics SQL readable.
