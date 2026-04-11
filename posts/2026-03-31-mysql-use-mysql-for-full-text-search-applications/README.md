# How to Use MySQL for Full-Text Search Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Full-Text Search, Index, Query, Performance

Description: Learn how to implement full-text search in MySQL using FULLTEXT indexes, MATCH...AGAINST queries, boolean mode, and relevance ranking for practical search features.

---

MySQL's built-in full-text search is suitable for applications that need keyword search without the operational overhead of a dedicated search engine. InnoDB full-text indexes support natural language search, boolean operators, and relevance ranking.

## Creating Full-Text Indexes

Add a `FULLTEXT` index to one or more `VARCHAR` or `TEXT` columns:

```sql
CREATE TABLE articles (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title      VARCHAR(300) NOT NULL,
  body       TEXT NOT NULL,
  author     VARCHAR(200),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FULLTEXT INDEX ft_title_body (title, body)
) ENGINE=InnoDB;
```

You can also add a full-text index to an existing table:

```sql
ALTER TABLE articles ADD FULLTEXT INDEX ft_title_body (title, body);
```

## Natural Language Search

The default mode ranks results by relevance score:

```sql
SELECT id, title,
  MATCH(title, body) AGAINST('database performance optimization') AS relevance
FROM articles
WHERE MATCH(title, body) AGAINST('database performance optimization')
ORDER BY relevance DESC
LIMIT 10;
```

MySQL calculates relevance as a non-negative floating-point score based on term frequency and inverse document frequency. Higher scores mean more relevant results.

## Boolean Mode Search

Boolean mode supports operators for fine-grained control:

```sql
SELECT id, title
FROM articles
WHERE MATCH(title, body) AGAINST(
  '+mysql +performance -slow'
  IN BOOLEAN MODE
);
```

Operator reference:

```text
+term   - term must be present
-term   - term must not be present
>term   - increase the term's relevance contribution
<term   - decrease the term's relevance contribution
*       - wildcard suffix (fast* matches faster, fastest)
"phrase" - exact phrase match
```

## Query Expansion

Query expansion automatically adds related terms to broaden results:

```sql
SELECT id, title
FROM articles
WHERE MATCH(title, body) AGAINST(
  'query optimization'
  WITH QUERY EXPANSION
);
```

MySQL runs the query once, finds the top results, extracts significant words from those results, and reruns the query with the expanded term list.

## Configuring the Minimum Word Length

By default, InnoDB full-text search ignores words shorter than 3 characters. Change this with `innodb_ft_min_token_size`:

```ini
[mysqld]
innodb_ft_min_token_size = 2
```

After changing this setting, rebuild all full-text indexes:

```sql
OPTIMIZE TABLE articles;
```

## Stopwords

MySQL ignores common words like "the", "is", and "a". To disable the default stopword list:

```ini
[mysqld]
innodb_ft_enable_stopword = OFF
```

Or replace it with a custom stopword table:

```sql
CREATE TABLE my_stopwords (value VARCHAR(30));
INSERT INTO my_stopwords VALUES ('example_stopword');
SET GLOBAL innodb_ft_server_stopword_table = 'mydb/my_stopwords';
```

## Summary

MySQL full-text search covers keyword search, boolean operators, relevance ranking, and query expansion through a straightforward `MATCH...AGAINST` syntax. It is a practical choice for content search in CMSs, documentation search, and product search when the data fits within MySQL and you want to avoid the operational cost of Elasticsearch. For very large corpora or advanced features like fuzzy matching and field boosting, a dedicated search engine provides more flexibility.
