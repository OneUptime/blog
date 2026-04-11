# How to Use JSON_SEARCH() in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, JSON, Database

Description: Learn how to use MySQL JSON_SEARCH() to find the path of a string value within a JSON document, supporting both first-match and all-match modes with wildcard patterns.

---

## What JSON_SEARCH() Does

`JSON_SEARCH()` searches a JSON document for a string value and returns the path (or paths) where it was found. Instead of returning the value itself, it returns the path expression, which you can then use with `JSON_EXTRACT()` or other JSON functions.

```mermaid
flowchart TD
    A[JSON document] --> B[JSON_SEARCH\nmode, search_string]
    B --> C{Value found?}
    C -->|Found, mode='one'| D[Return first matching path\n'$.tags[1]']
    C -->|Found, mode='all'| E[Return all matching paths\n'["$.tags[1]","$.meta.label"]']
    C -->|Not found| F[Return NULL]
    C -->|Any arg NULL| G[Return NULL]
```

## Syntax

```sql
JSON_SEARCH(json_doc, one_or_all, search_str [, escape_char [, path ...]])
```

- `json_doc` - the JSON document to search
- `one_or_all` - `'one'` returns the first match path; `'all'` returns all match paths as a JSON array
- `search_str` - the string to search for (supports `%` and `_` wildcards like `LIKE`)
- `escape_char` (optional) - escape character for wildcards (default `\`)
- `path` (optional) - restrict the search to specific path(s)

`JSON_SEARCH()` only searches string values, not numbers or booleans.

## Setup: Sample Table

```sql
CREATE TABLE catalog (
    id    INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(100),
    data  JSON
);

INSERT INTO catalog (title, data) VALUES
('Item A',
 '{"sku": "SKU-001", "tags": ["electronics", "sale", "clearance"],
   "meta": {"label": "sale", "category": "phones"}}'),
('Item B',
 '{"sku": "SKU-002", "tags": ["clothing", "new"],
   "meta": {"label": "new", "category": "apparel"}}'),
('Item C',
 '{"sku": "SKU-003", "tags": ["electronics", "featured"],
   "meta": {"label": "featured", "category": "laptops"}}'),
('Item D',
 '{"sku": "SKU-004", "tags": ["sale"],
   "meta": {"label": "sale", "category": "accessories"}}');
```

## Basic Search: mode 'one'

`'one'` returns the path of the first matching string value:

```sql
SELECT
    title,
    JSON_SEARCH(data, 'one', 'sale') AS first_path
FROM catalog;
```

```text
+---------+-------------------+
| title   | first_path        |
+---------+-------------------+
| Item A  | "$.tags[1]"       |
| Item B  | NULL              |
| Item C  | NULL              |
| Item D  | "$.tags[0]"       |
+---------+-------------------+
```

Item A finds `'sale'` at `$.tags[1]` (note: the order in which paths are matched with `'one'` mode is not defined per the MySQL documentation, so the first match returned may vary between versions). Item B and C have no `'sale'` string.

## Search All Matches: mode 'all'

`'all'` returns a JSON array of all matching paths:

```sql
SELECT
    title,
    JSON_SEARCH(data, 'all', 'sale') AS all_paths
FROM catalog;
```

```text
+---------+------------------------------------+
| title   | all_paths                          |
+---------+------------------------------------+
| Item A  | ["$.tags[1]", "$.meta.label"]      |
| Item B  | NULL                               |
| Item C  | NULL                               |
| Item D  | ["$.tags[0]", "$.meta.label"]      |
+---------+------------------------------------+
```

## Using JSON_SEARCH() in WHERE to Filter Rows

Use `IS NOT NULL` to check whether any match was found:

```sql
SELECT title
FROM catalog
WHERE JSON_SEARCH(data, 'one', 'sale') IS NOT NULL;
```

```text
+---------+
| title   |
+---------+
| Item A  |
| Item D  |
+---------+
```

## Wildcard Search

`JSON_SEARCH()` supports `%` and `_` wildcards just like `LIKE`:

```sql
-- Find items where any string value starts with 'SKU-00'
SELECT title, JSON_SEARCH(data, 'one', 'SKU-00%') AS sku_path
FROM catalog;
```

```text
+---------+----------+
| title   | sku_path |
+---------+----------+
| Item A  | "$.sku"  |
| Item B  | "$.sku"  |
| Item C  | "$.sku"  |
| Item D  | "$.sku"  |
+---------+----------+
```

```sql
-- Find items where any tag starts with 'electr'
SELECT title, JSON_SEARCH(data, 'all', 'electr%', NULL, '$.tags') AS elec_paths
FROM catalog;
```

```text
+---------+------------+
| title   | elec_paths |
+---------+------------+
| Item A  | "$.tags[0]"|
| Item B  | NULL       |
| Item C  | "$.tags[0]"|
| Item D  | NULL       |
+---------+------------+
```

## Restricting Search to a Specific Path

Use the optional path argument to limit where the search occurs:

```sql
-- Search only within the tags array
SELECT
    title,
    JSON_SEARCH(data, 'one', 'sale', NULL, '$.tags') AS tag_path,
    JSON_SEARCH(data, 'one', 'sale', NULL, '$.meta') AS meta_path
FROM catalog;
```

```text
+---------+------------+------------------+
| title   | tag_path   | meta_path        |
+---------+------------+------------------+
| Item A  | "$.tags[1]"| "$.meta.label"   |
| Item B  | NULL       | NULL             |
| Item C  | NULL       | NULL             |
| Item D  | "$.tags[0]"| "$.meta.label"   |
+---------+------------+------------------+
```

## Using the Returned Path with JSON_EXTRACT()

Since `JSON_SEARCH()` returns a path expression, you can feed it to `JSON_EXTRACT()`:

```sql
SELECT
    title,
    JSON_SEARCH(data, 'one', 'sale')  AS sale_path,
    JSON_UNQUOTE(
        JSON_EXTRACT(data, JSON_UNQUOTE(JSON_SEARCH(data, 'one', 'sale')))
    )                                  AS value_at_path
FROM catalog
WHERE JSON_SEARCH(data, 'one', 'sale') IS NOT NULL;
```

## NULL Handling

```sql
SELECT JSON_SEARCH(NULL, 'one', 'sale');        -- NULL
SELECT JSON_SEARCH('{"a": "x"}', 'one', NULL);  -- NULL
SELECT JSON_SEARCH('{"a": 1}', 'one', 'sale');  -- NULL (not found)
```

## Difference Between 'one' and 'all' Return Types

- `'one'` returns a JSON string (scalar path): `"$.tags[1]"`
- `'all'` with multiple matches returns a JSON array of path strings: `["$.tags[1]", "$.meta.label"]`. With a single match, it returns a scalar path string like `'one'`

When using the result downstream, `JSON_UNQUOTE()` removes the outer quotes from a `'one'` result so it can be used as a raw path string.

## Summary

`JSON_SEARCH()` finds the path(s) of a string value within a JSON document. Use `'one'` to get the first match and `'all'` to get every matching path as a JSON array. It supports `%` and `_` wildcards for pattern matching and can be restricted to a specific sub-path. The primary use cases are checking for value membership, finding where a value lives in a complex document, and combining the returned path with `JSON_EXTRACT()` for dynamic lookups.
