# How to Implement Search Autocomplete in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Search, Index, Performance, Pattern

Description: Learn how to implement fast search autocomplete in MySQL using prefix indexes and full-text search for responsive typeahead suggestions.

---

## Approaches to Autocomplete in MySQL

MySQL supports two main approaches for autocomplete: prefix matching with `LIKE` on indexed columns, and full-text search with `MATCH ... AGAINST`. The right choice depends on your data size and query requirements.

## Approach 1: Prefix Matching with LIKE

For simple autocomplete on a single column, prefix `LIKE` queries are efficient when combined with proper indexing:

```sql
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    INDEX idx_name (name)  -- B-tree index supports prefix queries
);

-- Prefix LIKE query - uses the index efficiently
SELECT id, name, category
FROM products
WHERE name LIKE 'mysql%'  -- MUST be prefix (no leading wildcard)
ORDER BY name
LIMIT 10;
```

A leading wildcard (`LIKE '%mysql'`) cannot use the index and causes a full scan. Always use prefix matching (`LIKE 'term%'`) for autocomplete.

## Approach 2: Full-Text Search Autocomplete

Full-text search supports more flexible word matching:

```sql
ALTER TABLE products ADD FULLTEXT INDEX ft_name (name);

-- Full-text search with IN BOOLEAN MODE for partial matching
SELECT id, name,
       MATCH(name) AGAINST ('mysql*' IN BOOLEAN MODE) AS relevance
FROM products
WHERE MATCH(name) AGAINST ('mysql*' IN BOOLEAN MODE)
ORDER BY relevance DESC
LIMIT 10;
```

The `*` wildcard in boolean mode matches prefix terms.

## Dedicated Autocomplete Table

For high-performance autocomplete across multiple searchable fields, maintain a dedicated suggestions table:

```sql
CREATE TABLE search_suggestions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    suggestion VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,  -- 'product', 'user', 'article'
    entity_id INT NOT NULL,
    weight INT NOT NULL DEFAULT 0,     -- Higher = more relevant
    UNIQUE KEY uniq_entity (entity_type, entity_id),
    INDEX idx_suggestion (suggestion),
    INDEX idx_weight (weight DESC)
);

-- Populate from products
INSERT INTO search_suggestions (suggestion, entity_type, entity_id, weight)
SELECT name, 'product', id, 100
FROM products
ON DUPLICATE KEY UPDATE weight = VALUES(weight);
```

Autocomplete query:

```sql
SELECT suggestion, entity_type, entity_id
FROM search_suggestions
WHERE suggestion LIKE CONCAT(?, '%')
ORDER BY weight DESC, suggestion
LIMIT 10;
```

## Application-Level Implementation

```python
import mysql.connector

def get_autocomplete_suggestions(conn, query, limit=10):
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT suggestion, entity_type, entity_id
        FROM search_suggestions
        WHERE suggestion LIKE %s
        ORDER BY weight DESC, suggestion
        LIMIT %s
    """, (f"{query}%", limit))

    return cursor.fetchall()

# Usage
suggestions = get_autocomplete_suggestions(conn, "mys")
# Returns: [{'suggestion': 'MySQL', ...}, {'suggestion': 'MySQL 8', ...}]
```

## Optimizing with a Prefix Index

For very large tables, a prefix index saves space while preserving autocomplete performance:

```sql
-- Index only the first 10 characters of name
ALTER TABLE products
    ADD INDEX idx_name_prefix (name(10));

-- This query still benefits from the prefix index
SELECT id, name
FROM products
WHERE name LIKE 'mysql%'
LIMIT 10;
```

## Handling Spaces and Multi-Word Autocomplete

```sql
-- Normalize suggestions on insert
INSERT INTO search_suggestions (suggestion, entity_type, entity_id, weight)
VALUES (LOWER(TRIM('  MySQL Database  ')), 'article', 1, 50);

-- Query with normalized input
SELECT suggestion, entity_type, entity_id
FROM search_suggestions
WHERE suggestion LIKE CONCAT(LOWER(TRIM(?)), '%')
ORDER BY weight DESC
LIMIT 10;
```

## Refreshing Suggestions

```sql
-- Scheduled refresh of the suggestions table
CREATE EVENT refresh_search_suggestions
ON SCHEDULE EVERY 1 HOUR
DO BEGIN
    TRUNCATE TABLE search_suggestions;
    INSERT INTO search_suggestions (suggestion, entity_type, entity_id, weight)
    SELECT LOWER(name), 'product', id, view_count
    FROM products
    WHERE is_active = 1;
END;
```

## Summary

MySQL autocomplete is best served through a dedicated suggestions table with a prefix index, populated from source tables. This decouples autocomplete performance from the main table's size and structure. Prefix `LIKE` queries on an indexed column provide sub-millisecond response times for up to millions of suggestions, making MySQL a viable autocomplete backend for most application scales.
