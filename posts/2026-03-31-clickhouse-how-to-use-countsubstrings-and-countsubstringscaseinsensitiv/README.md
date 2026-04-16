# How to Use countSubstrings() and countSubstringsCaseInsensitive() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, String Function, countSubstrings, Text Analysis, Analytics

Description: Learn how to use countSubstrings() and countSubstringsCaseInsensitive() in ClickHouse to count how many times a substring appears within string values.

---

## What Are countSubstrings Functions

`countSubstrings(haystack, needle)` returns the number of non-overlapping occurrences of `needle` in `haystack`. `countSubstringsCaseInsensitive(haystack, needle)` does the same but ignores case.

```sql
-- Count occurrences of a word
SELECT countSubstrings('hello world hello', 'hello');         -- 2
SELECT countSubstrings('abcabcabc', 'abc');                   -- 3
SELECT countSubstringsCaseInsensitive('Hello HELLO hello', 'hello');  -- 3
```

## Basic Usage

```sql
CREATE TABLE documents (
    doc_id UInt64,
    title String,
    content String,
    author String
) ENGINE = MergeTree()
ORDER BY doc_id;

-- Count keyword occurrences in document content
SELECT
    doc_id,
    title,
    countSubstrings(content, 'error') AS error_count,
    countSubstrings(content, 'warning') AS warning_count,
    countSubstringsCaseInsensitive(content, 'clickhouse') AS clickhouse_mentions
FROM documents
WHERE countSubstringsCaseInsensitive(content, 'clickhouse') > 0
ORDER BY clickhouse_mentions DESC;
```

## Log Analysis

```sql
CREATE TABLE application_logs (
    log_id UInt64,
    ts DateTime,
    raw_log String,
    level LowCardinality(String)
) ENGINE = MergeTree()
ORDER BY ts;

-- Count specific patterns in log lines
SELECT
    toDate(ts) AS log_date,
    count() AS total_logs,
    sum(countSubstrings(raw_log, 'Exception')) AS total_exceptions,
    sum(countSubstrings(raw_log, 'timeout')) AS timeout_occurrences,
    sum(countSubstringsCaseInsensitive(raw_log, 'error')) AS error_occurrences,
    sum(countSubstrings(raw_log, 'retry')) AS retry_count
FROM application_logs
GROUP BY log_date
ORDER BY log_date;
```

## Counting Delimiters

```sql
-- Count commas to determine CSV field count
SELECT
    raw_line,
    countSubstrings(raw_line, ',') + 1 AS field_count  -- fields = commas + 1
FROM csv_imports;

-- Validate CSV column count
SELECT count() AS malformed_rows
FROM csv_imports
WHERE countSubstrings(raw_line, ',') != 9;  -- expect 10 columns (9 commas)

-- Count path segments in URLs
SELECT
    url,
    countSubstrings(url, '/') AS path_depth
FROM web_requests
ORDER BY path_depth DESC;
```

## Text Metrics and Analysis

```sql
-- Estimate word count (count spaces + 1)
SELECT
    doc_id,
    title,
    countSubstrings(content, ' ') + 1 AS approx_word_count,
    length(content) AS char_count,
    countSubstrings(content, '.') + 
    countSubstrings(content, '!') + 
    countSubstrings(content, '?') AS sentence_count
FROM documents;

-- Keyword density analysis
SELECT
    doc_id,
    keyword,
    occurrences,
    total_words,
    round(occurrences / total_words * 100, 2) AS density_pct
FROM (
    SELECT
        doc_id,
        'database' AS keyword,
        countSubstringsCaseInsensitive(content, 'database') AS occurrences,
        countSubstrings(content, ' ') + 1 AS total_words
    FROM documents
)
WHERE occurrences > 0
ORDER BY density_pct DESC;
```

## Counting Substrings in Arrays

```sql
-- Count patterns across array elements
SELECT
    user_id,
    -- Count how many tags contain 'sql'
    countIf(tag, countSubstringsCaseInsensitive(tag, 'sql') > 0) AS sql_tags
FROM (
    SELECT user_id, arrayJoin(tags) AS tag
    FROM user_profiles
)
GROUP BY user_id;
```

## Using with HAVING for Filtering

```sql
-- Find documents mentioning a topic multiple times
SELECT
    doc_id,
    title,
    countSubstringsCaseInsensitive(content, 'performance') AS perf_mentions
FROM documents
HAVING perf_mentions >= 5
ORDER BY perf_mentions DESC;

-- Find log lines with multiple errors
SELECT
    ts,
    raw_log
FROM application_logs
WHERE countSubstrings(raw_log, 'FAILED') >= 2;
```

## Practical Example: Email Template Analysis

```sql
CREATE TABLE email_templates (
    template_id UInt64,
    name String,
    subject String,
    body String
) ENGINE = MergeTree()
ORDER BY template_id;

-- Analyze template variable usage
SELECT
    template_id,
    name,
    countSubstrings(body, '{{') AS placeholder_count,
    countSubstringsCaseInsensitive(body, '{{name}}') AS name_placeholders,
    countSubstringsCaseInsensitive(body, '{{company}}') AS company_placeholders,
    countSubstrings(body, char(10)) + 1 AS line_count,  -- count newlines
    length(body) AS body_length
FROM email_templates
ORDER BY placeholder_count DESC;
```

## countSubstrings vs position() vs match()

```sql
-- Use countSubstrings when you need the COUNT of occurrences
SELECT countSubstrings(text, 'error');     -- returns: 3

-- Use position() when you need the LOCATION of first occurrence
SELECT position(text, 'error');           -- returns: 15 (position)

-- Use match() when you need to check IF a pattern EXISTS
SELECT match(text, 'error|warning');      -- returns: 1 or 0

-- Use extract() when you need to CAPTURE a pattern
SELECT extract(text, 'error: ([^\\n]+)'); -- returns matched group
```

## Summary

`countSubstrings(haystack, needle)` and `countSubstringsCaseInsensitive(haystack, needle)` count non-overlapping occurrences of a needle string within a larger string. They are ideal for log analysis, keyword frequency counting, CSV validation (counting delimiters), and text metrics. Use the case-insensitive variant when matching user-generated content or log messages where case may vary. Combine with `sum()` in aggregate queries to get total occurrence counts across many rows.
