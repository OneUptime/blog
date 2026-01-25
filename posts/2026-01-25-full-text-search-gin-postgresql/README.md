# How to Build Full-Text Search with GIN Indexes in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Full-Text Search, GIN Index, Search, Database, Performance

Description: Learn how to implement fast full-text search in PostgreSQL using GIN indexes and tsvector columns. This guide covers search configuration, ranking, highlighting, and performance optimization with practical examples.

---

> Building search functionality often leads teams to add Elasticsearch or Algolia. But if your data is already in PostgreSQL, you might not need another system. PostgreSQL full-text search with GIN indexes can handle millions of documents with sub-second query times. This guide shows you how to build production-ready search without leaving your database.

---

## Full-Text Search Basics

PostgreSQL full-text search works with two special types:

- **tsvector**: A processed document as a sorted list of lexemes (normalized words)
- **tsquery**: A search query with operators

```sql
-- Convert text to tsvector
SELECT to_tsvector('english', 'The quick brown fox jumps over the lazy dog');
-- Result: 'brown':3 'dog':9 'fox':4 'jump':5 'lazi':8 'quick':2

-- Create a search query
SELECT to_tsquery('english', 'quick & fox');
-- Result: 'quick' & 'fox'

-- Match them together
SELECT to_tsvector('english', 'The quick brown fox') @@ to_tsquery('english', 'quick & fox');
-- Result: true
```

---

## Setting Up Full-Text Search

### Step 1: Create the Table with Search Column

```sql
-- Create articles table with search support
CREATE TABLE articles (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    author VARCHAR(100),
    published_at TIMESTAMP DEFAULT NOW(),

    -- Pre-computed search vector for fast queries
    search_vector tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(body, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(author, '')), 'C')
    ) STORED
);

-- The weights (A, B, C, D) affect ranking:
-- A = highest importance (title matches rank higher)
-- B = second highest (body content)
-- C = third (author name)
-- D = lowest (default)
```

### Step 2: Create the GIN Index

```sql
-- GIN index for fast full-text search
CREATE INDEX idx_articles_search ON articles USING GIN (search_vector);

-- This index structure:
-- - Stores each lexeme with list of document IDs
-- - Enables fast lookups: "find all documents containing 'postgresql'"
-- - Updates automatically when search_vector changes
```

### Step 3: Insert Sample Data

```sql
INSERT INTO articles (title, body, author) VALUES
('Getting Started with PostgreSQL',
 'PostgreSQL is a powerful open-source relational database. It supports advanced features like JSON, full-text search, and geographic queries.',
 'Jane Developer'),

('PostgreSQL Performance Tuning Guide',
 'Learn how to optimize your PostgreSQL database for maximum performance. Topics include indexing, query optimization, and configuration tuning.',
 'John DBA'),

('Building REST APIs with Node.js',
 'This tutorial covers building RESTful APIs using Node.js and Express. We will connect to a PostgreSQL database using the pg library.',
 'Jane Developer');
```

---

## Basic Search Queries

### Simple Search

```sql
-- Search for articles containing "postgresql"
SELECT id, title, author
FROM articles
WHERE search_vector @@ to_tsquery('english', 'postgresql');

-- Search for multiple terms (AND)
SELECT id, title
FROM articles
WHERE search_vector @@ to_tsquery('english', 'postgresql & performance');

-- Search for any term (OR)
SELECT id, title
FROM articles
WHERE search_vector @@ to_tsquery('english', 'nodejs | express');

-- Phrase search (words adjacent)
SELECT id, title
FROM articles
WHERE search_vector @@ phraseto_tsquery('english', 'full text search');
```

### Handling User Input

```sql
-- plainto_tsquery: Converts plain text to query (ANDs all words)
SELECT id, title
FROM articles
WHERE search_vector @@ plainto_tsquery('english', 'postgresql database');
-- Equivalent to: 'postgresql' & 'database'

-- websearch_to_tsquery: Google-style syntax (PostgreSQL 11+)
SELECT id, title
FROM articles
WHERE search_vector @@ websearch_to_tsquery('english', 'postgresql -mysql "full text"');
-- Supports: quotes for phrases, - for exclusion, OR for alternatives
```

---

## Ranking Search Results

### Basic Ranking

```sql
-- ts_rank: Scores based on frequency and position
SELECT
    id,
    title,
    ts_rank(search_vector, query) AS rank
FROM articles, to_tsquery('english', 'postgresql') AS query
WHERE search_vector @@ query
ORDER BY rank DESC;

-- ts_rank_cd: Cover density ranking (rewards proximity)
SELECT
    id,
    title,
    ts_rank_cd(search_vector, query) AS rank
FROM articles, to_tsquery('english', 'postgresql & database') AS query
WHERE search_vector @@ query
ORDER BY rank DESC;
```

### Weighted Ranking

```sql
-- Customize weight importance: {D, C, B, A}
SELECT
    id,
    title,
    ts_rank(
        '{0.1, 0.2, 0.4, 1.0}',  -- D=0.1, C=0.2, B=0.4, A=1.0
        search_vector,
        query
    ) AS rank
FROM articles, to_tsquery('english', 'postgresql') AS query
WHERE search_vector @@ query
ORDER BY rank DESC;
```

### Combined Ranking with Recency

```sql
-- Boost recent articles in search results
SELECT
    id,
    title,
    published_at,
    (
        ts_rank(search_vector, query) *
        (1 + 1.0 / (EXTRACT(EPOCH FROM NOW() - published_at) / 86400 + 1))
    ) AS combined_rank
FROM articles, to_tsquery('english', 'postgresql') AS query
WHERE search_vector @@ query
ORDER BY combined_rank DESC
LIMIT 10;
```

---

## Search Result Highlighting

### Basic Highlighting

```sql
-- ts_headline: Highlights matching terms
SELECT
    id,
    title,
    ts_headline(
        'english',
        body,
        to_tsquery('english', 'postgresql'),
        'StartSel=<b>, StopSel=</b>, MaxWords=35, MinWords=15'
    ) AS snippet
FROM articles
WHERE search_vector @@ to_tsquery('english', 'postgresql');
```

### Custom Highlighting Options

```sql
-- Full control over highlighting
SELECT
    id,
    ts_headline(
        'english',
        title,
        query,
        'StartSel=<mark>, StopSel=</mark>, HighlightAll=true'
    ) AS highlighted_title,
    ts_headline(
        'english',
        body,
        query,
        'StartSel=<mark>, StopSel=</mark>, MaxFragments=2, FragmentDelimiter=" ... "'
    ) AS snippets
FROM articles, to_tsquery('english', 'postgresql & performance') AS query
WHERE search_vector @@ query;

-- Options:
-- MaxWords: Maximum words in headline
-- MinWords: Minimum words in headline
-- MaxFragments: Number of text fragments
-- FragmentDelimiter: String between fragments
-- HighlightAll: Highlight all occurrences
```

---

## Advanced Search Features

### Prefix Matching (Autocomplete)

```sql
-- Search for words starting with "post"
SELECT id, title
FROM articles
WHERE search_vector @@ to_tsquery('english', 'post:*');

-- Build autocomplete function
CREATE OR REPLACE FUNCTION search_autocomplete(prefix TEXT)
RETURNS TABLE(suggestion TEXT, article_count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT word, ndoc
    FROM ts_stat('SELECT search_vector FROM articles')
    WHERE word LIKE prefix || '%'
    ORDER BY ndoc DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Usage
SELECT * FROM search_autocomplete('post');
```

### Fuzzy Matching with Trigrams

```sql
-- Enable trigram extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create trigram index on title
CREATE INDEX idx_articles_title_trgm ON articles USING GIN (title gin_trgm_ops);

-- Fuzzy search combining full-text and trigram
SELECT
    id,
    title,
    similarity(title, 'postgrsql') AS sim_score,  -- Note the typo
    ts_rank(search_vector, to_tsquery('english', 'database')) AS fts_rank
FROM articles
WHERE
    title % 'postgrsql'  -- Trigram similarity
    OR search_vector @@ to_tsquery('english', 'database')
ORDER BY GREATEST(
    similarity(title, 'postgrsql'),
    ts_rank(search_vector, to_tsquery('english', 'database'))
) DESC;
```

### Searching Multiple Languages

```sql
-- Create multi-language search column
ALTER TABLE articles ADD COLUMN language VARCHAR(20) DEFAULT 'english';

-- Dynamic language search function
CREATE OR REPLACE FUNCTION search_articles(
    search_text TEXT,
    lang TEXT DEFAULT 'english'
)
RETURNS TABLE(id INT, title VARCHAR, rank REAL) AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id,
        a.title,
        ts_rank(
            to_tsvector(lang::regconfig, a.title || ' ' || a.body),
            plainto_tsquery(lang::regconfig, search_text)
        )
    FROM articles a
    WHERE to_tsvector(lang::regconfig, a.title || ' ' || a.body)
          @@ plainto_tsquery(lang::regconfig, search_text)
    ORDER BY 3 DESC;
END;
$$ LANGUAGE plpgsql;
```

---

## Performance Optimization

### Check Query Performance

```sql
-- Analyze search query execution
EXPLAIN ANALYZE
SELECT id, title
FROM articles
WHERE search_vector @@ to_tsquery('english', 'postgresql & database');

-- Good: Bitmap Index Scan on idx_articles_search
-- Bad: Seq Scan (index not being used)
```

### Index Maintenance

```sql
-- Check GIN index size
SELECT
    indexrelname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE indexrelname = 'idx_articles_search';

-- Rebuild index if fragmented
REINDEX INDEX CONCURRENTLY idx_articles_search;

-- Update statistics for better query planning
ANALYZE articles;
```

### GIN Index Tuning

```sql
-- For write-heavy workloads, use fastupdate
CREATE INDEX idx_articles_search ON articles
USING GIN (search_vector)
WITH (fastupdate = on, gin_pending_list_limit = 4096);

-- fastupdate: Buffers index updates for batch processing
-- gin_pending_list_limit: Size of pending list in KB

-- For read-heavy workloads, disable fastupdate
CREATE INDEX idx_articles_search ON articles
USING GIN (search_vector)
WITH (fastupdate = off);
```

---

## Building a Search API

Here is a complete search function for production use:

```sql
-- Comprehensive search function
CREATE OR REPLACE FUNCTION search_articles_api(
    search_query TEXT,
    page_number INT DEFAULT 1,
    page_size INT DEFAULT 10
)
RETURNS TABLE(
    id INT,
    title VARCHAR,
    snippet TEXT,
    author VARCHAR,
    published_at TIMESTAMP,
    rank REAL,
    total_count BIGINT
) AS $$
DECLARE
    query tsquery;
    offset_val INT;
BEGIN
    -- Parse search query with error handling
    BEGIN
        query := websearch_to_tsquery('english', search_query);
    EXCEPTION WHEN OTHERS THEN
        query := plainto_tsquery('english', search_query);
    END;

    -- Calculate offset
    offset_val := (page_number - 1) * page_size;

    RETURN QUERY
    WITH search_results AS (
        SELECT
            a.id,
            a.title,
            ts_headline(
                'english',
                a.body,
                query,
                'MaxWords=50, MinWords=25, StartSel=<mark>, StopSel=</mark>'
            ) AS snippet,
            a.author,
            a.published_at,
            ts_rank(a.search_vector, query) AS rank
        FROM articles a
        WHERE a.search_vector @@ query
    ),
    counted AS (
        SELECT COUNT(*) AS total FROM search_results
    )
    SELECT
        sr.id,
        sr.title,
        sr.snippet,
        sr.author,
        sr.published_at,
        sr.rank,
        c.total
    FROM search_results sr, counted c
    ORDER BY sr.rank DESC
    LIMIT page_size
    OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;

-- Usage
SELECT * FROM search_articles_api('postgresql performance', 1, 10);
```

---

## Conclusion

PostgreSQL full-text search with GIN indexes provides a powerful, integrated search solution. Key takeaways:

1. Use generated tsvector columns for automatic updates
2. Apply weights (A, B, C, D) to prioritize title over body matches
3. Create GIN indexes for fast search performance
4. Use ts_headline for search result snippets
5. Combine with pg_trgm for fuzzy/typo-tolerant search

For many applications, PostgreSQL search eliminates the need for a separate search engine, reducing complexity and operational overhead.

---

*Need to monitor your search performance? [OneUptime](https://oneuptime.com) provides database monitoring with query performance tracking, slow query alerts, and index usage analytics for PostgreSQL.*

**Related Reading:**
- [How to Choose Between B-Tree, GIN, and BRIN Indexes in PostgreSQL](https://oneuptime.com/blog/post/2026-01-25-btree-gin-brin-indexes-postgresql/view)
- [How to Query and Index JSONB Efficiently in PostgreSQL](https://oneuptime.com/blog/post/2026-01-26-jsonb-querying-indexing-postgresql/view)
