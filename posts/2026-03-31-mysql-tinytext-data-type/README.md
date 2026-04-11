# How to Use TINYTEXT Data Type in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Database, Data Type, Text, Storage

Description: Learn how the TINYTEXT data type works in MySQL, its 255-byte limit, off-page storage behavior, and when to choose it over VARCHAR.

---

## What Is the TINYTEXT Data Type

`TINYTEXT` is a text storage type in MySQL that holds up to 255 bytes (not characters). It is the smallest member of the TEXT family: `TINYTEXT`, `TEXT`, `MEDIUMTEXT`, and `LONGTEXT`.

Because `TINYTEXT` stores data outside the main row (off-page), it does not consume the 65,535-byte row-size limit the way `VARCHAR` does.

## Declaring a TINYTEXT Column

```sql
CREATE TABLE product_hints (
    id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    hint TINYTEXT
);
```

## Inserting and Querying TINYTEXT

```sql
INSERT INTO product_hints (hint) VALUES ('Add this item to your cart for a 10% discount.');
SELECT id, hint, LENGTH(hint) AS hint_bytes FROM product_hints;
```

## Byte Limit vs Character Limit

The 255-byte limit is measured in bytes, not characters. With `utf8mb4` (up to 4 bytes per character), a `TINYTEXT` column may hold as few as 63 characters for four-byte characters.

```sql
-- This works: 63 four-byte characters fit inside 255 bytes
INSERT INTO product_hints (hint) VALUES (REPEAT(_utf8mb4 0xF09F8E89, 63));

-- This fails: 64 four-byte characters = 256 bytes > 255
-- INSERT INTO product_hints (hint) VALUES (REPEAT(_utf8mb4 0xF09F8E89, 64));
```

## TINYTEXT vs VARCHAR(255)

| Feature | TINYTEXT | VARCHAR(255) |
|---|---|---|
| Max size | 255 bytes | 255 characters |
| Row-size contribution | Off-page (minimal) | In-row |
| Default value | Expression only (since 8.0.13) | Allowed |
| Full-text index | Supported | Supported |
| Prefix index required | Yes | No (for short lengths) |

Because `TINYTEXT` only supports expression defaults (e.g., `DEFAULT ('value')` since MySQL 8.0.13) and requires a prefix index, most developers prefer `VARCHAR(255)` unless the off-page storage characteristic is specifically needed.

## Indexing TINYTEXT

Direct full-column indexes are not supported on text types. Use a prefix:

```sql
ALTER TABLE product_hints ADD INDEX idx_hint (hint(50));
```

## Full-Text Search

`TINYTEXT` columns can participate in full-text indexes:

```sql
CREATE TABLE articles (
    id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    summary TINYTEXT,
    FULLTEXT ft_summary (summary)
);

SELECT id, summary FROM articles
WHERE MATCH(summary) AGAINST ('discount' IN BOOLEAN MODE);
```

## Practical Use Case: Short Descriptions

`TINYTEXT` suits brief, optional descriptions where a default value is not needed:

```sql
CREATE TABLE tags (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(50) NOT NULL,
    description TINYTEXT,
    UNIQUE KEY uq_name (name)
);
```

## Summary

`TINYTEXT` stores up to 255 bytes off-page and is useful when you need a short text field without contributing to the row-size limit. However, because it only supports expression defaults (since MySQL 8.0.13) and requires prefix indexes, `VARCHAR(255)` is usually the more convenient choice for short strings. Use `TINYTEXT` when you specifically need TEXT semantics or are already working with a TEXT-family schema.
