# How to Use TEXT Data Type in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Database, Data Type, Text, Storage

Description: Learn how the TEXT data type works in MySQL, its 65,535-byte capacity, indexing rules, and when to use it instead of VARCHAR or MEDIUMTEXT.

---

## What Is the TEXT Data Type

`TEXT` is a variable-length string type in MySQL capable of storing up to 65,535 bytes (64 KB). It is part of the TEXT family alongside `TINYTEXT` (255 bytes), `MEDIUMTEXT` (16 MB), and `LONGTEXT` (4 GB).

Unlike `VARCHAR`, `TEXT` columns store their data off-page, meaning the data is not counted toward the 65,535-byte per-row limit.

## Declaring a TEXT Column

```sql
CREATE TABLE blog_posts (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title      VARCHAR(200) NOT NULL,
    body       TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Inserting and Reading TEXT

```sql
INSERT INTO blog_posts (title, body)
VALUES (
    'Getting Started with MySQL',
    'MySQL is an open-source relational database management system...'
);

SELECT id, title, LEFT(body, 100) AS preview FROM blog_posts;
```

## Character Limit vs Byte Limit

With `utf8mb4`, the 65,535-byte limit translates to at most 16,383 four-byte characters. ASCII text can use all 65,535 bytes.

```sql
SELECT CHARACTER_MAXIMUM_LENGTH, CHARACTER_OCTET_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'mydb'
  AND TABLE_NAME = 'blog_posts'
  AND COLUMN_NAME = 'body';
```

## Indexing TEXT Columns

Full-column indexes are not allowed on `TEXT`. Use a prefix index instead:

```sql
ALTER TABLE blog_posts ADD INDEX idx_body_prefix (body(100));
```

For keyword searches, a full-text index is more appropriate:

```sql
ALTER TABLE blog_posts ADD FULLTEXT INDEX ft_body (body);

SELECT id, title
FROM blog_posts
WHERE MATCH(body) AGAINST ('MySQL open-source' IN NATURAL LANGUAGE MODE);
```

## Limitations Compared to VARCHAR

- `TEXT` columns cannot have a `DEFAULT` value in MySQL versions before 8.0.13. From MySQL 8.0.13 onward, `TEXT` and `BLOB` columns support default values.
- Sorting and grouping on `TEXT` columns only considers the first `max_sort_length` bytes (default 1024).
- Sorting on `TEXT` columns uses a temporary table on disk.

```sql
-- Sorting a TEXT column is allowed but may be slow on large tables
SELECT id, title FROM blog_posts ORDER BY body;
```

## Storing HTML and Markdown

`TEXT` is commonly used for storing rendered HTML or raw Markdown content:

```sql
CREATE TABLE pages (
    id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    slug     VARCHAR(100) NOT NULL UNIQUE,
    content  TEXT NOT NULL
);

INSERT INTO pages (slug, content)
VALUES ('about', '## About Us\n\nWe build open-source monitoring tools...');
```

## Choosing the Right TEXT Type

| Type | Max Size | Typical Use |
|---|---|---|
| TINYTEXT | 255 bytes | Short descriptions, hints |
| TEXT | 65 KB | Articles, blog posts, comments |
| MEDIUMTEXT | 16 MB | Long documents, logs |
| LONGTEXT | 4 GB | Very large text, serialized data |

## Summary

`TEXT` stores up to 65 KB of character data off-page and is ideal for article bodies, comments, and other mid-sized text fields. It cannot carry a full-column index, so plan your indexing strategy using prefix or full-text indexes. Note that default values for `TEXT` columns are supported from MySQL 8.0.13 onward. For strings under a few hundred characters, `VARCHAR` is usually more convenient.
