# How to Use MySQL Full-Text Search

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Full-Text Search, Database, Search, Indexing

Description: Learn how to implement full-text search in MySQL using FULLTEXT indexes, natural language and boolean modes, and optimization techniques for building fast, relevant search features.

---

> Full-text search is built into MySQL. Before reaching for Elasticsearch or Solr, understand what the database you already have can do - it might be enough.

Most applications need search. The instinct is often to add a dedicated search engine immediately, but MySQL's built-in full-text search handles many use cases well. This guide covers how to set it up, the different search modes, tuning options, and when you should consider alternatives.

## What is Full-Text Search?

Full-text search lets you find rows that match natural language queries against text columns. Unlike `LIKE '%term%'`, which scans every row, full-text search uses an inverted index for fast lookups and returns results ranked by relevance.

MySQL supports full-text search on `CHAR`, `VARCHAR`, and `TEXT` columns in both InnoDB and MyISAM tables.

## Creating a FULLTEXT Index

You can create a FULLTEXT index when defining a table or add it to an existing table.

```sql
-- Create table with FULLTEXT index
CREATE TABLE articles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Define FULLTEXT index on title and body
    FULLTEXT INDEX ft_articles (title, body)
) ENGINE=InnoDB;

-- Or add FULLTEXT index to existing table
ALTER TABLE articles ADD FULLTEXT INDEX ft_title (title);

-- Index multiple columns together for combined searches
ALTER TABLE articles ADD FULLTEXT INDEX ft_title_body (title, body);
```

Building a FULLTEXT index on a large table takes time and locks writes. Schedule this during low-traffic windows.

## Natural Language Mode

Natural language mode is the default. MySQL parses the query as a phrase, removes stopwords, and ranks results by relevance.

```sql
-- Basic natural language search
SELECT id, title,
       MATCH(title, body) AGAINST('database optimization') AS relevance
FROM articles
WHERE MATCH(title, body) AGAINST('database optimization')
ORDER BY relevance DESC;

-- The MATCH() AGAINST() in WHERE filters rows
-- The same expression in SELECT returns the relevance score
```

Relevance scoring considers:
- Term frequency in the document
- Inverse document frequency across the table
- Document length normalization

Higher scores mean better matches. A score of 0 means no match.

## Boolean Mode

Boolean mode gives you precise control over search logic using operators.

```sql
-- Must contain 'mysql', must not contain 'oracle'
SELECT * FROM articles
WHERE MATCH(title, body) AGAINST('+mysql -oracle' IN BOOLEAN MODE);

-- Must contain 'database', 'performance' is optional but boosts relevance
SELECT * FROM articles
WHERE MATCH(title, body) AGAINST('+database performance' IN BOOLEAN MODE);

-- Phrase search - must contain exact phrase
SELECT * FROM articles
WHERE MATCH(title, body) AGAINST('"query optimization"' IN BOOLEAN MODE);

-- Wildcard - matches 'optimize', 'optimization', 'optimizer'
SELECT * FROM articles
WHERE MATCH(title, body) AGAINST('optim*' IN BOOLEAN MODE);

-- Combine operators
-- Must have 'mysql', should have 'performance', must not have 'deprecated'
SELECT * FROM articles
WHERE MATCH(title, body) AGAINST('+mysql +performance -deprecated' IN BOOLEAN MODE);
```

Boolean mode operators:
- `+` - Term must be present
- `-` - Term must not be present
- `*` - Wildcard (suffix only)
- `"phrase"` - Exact phrase match
- `>` / `<` - Increase or decrease relevance contribution
- `()` - Group terms into subexpressions
- `~` - Negate term's relevance contribution

Boolean mode does not automatically sort by relevance. Add an explicit ORDER BY if needed.

## Query Expansion Mode

Query expansion runs the search twice. First pass finds matching rows, then MySQL extracts relevant terms from those results and runs an expanded second search.

```sql
-- Find articles about 'database' and related terms
SELECT * FROM articles
WHERE MATCH(title, body) AGAINST('database' WITH QUERY EXPANSION);

-- Useful when users search with few words
-- MySQL might find 'mysql', 'postgresql', 'sql' in top results
-- and include those terms in the expanded search
```

Query expansion can introduce noise. Use it when recall matters more than precision, such as exploratory searches or when users enter vague queries.

## Relevance Scoring in Practice

Use relevance scores to build meaningful search results.

```sql
-- Return results with relevance above a threshold
SELECT id, title,
       MATCH(title, body) AGAINST('mysql performance tuning') AS score
FROM articles
WHERE MATCH(title, body) AGAINST('mysql performance tuning')
HAVING score > 0.5
ORDER BY score DESC
LIMIT 20;

-- Weight title matches higher than body matches
SELECT id, title,
       (MATCH(title) AGAINST('mysql') * 2.0 +
        MATCH(body) AGAINST('mysql')) AS weighted_score
FROM articles
WHERE MATCH(title, body) AGAINST('mysql')
ORDER BY weighted_score DESC;
```

The actual score values depend on your data. Test with real content to determine useful thresholds.

## Configuring Minimum Word Length

By default, MySQL ignores words shorter than 3 characters (InnoDB) or 4 characters (MyISAM). Adjust this if you need to search for short terms.

```sql
-- Check current settings
SHOW VARIABLES LIKE 'innodb_ft_min_token_size';
SHOW VARIABLES LIKE 'ft_min_word_len';

-- To change, edit my.cnf and restart MySQL
-- [mysqld]
-- innodb_ft_min_token_size = 2
-- ft_min_word_len = 2

-- After changing, rebuild your FULLTEXT indexes
ALTER TABLE articles DROP INDEX ft_articles;
ALTER TABLE articles ADD FULLTEXT INDEX ft_articles (title, body);

-- Or use OPTIMIZE TABLE for InnoDB
OPTIMIZE TABLE articles;
```

Lowering minimum word length increases index size and may impact performance.

## Customizing Stopwords

Stopwords are common words excluded from the index. MySQL has a default list, but you can customize it.

```sql
-- View default InnoDB stopwords
SELECT * FROM INFORMATION_SCHEMA.INNODB_FT_DEFAULT_STOPWORD;

-- Create custom stopword table
CREATE TABLE my_stopwords (value VARCHAR(30)) ENGINE=InnoDB;
INSERT INTO my_stopwords VALUES ('the'), ('and'), ('for');

-- Configure MySQL to use custom stopwords (in my.cnf)
-- [mysqld]
-- innodb_ft_server_stopword_table = 'mydb/my_stopwords'

-- Or set per-table stopwords
CREATE TABLE articles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255),
    body TEXT,
    FULLTEXT (title, body)
) ENGINE=InnoDB
  COMMENT='innodb_ft_user_stopword_table=mydb/my_stopwords';

-- Disable stopwords entirely for technical content
-- innodb_ft_enable_stopword = OFF
```

After changing stopword configuration, rebuild your FULLTEXT indexes.

## InnoDB vs MyISAM Full-Text

InnoDB full-text search was added in MySQL 5.6. Here are the key differences:

| Feature | InnoDB | MyISAM |
| --- | --- | --- |
| Transactions | Yes | No |
| Crash recovery | Yes | Manual repair needed |
| Concurrent writes | Yes | Table-level locking |
| Default min word length | 3 | 4 |
| Stopword configuration | Per-table possible | Global only |
| Performance | Good | Slightly faster for read-heavy |

Use InnoDB unless you have a specific reason not to. The transactional guarantees and crash recovery are worth it.

## Performance Considerations

Full-text search performs well but has limits.

```sql
-- Use covering indexes when possible
-- Bad: fetches all columns, then filters
SELECT * FROM articles
WHERE MATCH(title, body) AGAINST('mysql');

-- Better: fetch only what you need
SELECT id, title FROM articles
WHERE MATCH(title, body) AGAINST('mysql')
LIMIT 20;

-- Avoid combining FULLTEXT with other slow conditions
-- Bad: full table scan on date, then fulltext filter
SELECT * FROM articles
WHERE created_at > '2024-01-01'
  AND MATCH(title, body) AGAINST('mysql');

-- Better: let fulltext drive the query, filter after
SELECT * FROM (
    SELECT id, title, created_at,
           MATCH(title, body) AGAINST('mysql') AS score
    FROM articles
    WHERE MATCH(title, body) AGAINST('mysql')
    ORDER BY score DESC
    LIMIT 100
) AS results
WHERE created_at > '2024-01-01';
```

Monitor these metrics:
- Index size: FULLTEXT indexes can be large
- Insert latency: index updates happen on write
- Query time: watch for slow searches on large datasets

## When to Use a Dedicated Search Engine

MySQL full-text search works well for:
- Small to medium datasets (under 10 million rows)
- Simple search requirements
- When you want to avoid infrastructure complexity
- CRUD applications with basic search features

Consider Elasticsearch, Meilisearch, or Typesense when you need:
- Fuzzy matching and typo tolerance
- Faceted search and aggregations
- Multi-language stemming and analyzers
- Synonyms and custom tokenization
- Horizontal scaling across nodes
- Near real-time indexing with high write throughput
- Complex relevance tuning
- Autocomplete with prefix matching

The decision often comes down to complexity versus capability. MySQL full-text is simpler to operate but less powerful. A dedicated search engine requires more infrastructure but handles advanced use cases.

## Best Practices Summary

1. **Start with MySQL full-text** - it handles more than you might expect
2. **Create composite indexes** on columns that are searched together
3. **Use boolean mode** when users need precise control
4. **Set appropriate minimum word length** for your content
5. **Review stopwords** - defaults may exclude important terms in your domain
6. **Limit result sets** - don't fetch thousands of rows
7. **Monitor index size and query performance** as data grows
8. **Benchmark against real data** before going to production
9. **Consider a dedicated search engine** only when MySQL's limits become blocking

---

Full-text search in MySQL is a practical feature that solves real problems without adding external dependencies. For many applications, it provides the right balance of simplicity and functionality. Start here, measure the results, and only add complexity when the data proves you need it.

To monitor your MySQL database and search performance, check out [OneUptime](https://oneuptime.com) for comprehensive observability and alerting.
