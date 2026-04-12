# How to Use JSON_SEARCH() Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Json Search, JSON, JSON Function, SQL

Description: Learn how to use MySQL's JSON_SEARCH() function to find the path of a string value within a JSON document, supporting both exact and wildcard matching.

---

## Overview

`JSON_SEARCH()` searches a JSON document for a string value and returns the path where it is found. Unlike `JSON_CONTAINS()`, which returns a boolean, `JSON_SEARCH()` returns the path expression as a string, enabling you to know exactly where a value lives within a complex JSON structure.

## Basic Syntax

```sql
JSON_SEARCH(json_doc, one_or_all, search_str[, escape_char[, path] ...])
```

- `json_doc` - the JSON document to search
- `one_or_all` - `'one'` returns the first match; `'all'` returns all matches as a JSON array
- `search_str` - the string value to find (supports `%` and `_` wildcards like `LIKE`)
- `escape_char` - optional escape character for wildcards (default `\`)
- `path` - optional path(s) to restrict the search scope (multiple paths can be specified)

Returns `NULL` if the value is not found or if any argument is `NULL`.

## Basic Examples

```sql
-- Find a value in a JSON array - returns path of first match
SELECT JSON_SEARCH('["mysql","sql","database"]', 'one', 'sql');
-- Result: "$[1]"

-- Find all occurrences
SELECT JSON_SEARCH('["sql","mysql","sql"]', 'all', 'sql');
-- Result: ["$[0]", "$[2]"]

-- Search in a nested object
SELECT JSON_SEARCH('{"a":"foo","b":"bar"}', 'one', 'foo');
-- Result: "$.a"

-- Search in a nested array inside an object
SELECT JSON_SEARCH('{"tags":["mysql","sql"]}', 'one', 'mysql', NULL, '$.tags');
-- Result: "$.tags[0]"

-- Value not found - returns NULL
SELECT JSON_SEARCH('["mysql","sql"]', 'one', 'postgres');
-- Result: NULL
```

## Wildcard Search

```sql
-- Find any value starting with 'my' (% wildcard)
SELECT JSON_SEARCH('{"a":"mysql","b":"myblog","c":"sql"}', 'all', 'my%');
-- Result: ["$.a", "$.b"]

-- Find any value containing 'sq'
SELECT JSON_SEARCH('{"x":"mysql","y":"nosql","z":"redis"}', 'all', '%sq%');
-- Result: ["$.x", "$.y"]

-- Single character wildcard (_)
SELECT JSON_SEARCH('["cat","car","cab"]', 'all', 'ca_');
-- Result: ["$[0]", "$[1]", "$[2]"]
```

## Finding Rows Where a JSON Field Contains a String

```sql
CREATE TABLE articles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200),
  tags JSON
);

INSERT INTO articles (title, tags) VALUES
('MySQL JSON Guide', '["mysql","database","json"]'),
('SQL Basics', '["sql","database"]'),
('Redis Tutorial', '["redis","caching"]');

-- Find articles that have "database" anywhere in their tags
SELECT id, title
FROM articles
WHERE JSON_SEARCH(tags, 'one', 'database') IS NOT NULL;
-- Returns articles 1 and 2

-- Find articles with tags starting with 'my'
SELECT id, title, JSON_SEARCH(tags, 'all', 'my%') AS matched_paths
FROM articles
WHERE JSON_SEARCH(tags, 'one', 'my%') IS NOT NULL;
```

## Extracting the Found Value's Path for Further Use

```sql
-- Find where "admin" appears in roles, then extract its index
SET @doc = '{"roles":["user","admin","moderator"]}';
SET @path = JSON_SEARCH(@doc, 'one', 'admin', NULL, '$.roles');

SELECT @path;                                        -- "$.roles[1]"
SELECT JSON_EXTRACT(@doc, JSON_UNQUOTE(@path));      -- "admin"
```

## JSON_SEARCH() vs JSON_CONTAINS()

```sql
-- JSON_CONTAINS: returns 1 or 0
SELECT JSON_CONTAINS('["mysql","sql"]', '"sql"');      -- 1

-- JSON_SEARCH: returns the path or NULL
SELECT JSON_SEARCH('["mysql","sql"]', 'one', 'sql');   -- "$[1]"
```

Choose `JSON_CONTAINS()` for WHERE clause filtering; use `JSON_SEARCH()` when you need to know the path location, especially in nested or complex documents.

## Practical Example: Finding a User's Role Position

```sql
CREATE TABLE team_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  roles JSON
);

INSERT INTO team_members (name, roles) VALUES
('Alice', '["developer","lead","architect"]'),
('Bob',   '["designer","lead"]'),
('Carol', '["developer","qa"]');

-- Find all team members who have "lead" in their roles
SELECT id, name, JSON_SEARCH(roles, 'one', 'lead') AS lead_path
FROM team_members
WHERE JSON_SEARCH(roles, 'one', 'lead') IS NOT NULL;
```

## Summary

`JSON_SEARCH()` locates string values within a JSON document and returns the path expression of the first or all matching locations. It supports `%` and `_` wildcards like `LIKE`. Use `'one'` for the first match and `'all'` for all matches as a JSON array of paths. For simple existence checks, `JSON_CONTAINS()` is more efficient; `JSON_SEARCH()` shines when you need the actual path for subsequent operations.
