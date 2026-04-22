# How to Configure InnoDB Full-Text Search in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Full-Text Search, InnoDB, Configuration, Performance

Description: Learn how to configure InnoDB full-text search settings including token size, stopwords, result caching, and index rebuild for optimal search performance.

---

## InnoDB Full-Text Search Configuration Variables

MySQL provides several variables to tune InnoDB full-text search behavior. Most require rebuilding the index after changing.

```sql
SHOW VARIABLES LIKE 'innodb_ft%';
```

| Variable | Description | Default |
|----------|-------------|---------|
| `innodb_ft_min_token_size` | Minimum word length to index | 3 |
| `innodb_ft_max_token_size` | Maximum word length to index | 84 |
| `innodb_ft_enable_stopword` | Enable/disable stopwords | ON |
| `innodb_ft_server_stopword_table` | Custom stopword table | NULL |
| `innodb_ft_user_stopword_table` | Session-level stopword table | NULL |
| `innodb_ft_num_word_optimize` | Words optimized per OPTIMIZE call | 2000 |
| `innodb_ft_cache_size` | Per-index cache for uncommitted data | 8000000 (~8MB) |
| `innodb_ft_total_cache_size` | Total cache across all indexes | 640000000 (~640MB) |
| `innodb_ft_result_cache_limit` | Max memory for a single FTS result | 2000000000 (~2GB) |
| `innodb_ft_sort_pll_degree` | Parallel threads for index build | 2 |

## Setting Minimum Token Size

The default minimum token size of 3 means 2-letter words like "US", "DB", or "AI" are not indexed.

To index 2-character words:

```text
[mysqld]
innodb_ft_min_token_size = 2
```

```bash
# Restart MySQL after changing this
systemctl restart mysql
```

Then rebuild the affected FULLTEXT indexes:

```sql
OPTIMIZE TABLE articles;
-- Or: ALTER TABLE articles DROP INDEX idx_ft; ALTER TABLE articles ADD FULLTEXT...
```

## Configuring Custom Stopwords

By default, InnoDB uses a built-in stopword list. Create a custom list to control which words are excluded:

```sql
-- Create custom stopword table
CREATE TABLE myapp.ft_stopwords (value VARCHAR(30) CHARACTER SET utf8mb4) ENGINE = InnoDB;

-- Add custom stopwords
INSERT INTO myapp.ft_stopwords (value) VALUES
  ('example'), ('test'), ('demo'), ('sample'), ('foo'), ('bar');

-- Configure globally
SET GLOBAL innodb_ft_server_stopword_table = 'myapp/ft_stopwords';
```

In `my.cnf`:

```text
[mysqld]
innodb_ft_server_stopword_table = myapp/ft_stopwords
```

After setting, rebuild any FULLTEXT indexes that should use the new stopword list.

## Disabling Stopwords Entirely

For specialized search use cases (product codes, abbreviations):

```sql
SET GLOBAL innodb_ft_enable_stopword = OFF;
```

## Configuring Index Build Parallelism

For large tables, speed up FULLTEXT index creation with parallel threads. Note that `innodb_ft_sort_pll_degree` is not dynamic - it must be set at server startup:

```text
[mysqld]
innodb_ft_sort_pll_degree = 8
```

```bash
# Restart MySQL after changing this
systemctl restart mysql
```

Then build the index with more parallelism:

```sql
ALTER TABLE large_articles ADD FULLTEXT INDEX idx_ft (title, body);
```

## Tuning the FTS Cache

InnoDB caches newly inserted/updated FTS data in memory before synchronizing to the auxiliary tables. Larger cache means less frequent flushes:

```text
[mysqld]
innodb_ft_cache_size = 33554432     -- 32MB per-index cache
innodb_ft_total_cache_size = 671088640  -- 640MB total FTS cache
```

The cache is flushed to the auxiliary tables when it reaches `innodb_ft_cache_size`. Note that committed data becomes visible for full-text searches at transaction commit time, but the in-memory cache is not necessarily flushed to disk on each commit.

## Viewing FTS Auxiliary Tables

InnoDB stores the inverted index in six auxiliary tables per FULLTEXT index. View them:

```sql
SET GLOBAL innodb_ft_aux_table = 'myapp/articles';

SELECT * FROM information_schema.INNODB_FT_INDEX_TABLE LIMIT 20;
SELECT * FROM information_schema.INNODB_FT_INDEX_CACHE LIMIT 20;
SELECT * FROM information_schema.INNODB_FT_DELETED LIMIT 20;
```

## Optimizing a FULLTEXT Index

FULLTEXT indexes accumulate deleted document references over time. Optimize periodically:

```sql
OPTIMIZE TABLE articles;
```

This merges changes from the cache into the main FTS index and removes deleted entries. Schedule it during low-traffic periods.

## Monitoring FTS Query Performance

```sql
-- Enable FTS query instrumentation
SET GLOBAL innodb_ft_result_cache_limit = 2000000000;  -- 2GB per query result

-- Check FTS-related status
SHOW STATUS LIKE 'Innodb_ft%';
```

## Practical Full Configuration Example

```text
[mysqld]
# Token size
innodb_ft_min_token_size = 2
innodb_ft_max_token_size = 84

# Stopwords
innodb_ft_enable_stopword = ON
innodb_ft_server_stopword_table = myapp/ft_stopwords

# Cache sizing
innodb_ft_cache_size = 33554432
innodb_ft_total_cache_size = 671088640

# Index build parallelism
innodb_ft_sort_pll_degree = 4
```

## Summary

InnoDB full-text search is highly configurable. Adjust `innodb_ft_min_token_size` to index short terms, configure custom stopwords to exclude domain-specific noise words, and use parallel index builds for large tables. Always rebuild FULLTEXT indexes after changing token size or stopword settings, and run `OPTIMIZE TABLE` periodically to compact the index and remove deleted document references.
