# How to Implement Multi-Language Support in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Localization, Collation, Translation, Schema

Description: Learn how to design MySQL schemas that support multiple languages using translation tables, proper collations, and locale-aware queries.

---

## Choosing the Right Collation

Multi-language support starts with character encoding. Use `utf8mb4` for all tables and columns because it supports the full Unicode range including emoji and characters outside the Basic Multilingual Plane.

```sql
CREATE DATABASE myapp
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

`utf8mb4_unicode_ci` provides case-insensitive, accent-insensitive comparison that works across Latin, Cyrillic, Arabic, and many other scripts. For language-specific sorting rules (e.g., Swedish `ä` sorts after `z`), use locale-specific collations like `utf8mb4_sv_0900_ai_ci`.

## Translation Table Pattern

Store translatable content in a separate translations table rather than adding columns like `name_en`, `name_fr` per language.

```sql
CREATE TABLE products (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sku         VARCHAR(100) NOT NULL UNIQUE,
  price       DECIMAL(10,2) NOT NULL
);

CREATE TABLE languages (
  code VARCHAR(10) PRIMARY KEY,  -- 'en', 'fr', 'de'
  name VARCHAR(100) NOT NULL
);

CREATE TABLE product_translations (
  product_id  INT UNSIGNED NOT NULL,
  lang_code   VARCHAR(10)  NOT NULL,
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  PRIMARY KEY (product_id, lang_code),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (lang_code)  REFERENCES languages(code)
);
```

Adding a new language requires no schema change - insert rows into `product_translations`.

## Querying with a Fallback Language

When a translation is missing for the requested locale, fall back to a default language using `COALESCE`:

```sql
SELECT
  p.id,
  p.sku,
  COALESCE(t_req.name, t_def.name) AS name,
  COALESCE(t_req.description, t_def.description) AS description
FROM products p
LEFT JOIN product_translations t_req
  ON t_req.product_id = p.id AND t_req.lang_code = 'fr'
LEFT JOIN product_translations t_def
  ON t_def.product_id = p.id AND t_def.lang_code = 'en'
WHERE p.id = 42;
```

## Storing Locale-Specific Dates and Numbers

Store dates in UTC and format them in the application layer. For currency, store amounts as `DECIMAL` and handle locale-specific formatting outside the database.

```sql
ALTER TABLE orders
  ADD COLUMN locale VARCHAR(10) NOT NULL DEFAULT 'en_US';
```

## Full-Text Search Across Languages

MySQL full-text search is parser-dependent. For CJK languages (Chinese, Japanese, Korean) that have no word boundaries, enable the ngram parser:

```sql
CREATE TABLE product_translations (
  product_id INT UNSIGNED NOT NULL,
  lang_code  VARCHAR(10)  NOT NULL,
  name       VARCHAR(255) NOT NULL,
  description TEXT,
  PRIMARY KEY (product_id, lang_code),
  FULLTEXT INDEX ft_name_desc (name, description) WITH PARSER ngram
);
```

Search using the natural language or boolean mode:

```sql
SELECT product_id, name
FROM product_translations
WHERE lang_code = 'zh'
  AND MATCH(name, description) AGAINST ('笔记本' IN BOOLEAN MODE);
```

## Indexing Translation Lookups

Add a composite index to make per-language lookups fast:

```sql
CREATE INDEX idx_lang ON product_translations (lang_code, product_id);
```

## Summary

Implementing multi-language support in MySQL requires three things: using `utf8mb4` with an appropriate collation, using a translation table instead of per-language columns, and implementing fallback logic in your queries. This design scales to any number of languages and keeps the core entity table clean. For full-text search in CJK languages, configure the ngram parser at table creation time.
