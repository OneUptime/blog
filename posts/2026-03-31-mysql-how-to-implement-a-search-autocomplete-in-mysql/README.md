# How to Implement a Search Autocomplete in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Autocomplete, Full-Text Search, LIKE, Performance

Description: Learn how to implement a search autocomplete feature in MySQL using prefix LIKE queries, full-text search, and indexed strategies for fast suggestions.

---

## Approaches to Autocomplete in MySQL

There are four main approaches for implementing autocomplete in MySQL:
1. Prefix LIKE with a B-tree index - fast for simple prefix matching.
2. Case-insensitive prefix search - using appropriate collations with LIKE.
3. Full-Text Search with `MATCH ... AGAINST` - better for multi-word and natural language suggestions.
4. N-gram full-text parser - for mid-word and substring matching.

## Approach 1 - Prefix LIKE with Index

### Setup

```sql
CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  INDEX idx_name (name)
);

INSERT INTO products (name) VALUES
  ('Wireless Mouse'),
  ('Wireless Keyboard'),
  ('Wired Mouse'),
  ('Bluetooth Headphones'),
  ('USB Hub');
```

### Prefix LIKE Query

```sql
SELECT id, name
FROM products
WHERE name LIKE 'Wireless%'
ORDER BY name
LIMIT 10;
```

The key is the `%` wildcard at the end only - not the beginning. `LIKE 'Wireless%'` can use the index on `name`. `LIKE '%Wireless%'` cannot.

### EXPLAIN to Verify Index Usage

```sql
EXPLAIN SELECT id, name FROM products WHERE name LIKE 'Wire%';
```

Look for `Using index condition` in the Extra column.

## Approach 2 - Case-Insensitive Prefix Search

By default, `LIKE` comparisons are case-insensitive for `utf8mb4_general_ci` and `utf8mb4_0900_ai_ci` collations.

```sql
CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  INDEX idx_name (name)
);
```

Now `LIKE 'wire%'` will match "Wired Mouse" and "Wireless Mouse".

## Approach 3 - Full-Text Search Autocomplete

Full-Text Search allows matching against partial words across multiple columns using `IN BOOLEAN MODE`:

```sql
ALTER TABLE products ADD FULLTEXT INDEX ft_name (name);
```

```sql
SELECT id, name
FROM products
WHERE MATCH(name) AGAINST ('wire*' IN BOOLEAN MODE)
ORDER BY MATCH(name) AGAINST ('wire*' IN BOOLEAN MODE) DESC
LIMIT 10;
```

The `*` operator in boolean mode acts as a wildcard suffix, similar to prefix LIKE but with relevance scoring.

## Approach 4 - N-gram Full-Text Parser for Mid-Word Matching

The built-in full-text parser only matches word prefixes. For mid-word suggestions ("keyboard" from "eyboard"), use the ngram parser:

```sql
CREATE TABLE products_ngram (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  FULLTEXT INDEX ft_name_ngram (name) WITH PARSER ngram
);

-- Set ngram token size (default 2, set to 2-3 for autocomplete)
-- In my.cnf: ngram_token_size = 2
```

```sql
SELECT id, name
FROM products_ngram
WHERE MATCH(name) AGAINST ('eless' IN BOOLEAN MODE)
LIMIT 10;
```

## Building an Autocomplete API in Python

```python
import mysql.connector

def get_suggestions(prefix: str, limit: int = 10) -> list:
    conn = mysql.connector.connect(
        host='localhost',
        user='app_user',
        password='password',
        database='myapp'
    )
    cursor = conn.cursor()
    # Safe parameterized query - no SQL injection risk
    query = "SELECT id, name FROM products WHERE name LIKE %s ORDER BY name LIMIT %s"
    cursor.execute(query, (prefix + '%', limit))
    results = [{'id': row[0], 'name': row[1]} for row in cursor.fetchall()]
    cursor.close()
    conn.close()
    return results

suggestions = get_suggestions('Wire')
print(suggestions)
```

## Caching Autocomplete Results

For high-traffic autocomplete endpoints, cache results in Redis:

```python
import redis
import json

redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)

def get_suggestions_cached(prefix: str) -> list:
    cache_key = f"autocomplete:{prefix.lower()}"
    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)

    suggestions = get_suggestions(prefix)
    redis_client.setex(cache_key, 300, json.dumps(suggestions))  # Cache 5 min
    return suggestions
```

## Optimizing for Large Tables

For tables with millions of rows, add a covering index:

```sql
ALTER TABLE products ADD INDEX idx_name_id (name, id);
```

This allows the prefix LIKE query to be served entirely from the index without accessing the table data.

## Summary

MySQL supports autocomplete through prefix LIKE queries with B-tree indexes for simple cases, and Full-Text Search with boolean mode wildcards for relevance-ranked suggestions. For mid-word matching, the ngram full-text parser enables substring lookups. Always use parameterized queries in application code to prevent SQL injection, and cache frequently requested prefixes in an in-memory store like Redis for sub-millisecond response times.
