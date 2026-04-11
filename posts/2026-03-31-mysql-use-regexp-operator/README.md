# How to Use the REGEXP Operator in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Regexp, Regular Expression, Pattern Matching, Query

Description: Learn how to use the REGEXP operator in MySQL to match column values against regular expression patterns for flexible text filtering.

---

## What Is the REGEXP Operator

MySQL's `REGEXP` operator (also written as `RLIKE`) tests whether a string matches a regular expression pattern. Unlike `LIKE`, which supports only `%` and `_` wildcards, `REGEXP` supports the full ICU regular expression syntax in MySQL 8.0.

```sql
SELECT column FROM table WHERE column REGEXP 'pattern';
```

## Basic Pattern Matching

Match rows where an email ends with a specific domain:

```sql
SELECT id, email
FROM users
WHERE email REGEXP '@gmail\\.com$';
```

Match rows where a phone number starts with a country code:

```sql
SELECT id, phone
FROM contacts
WHERE phone REGEXP '^\\+1';
```

## Common Regex Metacharacters

| Pattern | Meaning                        |
|---------|-------------------------------|
| `.`     | Any single character          |
| `^`     | Start of string               |
| `$`     | End of string                 |
| `*`     | Zero or more of previous      |
| `+`     | One or more of previous       |
| `?`     | Zero or one of previous       |
| `[abc]` | Any character in the set      |
| `[^abc]`| Any character not in the set  |
| `{n}`   | Exactly n repetitions         |
| `\|`   | Alternation (OR)              |

## Matching Alphanumeric Patterns

Find product codes that follow a specific format (two letters followed by four digits):

```sql
SELECT id, product_code
FROM products
WHERE product_code REGEXP '^[A-Z]{2}[0-9]{4}$';
```

## Case Sensitivity

By default, `REGEXP` in MySQL is case-insensitive for non-binary string columns. To force case-sensitive matching, use `REGEXP_LIKE` with the `'c'` match type:

```sql
-- Case-insensitive (default)
SELECT * FROM users WHERE username REGEXP '^admin';

-- Case-sensitive
SELECT * FROM users WHERE REGEXP_LIKE(username, '^Admin', 'c');
```

## Using NOT REGEXP

Exclude rows that match the pattern:

```sql
SELECT id, name
FROM products
WHERE name NOT REGEXP '[0-9]';
```

## REGEXP vs LIKE

| Feature          | LIKE   | REGEXP      |
|------------------|--------|-------------|
| Simple wildcards | Yes    | Yes         |
| Anchors (^, $)   | No     | Yes         |
| Character classes| No     | Yes         |
| Alternation      | No     | Yes         |
| Performance      | Faster | Slightly slower |

For simple prefix matches, `LIKE 'prefix%'` is faster because it can use indexes. `REGEXP` always performs a full scan, as does `LIKE '%suffix'` for suffix matches.

## Checking Multiple Patterns with Alternation

```sql
SELECT id, description
FROM logs
WHERE description REGEXP 'error|warning|critical';
```

## Summary

The `REGEXP` operator provides powerful pattern matching beyond what `LIKE` offers, supporting anchors, character classes, quantifiers, and alternation. It is best suited for complex text patterns where `LIKE` wildcards are insufficient. For simple prefix matches, prefer `LIKE 'prefix%'` to take advantage of index scans.
