# How to Rank Full-Text Search Results in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Full-Text Search, Ranking, InnoDB, Query

Description: Learn how MySQL calculates full-text relevance scores and how to sort search results by relevance using MATCH AGAINST in natural language mode.

---

## How MySQL Ranks Full-Text Results

MySQL uses a relevance ranking algorithm for InnoDB full-text search to calculate relevance scores. A higher score indicates a stronger match. The score is computed based on the number of words in the row, the number of unique words in the row, the total number of words in the collection, and the number of rows that contain a particular word.

The relevance score is returned by the `MATCH(...) AGAINST(...)` expression itself when used in the `SELECT` list.

## Returning Relevance Scores

Use `MATCH AGAINST` in both the `SELECT` list and the `WHERE` clause:

```sql
SELECT
  id,
  title,
  MATCH(title, body) AGAINST('mysql performance tuning') AS relevance
FROM articles
WHERE MATCH(title, body) AGAINST('mysql performance tuning')
ORDER BY relevance DESC;
```

The `WHERE` clause filters rows that have any match. The `ORDER BY relevance DESC` sorts by how well each row matches the query.

## Natural Language Mode vs Boolean Mode

Ranking behavior differs between search modes:

```sql
-- Natural Language Mode (default) - returns relevance scores
SELECT title,
  MATCH(title, body) AGAINST('database optimization' IN NATURAL LANGUAGE MODE) AS score
FROM articles
WHERE MATCH(title, body) AGAINST('database optimization' IN NATURAL LANGUAGE MODE)
ORDER BY score DESC
LIMIT 10;

-- Boolean Mode - relevance scores are less precise
SELECT title,
  MATCH(title, body) AGAINST('+database +optimization' IN BOOLEAN MODE) AS score
FROM articles
WHERE MATCH(title, body) AGAINST('+database +optimization' IN BOOLEAN MODE)
ORDER BY score DESC
LIMIT 10;
```

Natural Language Mode produces more meaningful ranking scores because it weights terms by their rarity across the entire collection.

## Combining Relevance with Other Criteria

You can blend full-text relevance with other signals like recency or popularity:

```sql
SELECT
  id,
  title,
  published_at,
  view_count,
  MATCH(title, body) AGAINST('indexing strategies') AS ft_score,
  (MATCH(title, body) AGAINST('indexing strategies') * 0.7)
    + (LOG(1 + view_count) * 0.3) AS blended_score
FROM articles
WHERE MATCH(title, body) AGAINST('indexing strategies')
ORDER BY blended_score DESC
LIMIT 20;
```

This blended score weights full-text relevance at 70% and log-scaled popularity at 30%.

## Filtering by Minimum Relevance

Exclude very weak matches by adding a minimum score threshold:

```sql
SELECT title,
  MATCH(title, body) AGAINST('query optimization') AS score
FROM articles
WHERE MATCH(title, body) AGAINST('query optimization')
  AND MATCH(title, body) AGAINST('query optimization') > 0.5
ORDER BY score DESC;
```

## WITH QUERY EXPANSION

MySQL's query expansion mode performs a second search using the top results from the first pass. This can surface more relevant documents at the cost of some precision:

```sql
SELECT title,
  MATCH(title, body) AGAINST('slow query' WITH QUERY EXPANSION) AS score
FROM articles
WHERE MATCH(title, body) AGAINST('slow query' WITH QUERY EXPANSION)
ORDER BY score DESC
LIMIT 10;
```

## Performance Tips

Calling `MATCH AGAINST` twice (once in `WHERE`, once in `SELECT`) does not double the computation - MySQL caches the result within a single query. However, ensure a full-text index covers all searched columns:

```sql
ALTER TABLE articles ADD FULLTEXT INDEX ft_idx (title, body);
EXPLAIN SELECT * FROM articles
WHERE MATCH(title, body) AGAINST('performance');
```

Verify the `EXPLAIN` output shows `fulltext` in the `type` column.

## Summary

MySQL ranks full-text search results using a relevance ranking algorithm, returning a floating-point relevance score from the `MATCH AGAINST` expression. Sort results by score descending to surface the most relevant matches. Use Natural Language Mode for the most meaningful scores, combine relevance with other signals using weighted formulas, and add a minimum score filter to eliminate weak matches.
