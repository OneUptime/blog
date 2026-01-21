# How to Implement Full-Text Search in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Full-Text Search, tsvector, tsquery, Search, Text Analysis

Description: A comprehensive guide to implementing full-text search in PostgreSQL using tsvector, tsquery, and GIN indexes, covering configuration, ranking, highlighting, and advanced search features.

---

PostgreSQL provides powerful built-in full-text search capabilities that can replace dedicated search engines for many use cases. This guide covers everything from basic setup to advanced features like ranking and phrase search.

## Prerequisites

- PostgreSQL 9.6+ (improvements in 12+)
- Basic understanding of text search concepts
- Sample data to search

## Full-Text Search Concepts

### tsvector

Preprocessed document representation:
- Normalized words (lexemes)
- Position information
- Suitable for indexing

```sql
SELECT to_tsvector('english', 'The quick brown foxes jumped over lazy dogs');
-- Result: 'brown':3 'dog':9 'fox':4 'jump':5 'lazi':8 'quick':2
```

### tsquery

Search query representation:
- Operators: & (AND), | (OR), ! (NOT), <-> (FOLLOWED BY)
- Normalized terms

```sql
SELECT to_tsquery('english', 'quick & foxes');
-- Result: 'quick' & 'fox'

SELECT to_tsquery('english', 'quick | slow');
-- Result: 'quick' | 'slow'
```

## Basic Full-Text Search

### Simple Search

```sql
-- Create table
CREATE TABLE articles (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    body TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert sample data
INSERT INTO articles (title, body) VALUES
('PostgreSQL Tutorial', 'Learn how to use PostgreSQL for database management'),
('Full-Text Search Guide', 'Implementing search functionality in PostgreSQL databases'),
('Database Optimization', 'Tips for optimizing PostgreSQL query performance');

-- Basic search
SELECT title, body
FROM articles
WHERE to_tsvector('english', title || ' ' || body) @@ to_tsquery('english', 'postgresql');
```

### Add tsvector Column

```sql
-- Add search column
ALTER TABLE articles ADD COLUMN search_vector tsvector;

-- Populate search vector
UPDATE articles SET search_vector =
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(body, '')), 'B');

-- Create index
CREATE INDEX idx_articles_search ON articles USING GIN(search_vector);

-- Search using index
SELECT title, body
FROM articles
WHERE search_vector @@ to_tsquery('english', 'postgresql');
```

### Auto-Update with Trigger

```sql
-- Create trigger function
CREATE OR REPLACE FUNCTION articles_search_trigger()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(NEW.body, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER articles_search_update
    BEFORE INSERT OR UPDATE ON articles
    FOR EACH ROW EXECUTE FUNCTION articles_search_trigger();
```

## Search Query Syntax

### Query Operators

```sql
-- AND (both terms required)
SELECT * FROM articles
WHERE search_vector @@ to_tsquery('english', 'postgresql & database');

-- OR (either term)
SELECT * FROM articles
WHERE search_vector @@ to_tsquery('english', 'postgresql | mysql');

-- NOT (exclude term)
SELECT * FROM articles
WHERE search_vector @@ to_tsquery('english', 'database & !mysql');

-- Phrase search (words in sequence)
SELECT * FROM articles
WHERE search_vector @@ to_tsquery('english', 'full <-> text <-> search');

-- Words within distance
SELECT * FROM articles
WHERE search_vector @@ to_tsquery('english', 'database <2> optimization');
```

### User Input Handling

```sql
-- Parse user input safely
SELECT * FROM articles
WHERE search_vector @@ plainto_tsquery('english', 'postgresql database');

-- Web search syntax (Google-like)
SELECT * FROM articles
WHERE search_vector @@ websearch_to_tsquery('english', 'postgresql -mysql "full text"');

-- Phrase to tsquery
SELECT * FROM articles
WHERE search_vector @@ phraseto_tsquery('english', 'database optimization');
```

## Ranking Results

### ts_rank

```sql
-- Rank by relevance
SELECT
    title,
    ts_rank(search_vector, query) AS rank
FROM articles, to_tsquery('english', 'postgresql') query
WHERE search_vector @@ query
ORDER BY rank DESC;
```

### ts_rank_cd (Cover Density)

```sql
-- Cover density ranking (considers proximity)
SELECT
    title,
    ts_rank_cd(search_vector, query) AS rank
FROM articles, to_tsquery('english', 'full & text & search') query
WHERE search_vector @@ query
ORDER BY rank DESC;
```

### Rank with Weights

```sql
-- Custom weight array {D, C, B, A}
SELECT
    title,
    ts_rank(search_vector, query, 1) AS rank_log_length,
    ts_rank(search_vector, query, 2) AS rank_divide_length,
    ts_rank('{0.1, 0.2, 0.4, 1.0}', search_vector, query) AS rank_custom_weights
FROM articles, to_tsquery('english', 'postgresql') query
WHERE search_vector @@ query
ORDER BY rank_custom_weights DESC;
```

## Highlighting Results

### ts_headline

```sql
-- Highlight matching terms
SELECT
    title,
    ts_headline('english', body, query,
        'StartSel=<b>, StopSel=</b>, MaxWords=35, MinWords=15, MaxFragments=3'
    ) AS highlighted
FROM articles, to_tsquery('english', 'postgresql & database') query
WHERE search_vector @@ query;
```

### Custom Highlighting

```sql
-- HTML highlighting
SELECT
    ts_headline('english', body, query,
        'StartSel=<mark class="highlight">, StopSel=</mark>, MaxFragments=2, FragmentDelimiter= ... '
    ) AS snippet
FROM articles, to_tsquery('english', 'search') query
WHERE search_vector @@ query;
```

## Text Search Configuration

### Available Configurations

```sql
-- List configurations
SELECT cfgname FROM pg_ts_config;

-- Show current default
SHOW default_text_search_config;

-- Set default
SET default_text_search_config = 'english';
```

### Test Configuration

```sql
-- See how text is processed
SELECT * FROM ts_debug('english', 'The quick brown fox jumps over the lazy dog');

-- Test specific token types
SELECT alias, description, token
FROM ts_debug('english', 'PostgreSQL is a database system')
WHERE alias IN ('asciiword', 'word');
```

### Custom Dictionary

```sql
-- Create synonym dictionary
CREATE TEXT SEARCH DICTIONARY syn_dict (
    TEMPLATE = synonym,
    SYNONYMS = my_synonyms  -- file: /usr/share/postgresql/16/tsearch_data/my_synonyms.syn
);

-- Synonym file format (my_synonyms.syn):
-- postgres pgsql pg
-- database db
-- search find

-- Create configuration
CREATE TEXT SEARCH CONFIGURATION my_config (COPY = english);
ALTER TEXT SEARCH CONFIGURATION my_config
    ALTER MAPPING FOR asciiword WITH syn_dict, english_stem;
```

## Advanced Features

### Prefix Search (Autocomplete)

```sql
-- Prefix matching
SELECT * FROM articles
WHERE search_vector @@ to_tsquery('english', 'post:*');

-- Function for autocomplete
CREATE OR REPLACE FUNCTION search_autocomplete(search_term TEXT)
RETURNS TABLE(title VARCHAR, rank REAL) AS $$
BEGIN
    RETURN QUERY
    SELECT a.title, ts_rank(a.search_vector, query) AS rank
    FROM articles a, to_tsquery('english', search_term || ':*') query
    WHERE a.search_vector @@ query
    ORDER BY rank DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;
```

### Fuzzy Search with Trigrams

```sql
-- Enable trigram extension
CREATE EXTENSION pg_trgm;

-- Create trigram index
CREATE INDEX idx_articles_title_trgm ON articles USING GIN(title gin_trgm_ops);

-- Similarity search
SELECT title, similarity(title, 'postgre') AS sim
FROM articles
WHERE title % 'postgre'
ORDER BY sim DESC;

-- Combined full-text and fuzzy
SELECT title,
    ts_rank(search_vector, query) AS fts_rank,
    similarity(title, 'postgresql tutoral') AS fuzzy_sim
FROM articles, to_tsquery('english', 'postgresql') query
WHERE search_vector @@ query
   OR title % 'postgresql tutoral'
ORDER BY fts_rank DESC, fuzzy_sim DESC;
```

### Phrase Search

```sql
-- Exact phrase
SELECT * FROM articles
WHERE search_vector @@ phraseto_tsquery('english', 'full text search');

-- Phrase with distance
SELECT * FROM articles
WHERE search_vector @@ to_tsquery('english', 'database <-> management');

-- Within N words
SELECT * FROM articles
WHERE search_vector @@ to_tsquery('english', 'database <3> optimization');
```

### Multi-Language Support

```sql
-- Detect and store language
ALTER TABLE articles ADD COLUMN lang VARCHAR(20) DEFAULT 'english';

-- Language-aware search
SELECT * FROM articles
WHERE to_tsvector(lang::regconfig, body) @@ to_tsquery(lang::regconfig, 'search');

-- Multi-language index
CREATE INDEX idx_articles_multilang ON articles
USING GIN(to_tsvector('simple', body));
```

## Complete Search Implementation

```sql
-- Create articles table with full-text search
CREATE TABLE articles (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    author VARCHAR(100),
    tags TEXT[],
    published_at TIMESTAMP DEFAULT NOW(),
    search_vector tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(body, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(author, '')), 'C') ||
        setweight(to_tsvector('english', coalesce(array_to_string(tags, ' '), '')), 'D')
    ) STORED
);

-- Create index
CREATE INDEX idx_articles_search ON articles USING GIN(search_vector);

-- Search function
CREATE OR REPLACE FUNCTION search_articles(
    search_query TEXT,
    result_limit INT DEFAULT 20,
    result_offset INT DEFAULT 0
)
RETURNS TABLE(
    id INT,
    title VARCHAR,
    snippet TEXT,
    rank REAL,
    published_at TIMESTAMP
) AS $$
DECLARE
    query tsquery;
BEGIN
    query := websearch_to_tsquery('english', search_query);

    RETURN QUERY
    SELECT
        a.id,
        a.title,
        ts_headline('english', a.body, query,
            'MaxWords=50, MinWords=25, MaxFragments=2') AS snippet,
        ts_rank(a.search_vector, query) AS rank,
        a.published_at
    FROM articles a
    WHERE a.search_vector @@ query
    ORDER BY rank DESC
    LIMIT result_limit
    OFFSET result_offset;
END;
$$ LANGUAGE plpgsql;

-- Usage
SELECT * FROM search_articles('postgresql database optimization');
```

## Performance Optimization

### GIN vs GiST Indexes

```sql
-- GIN (recommended for most cases)
CREATE INDEX idx_search_gin ON articles USING GIN(search_vector);

-- GiST (faster updates, slower queries)
CREATE INDEX idx_search_gist ON articles USING GiST(search_vector);
```

| | GIN | GiST |
|---|-----|------|
| Query Speed | Faster | Slower |
| Update Speed | Slower | Faster |
| Index Size | Larger | Smaller |
| Best For | Read-heavy | Write-heavy |

### Optimization Tips

```sql
-- Use generated column (PostgreSQL 12+)
ALTER TABLE articles ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (to_tsvector('english', title || ' ' || body)) STORED;

-- Partial index for recent content
CREATE INDEX idx_recent_search ON articles USING GIN(search_vector)
    WHERE published_at > '2025-01-01';

-- Limit result set
SELECT * FROM articles
WHERE search_vector @@ query
ORDER BY ts_rank(search_vector, query) DESC
LIMIT 20;
```

## Conclusion

PostgreSQL full-text search provides powerful capabilities:

1. **Use tsvector columns** with triggers or generated columns
2. **Create GIN indexes** for fast searching
3. **Implement ranking** for relevant results
4. **Add highlighting** for better UX
5. **Consider trigrams** for fuzzy matching

For many applications, PostgreSQL's built-in search eliminates the need for external search engines while keeping data consistent and queries simple.
