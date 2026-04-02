# How to Use Accent-Insensitive Collation in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Collation, Accent, Unicode, String Comparison

Description: Learn how to use accent-insensitive collations in MySQL so that accented characters like é, è, and ê are treated as equal during comparisons.

---

## What Is Accent Insensitivity?

Accent-insensitive (AI) collations treat accented and unaccented versions of a character as equal. For example, under an accent-insensitive collation, `e`, `é`, `è`, and `ê` all compare as equal. This is valuable for search features where users expect to find "café" when searching for "cafe", and vice versa.

## Identifying Accent-Insensitive Collations

Collations with the `_ai` suffix are accent-insensitive:

```sql
SHOW COLLATION WHERE Charset = 'utf8mb4' AND Collation LIKE '%_ai%';
```

Common choices for `utf8mb4`:

| Collation | Case | Accent | Notes |
|-----------|------|--------|-------|
| `utf8mb4_0900_ai_ci` | Insensitive | Insensitive | Default in MySQL 8.0+ |
| `utf8mb4_0900_as_ci` | Insensitive | Sensitive | Accent-sensitive, case-insensitive |
| `utf8mb4_0900_as_cs` | Sensitive | Sensitive | Both sensitive |

## Setting Accent-Insensitive Collation on a Column

```sql
CREATE TABLE places (
    id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL
);
```

Now insert two rows that differ only by accent:

```sql
INSERT INTO places (name) VALUES ('Cafe'), ('Café');
```

Query without accents and find the accented version:

```sql
SELECT * FROM places WHERE name = 'Cafe';
-- Returns both 'Cafe' and 'Café'
```

## Unique Constraints and Accent Insensitivity

Be careful with `UNIQUE` constraints under AI collations - accented variants are treated as duplicates:

```sql
CREATE TABLE brands (
    id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
    UNIQUE KEY uq_name (name)
);

INSERT INTO brands (name) VALUES ('Naïve');
INSERT INTO brands (name) VALUES ('Naive');  -- ERROR: Duplicate entry
```

If your application needs to store both `Naïve` and `Naive` as distinct records, use an accent-sensitive collation such as `utf8mb4_0900_as_cs`.

## Using COLLATE Inline for Accent-Insensitive Search

Apply AI collation at query time without changing the schema:

```sql
SELECT id, name
FROM places
WHERE name COLLATE utf8mb4_0900_ai_ci = 'resume';
-- Matches 'resume', 'résumé', 'Resume', 'Résumé', etc.
```

## Performance Consideration

An inline `COLLATE` override that differs from the column's native collation will prevent the optimizer from using an existing index on that column. For frequently searched columns, define the column with the desired collation and create the index accordingly:

```sql
ALTER TABLE places
    MODIFY COLUMN name VARCHAR(200)
        CHARACTER SET utf8mb4
        COLLATE utf8mb4_0900_ai_ci;

-- The existing index on 'name' now supports accent-insensitive lookups efficiently
```

## Summary

Accent-insensitive collations like `utf8mb4_0900_ai_ci` allow MySQL to match accented and unaccented characters transparently. They are ideal for user-facing search features. Apply them at the column level for consistent behavior and index efficiency, and be aware that they also make accented variants count as duplicates under `UNIQUE` constraints.
