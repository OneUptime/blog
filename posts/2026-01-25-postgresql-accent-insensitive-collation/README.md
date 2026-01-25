# How to Use Accent-Insensitive Collations in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Collation, Internationalization, Text Search, Unicode, ICU

Description: Learn how to perform accent-insensitive searches and sorting in PostgreSQL using ICU collations, unaccent extension, and custom comparison functions.

---

When building applications for international users, accent sensitivity becomes important. Users searching for "cafe" expect to find "cafe" as well. PostgreSQL provides several approaches for accent-insensitive operations, from built-in ICU collations to the unaccent extension.

## Understanding the Problem

By default, PostgreSQL treats accented characters as distinct.

```sql
-- Create a sample table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100)
);

INSERT INTO products (name) VALUES
    ('Cafe'),
    ('Cafe'),
    ('Naïve'),
    ('Naive'),
    ('Resume'),
    ('Resume'),
    ('Creme Brulee'),
    ('Creme Brulee');

-- Standard search misses accented variants
SELECT name FROM products WHERE name = 'Cafe';
-- Returns: Cafe (not Cafe)

SELECT name FROM products WHERE name LIKE 'Cafe%';
-- Returns: Cafe (not Cafe)
```

## Using ICU Collations (PostgreSQL 10+)

ICU (International Components for Unicode) collations support accent-insensitive comparisons.

```sql
-- Check available ICU collations
SELECT collname FROM pg_collation WHERE collprovider = 'i' LIMIT 10;

-- Create a collation that ignores accents
-- The @colStrength=primary means only base letters are compared
CREATE COLLATION IF NOT EXISTS ignore_accents (
    provider = icu,
    locale = 'und-u-ks-level1',  -- Level 1 = base letters only
    deterministic = false
);

-- Use the collation in queries
SELECT name FROM products
WHERE name COLLATE ignore_accents = 'cafe' COLLATE ignore_accents;
-- Returns both: Cafe, Cafe

-- Use in ORDER BY for accent-insensitive sorting
SELECT name FROM products
ORDER BY name COLLATE ignore_accents;

-- Define column with the collation
CREATE TABLE products_intl (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) COLLATE ignore_accents
);
```

## ICU Collation Parameters

ICU collations can be customized with various parameters.

```sql
-- Accent-insensitive, case-sensitive
CREATE COLLATION accent_insensitive_case_sensitive (
    provider = icu,
    locale = 'und-u-ks-level1-kc-true',
    deterministic = false
);

-- Accent-insensitive, case-insensitive
CREATE COLLATION accent_case_insensitive (
    provider = icu,
    locale = 'und-u-ks-level1',
    deterministic = false
);

-- French locale with accent insensitivity
CREATE COLLATION french_accent_insensitive (
    provider = icu,
    locale = 'fr-u-ks-level1',
    deterministic = false
);

-- Test different behaviors
SELECT 'Cafe' COLLATE ignore_accents = 'cafe' COLLATE ignore_accents AS matches;
-- Returns: true
```

## Using the unaccent Extension

The `unaccent` extension removes accents from text, useful for searching and indexing.

```sql
-- Enable the extension
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Remove accents from text
SELECT unaccent('Cafe Creme Brulee');
-- Returns: Cafe Creme Brulee

SELECT unaccent('Naïve Resume');
-- Returns: Naive Resume

-- Use in queries
SELECT name FROM products
WHERE unaccent(name) = unaccent('Cafe');
-- Returns both: Cafe, Cafe

-- Use with ILIKE for case and accent insensitive search
SELECT name FROM products
WHERE unaccent(lower(name)) LIKE unaccent(lower('%creme%'));
-- Returns: Creme Brulee, Creme Brulee
```

## Creating Accent-Insensitive Indexes

For performance, create indexes that support accent-insensitive searches.

```sql
-- Expression index using unaccent
CREATE INDEX idx_products_name_unaccent
ON products (unaccent(lower(name)));

-- Query can now use the index
EXPLAIN SELECT name FROM products
WHERE unaccent(lower(name)) = unaccent(lower('Cafe'));

-- For LIKE queries, use gin_trgm_ops
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_products_name_trgm
ON products USING gin (unaccent(lower(name)) gin_trgm_ops);

-- Pattern matching can use the index
EXPLAIN SELECT name FROM products
WHERE unaccent(lower(name)) LIKE '%creme%';
```

## Immutable unaccent Wrapper

The default `unaccent` function is STABLE, not IMMUTABLE, which limits index usage. Create an immutable wrapper.

```sql
-- Create immutable version of unaccent
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text AS $$
    SELECT unaccent('unaccent', $1)
$$ LANGUAGE SQL IMMUTABLE PARALLEL SAFE STRICT;

-- Now create indexes with the immutable function
CREATE INDEX idx_products_name_search
ON products (immutable_unaccent(lower(name)));

-- Use in queries
SELECT name FROM products
WHERE immutable_unaccent(lower(name)) = immutable_unaccent(lower('Cafe'));
```

## Combining with Full-Text Search

Integrate accent insensitivity with PostgreSQL full-text search.

```sql
-- Create a text search configuration with unaccent
CREATE TEXT SEARCH CONFIGURATION english_unaccent (COPY = english);

-- Add unaccent to the configuration
ALTER TEXT SEARCH CONFIGURATION english_unaccent
    ALTER MAPPING FOR hword, hword_part, word
    WITH unaccent, english_stem;

-- Create a table with full-text search column
CREATE TABLE articles (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200),
    content TEXT,
    search_vector TSVECTOR
);

-- Generate search vector with accent-insensitive config
CREATE OR REPLACE FUNCTION articles_search_trigger()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english_unaccent', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english_unaccent', COALESCE(NEW.content, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER articles_search_update
    BEFORE INSERT OR UPDATE ON articles
    FOR EACH ROW EXECUTE FUNCTION articles_search_trigger();

-- Create GIN index on search vector
CREATE INDEX idx_articles_search ON articles USING gin(search_vector);

-- Insert test data
INSERT INTO articles (title, content) VALUES
    ('Cafe Culture in Paris', 'The cafe scene is vibrant...'),
    ('Resume Writing Tips', 'A great resume starts with...');

-- Search finds accented and non-accented versions
SELECT title FROM articles
WHERE search_vector @@ to_tsquery('english_unaccent', 'cafe');
-- Returns articles about both "Cafe" and "Cafe"
```

## Custom unaccent Dictionary

Customize the unaccent rules for specific needs.

```sql
-- View default unaccent rules location
SHOW lc_messages;  -- Indicates locale directory

-- You can create custom rules in a file:
-- $SHAREDIR/tsearch_data/my_unaccent.rules

-- Content format (one rule per line):
-- a a
-- e e
-- oe o

-- Create configuration using custom rules
-- (After creating the rules file)
CREATE TEXT SEARCH DICTIONARY my_unaccent_dict (
    TEMPLATE = unaccent,
    RULES = 'my_unaccent'
);
```

## Handling Specific Languages

Different languages have different accent rules.

```sql
-- German: treat umlaut vowels specially
-- a often sorted as ae
CREATE COLLATION german_phonebook (
    provider = icu,
    locale = 'de-u-co-phonebk'  -- German phonebook ordering
);

-- Spanish: n is a separate letter
CREATE COLLATION spanish_traditional (
    provider = icu,
    locale = 'es-u-co-trad'  -- Traditional Spanish ordering
);

-- Swedish: a, a, o come after z
CREATE COLLATION swedish_standard (
    provider = icu,
    locale = 'sv'
);

-- Compare behavior
SELECT name,
       name COLLATE "C" AS c_order,
       name COLLATE german_phonebook AS de_order
FROM (VALUES ('Bar'), ('Bar'), ('Baz')) AS t(name)
ORDER BY name COLLATE german_phonebook;
```

## Search Function Pattern

Create a reusable search function for accent-insensitive lookups.

```sql
-- Generic accent and case insensitive search function
CREATE OR REPLACE FUNCTION search_products(search_term TEXT)
RETURNS TABLE(id INTEGER, name VARCHAR, relevance REAL) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.name,
        similarity(
            immutable_unaccent(lower(p.name)),
            immutable_unaccent(lower(search_term))
        ) AS relevance
    FROM products p
    WHERE immutable_unaccent(lower(p.name)) % immutable_unaccent(lower(search_term))
    ORDER BY relevance DESC;
END;
$$ LANGUAGE plpgsql;

-- Usage
SELECT * FROM search_products('creme');
-- Returns both Creme Brulee and Creme Brulee
```

## Migration Strategy

Add accent-insensitive support to existing applications.

```sql
-- Step 1: Add extension
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Step 2: Create immutable function
CREATE OR REPLACE FUNCTION normalize_text(text)
RETURNS text AS $$
    SELECT lower(unaccent('unaccent', $1))
$$ LANGUAGE SQL IMMUTABLE PARALLEL SAFE STRICT;

-- Step 3: Add normalized column for searchable tables
ALTER TABLE products ADD COLUMN name_normalized VARCHAR(100);

-- Step 4: Populate normalized column
UPDATE products SET name_normalized = normalize_text(name);

-- Step 5: Add trigger to maintain normalized column
CREATE OR REPLACE FUNCTION maintain_normalized_name()
RETURNS TRIGGER AS $$
BEGIN
    NEW.name_normalized := normalize_text(NEW.name);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_normalize
    BEFORE INSERT OR UPDATE OF name ON products
    FOR EACH ROW EXECUTE FUNCTION maintain_normalized_name();

-- Step 6: Create index on normalized column
CREATE INDEX idx_products_normalized ON products (name_normalized);

-- Step 7: Update application queries
-- Before: WHERE name = 'search_term'
-- After: WHERE name_normalized = normalize_text('search_term')
```

## Performance Comparison

Evaluate different approaches for your workload.

```sql
-- Test setup
CREATE TABLE perf_test AS
SELECT id, md5(random()::text) || chr(224 + (random()*5)::int) AS name
FROM generate_series(1, 100000) id;

-- Test 1: Inline unaccent (slow, no index)
EXPLAIN ANALYZE
SELECT * FROM perf_test WHERE unaccent(lower(name)) = unaccent(lower('test'));

-- Test 2: Expression index
CREATE INDEX idx_perf_unaccent ON perf_test (immutable_unaccent(lower(name)));
EXPLAIN ANALYZE
SELECT * FROM perf_test WHERE immutable_unaccent(lower(name)) = immutable_unaccent(lower('test'));

-- Test 3: ICU collation (if column defined with collation)
-- Generally fastest for exact matches
```

Accent-insensitive search improves user experience for international applications. Choose ICU collations for built-in support, or the unaccent extension for more control. Always create appropriate indexes to maintain query performance as your data grows.
