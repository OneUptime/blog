# How to Create and Use Search Indexes in BigQuery for Full-Text Search

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Full-Text Search, Search Index, Data Analytics

Description: Learn how to create search indexes in BigQuery for fast full-text search across large datasets, including tokenization, filtering, and relevance scoring.

---

Full-text search is one of those features that every data team eventually needs. You have a table with millions of rows of text - product descriptions, support tickets, log messages, user reviews - and someone wants to search through them quickly. BigQuery's search indexes let you build full-text search capabilities directly in your data warehouse without exporting data to a separate search engine like Elasticsearch. Here is how to set it up and use it effectively.

## The Problem with LIKE and CONTAINS_SUBSTR

Before search indexes, searching text in BigQuery meant using LIKE patterns or CONTAINS_SUBSTR:

```sql
-- Traditional text search - scans every row, slow on large tables
SELECT product_id, product_name, description
FROM `my_project.catalog.products`
WHERE LOWER(description) LIKE '%wireless%bluetooth%headphones%'
   OR LOWER(description) LIKE '%bluetooth%wireless%headphones%';
```

This approach has problems. It performs a full table scan every time, it cannot handle word order variations well, and it does not rank results by relevance. For a million-row table, it might be fine. For a billion rows, it is painfully slow and expensive.

## Creating a Search Index

A search index tokenizes text columns and builds an inverted index that maps terms to the rows containing them. Creating one is straightforward:

```sql
-- Create a search index on the description column
-- This tokenizes the text and builds an inverted index
CREATE SEARCH INDEX product_search_index
ON `my_project.catalog.products`(description);
```

You can also index multiple columns:

```sql
-- Create a search index across multiple text columns
-- Searches will look across all indexed columns
CREATE SEARCH INDEX product_full_search
ON `my_project.catalog.products`(product_name, description, brand);
```

Or index all STRING and JSON columns in the table:

```sql
-- Index all string columns in the table
CREATE SEARCH INDEX product_all_text
ON `my_project.catalog.products`(ALL COLUMNS);
```

## Using the SEARCH Function

Once the index exists, use the SEARCH function to query it:

```sql
-- Search for products matching "wireless bluetooth headphones"
-- The search index makes this fast even on very large tables
SELECT
  product_id,
  product_name,
  description,
  price
FROM `my_project.catalog.products`
WHERE SEARCH(description, 'wireless bluetooth headphones')
ORDER BY price;
```

The SEARCH function leverages the index to quickly find rows containing the search terms, without scanning the entire table.

## Search Across Multiple Columns

When your index covers multiple columns, you can search across all of them:

```sql
-- Search across product_name, description, and brand columns
SELECT
  product_id,
  product_name,
  brand,
  description
FROM `my_project.catalog.products`
WHERE SEARCH(
  (product_name, description, brand),  -- Columns to search
  'Sony noise cancelling'               -- Search query
);
```

## Search Query Syntax

The SEARCH function supports several query patterns:

```sql
-- Match ALL terms (AND logic) - default behavior
-- Finds rows containing both "wireless" AND "headphones"
SELECT * FROM products
WHERE SEARCH(description, 'wireless headphones');

-- Use backticks for exact phrase matching
-- Finds rows containing the exact phrase "wireless headphones"
SELECT * FROM products
WHERE SEARCH(description, '`wireless headphones`');

-- Combine terms and phrases
-- Match "Sony" AND exact phrase "noise cancelling"
SELECT * FROM products
WHERE SEARCH(description, 'Sony `noise cancelling`');
```

## Combining Search with Structured Filters

The real power comes from combining full-text search with regular SQL filters:

```sql
-- Full-text search combined with structured filters
-- Search index handles the text matching, regular filters handle the rest
SELECT
  product_id,
  product_name,
  description,
  price,
  rating
FROM `my_project.catalog.products`
WHERE SEARCH(description, 'ergonomic keyboard')
  AND category = 'Electronics'
  AND price BETWEEN 50 AND 200
  AND rating >= 4.0
ORDER BY rating DESC
LIMIT 20;
```

BigQuery optimizes this by using the search index for the text filter and regular column pruning/partition pruning for the structured filters.

## Tokenization Options

By default, BigQuery uses a standard tokenizer that splits text on whitespace and punctuation, lowercases everything, and handles basic text normalization. You can customize the analyzer:

```sql
-- Create a search index with a specific analyzer
-- LOG_ANALYZER is designed for log-style data with special characters
CREATE SEARCH INDEX log_search_index
ON `my_project.logs.application_logs`(message)
OPTIONS (
  analyzer = 'LOG_ANALYZER'
);
```

The available analyzers are:

- **NO_OP_ANALYZER**: No tokenization - exact substring matching only
- **LOG_ANALYZER**: Designed for semi-structured log data, preserves special characters
- **PATTERN_ANALYZER**: Custom regex-based tokenization (for advanced use cases)

```sql
-- Search logs with LOG_ANALYZER - handles IP addresses, paths, etc.
SELECT
  timestamp,
  severity,
  message
FROM `my_project.logs.application_logs`
WHERE SEARCH(message, '192.168.1.100 connection refused')
  AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
ORDER BY timestamp DESC;
```

## Building a Search Application

Here is a more complete example of building a search feature for a support ticket system:

```sql
-- Create the search index for the support tickets table
CREATE SEARCH INDEX ticket_search
ON `my_project.support.tickets`(subject, description, resolution_notes);
```

```sql
-- Search function for the support team
-- Finds relevant past tickets based on a problem description
SELECT
  ticket_id,
  created_date,
  subject,
  -- Show a snippet of the description
  SUBSTR(description, 1, 200) AS description_preview,
  status,
  resolution_notes
FROM `my_project.support.tickets`
WHERE SEARCH(
  (subject, description, resolution_notes),
  'login timeout authentication error'
)
  AND created_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
ORDER BY created_date DESC
LIMIT 25;
```

## Monitoring Search Index Status

Search indexes are built asynchronously. Check their status:

```sql
-- Check the status and coverage of search indexes
SELECT
  table_name,
  index_name,
  index_status,
  coverage_percentage,
  total_logical_bytes,
  total_storage_bytes
FROM `my_project.catalog.INFORMATION_SCHEMA.SEARCH_INDEXES`
WHERE index_status = 'ACTIVE';
```

The `coverage_percentage` tells you how much of the table data is indexed. When data is first loaded or the index is first created, coverage starts low and increases as the indexing process completes.

## Cost Considerations

Search indexes have two cost components: storage (the index itself takes space) and maintenance (keeping the index up to date as data changes). For append-only tables like logs, the maintenance cost is minimal. For frequently updated tables, index maintenance adds overhead.

The search index storage is typically 50-100 percent of the size of the indexed text columns. So if your text columns total 100GB, expect the search index to use 50-100GB of additional storage.

However, the query cost savings are significant. Without an index, a text search scans the entire table. With an index, it reads only the relevant rows. On a 1TB table, a search query that would scan the full terabyte might only read a few megabytes with an index.

## When to Use Search Indexes vs Other Approaches

Use BigQuery search indexes when your data already lives in BigQuery and you need keyword search, your search queries combine text matching with structured filters, and you want a simple setup without managing a separate search infrastructure.

Consider Elasticsearch or a dedicated search engine when you need features like fuzzy matching, autocomplete, faceted search, or custom relevance scoring. BigQuery search is powerful for analytical queries but is not a replacement for a full search engine in user-facing applications that need sub-100ms response times.

BigQuery search indexes bring full-text search capabilities into your data warehouse, eliminating the need to maintain a separate search infrastructure for many analytical use cases. The setup is minimal, the query syntax is clean, and the performance improvement over brute-force text scanning is dramatic.
