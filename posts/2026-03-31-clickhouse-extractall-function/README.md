# How to Use extractAll() Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, String Function, Regular Expression, Array, SQL

Description: Learn how extractAll() returns an array of every regex capture group match in a string, enabling multi-value extraction from log lines, URLs, and structured text.

---

ClickHouse's `extract()` function returns only the first regex match. When a string contains multiple occurrences of a pattern and you need all of them, `extractAll()` is the correct tool. It returns an array of every match found by scanning the full string, making it ideal for parsing repeated patterns in log lines, pulling multiple values from a single text field, or extracting all instances of a structured token from unstructured data.

## Function Signature

```text
extractAll(str, pattern)
```

- `str` - the input string to search
- `pattern` - a regular expression, optionally containing a capture group

The function returns an `Array(String)` containing every match found in `str`, in the order they appear. If the pattern contains a capture group, the function returns matches of the first capture group; otherwise it returns matches of the entire pattern. If no matches are found, an empty array is returned.

## Basic Usage - Extracting All Numbers from Text

The most straightforward use case is collecting every integer or decimal number that appears in a string.

```sql
SELECT
    text,
    extractAll(text, '(\d+)') AS numbers
FROM (
    SELECT arrayJoin([
        'Order 123 contains 5 items worth 49 dollars',
        'Retried 3 times, waited 500ms, then 1000ms',
        'No numbers here'
    ]) AS text
)
```

```text
text                                              | numbers
--------------------------------------------------+-------------------
Order 123 contains 5 items worth 49 dollars       | ['123','5','49']
Retried 3 times, waited 500ms, then 1000ms        | ['3','500','1000']
No numbers here                                   | []
```

## Extracting All URLs from a Log Line

Log lines sometimes contain multiple URLs in a single message. `extractAll` captures all of them at once.

```sql
SELECT
    log_line,
    extractAll(log_line, '(https?://[^\s"<>]+)') AS urls
FROM (
    SELECT arrayJoin([
        'Redirected from https://old.example.com/page to https://new.example.com/page',
        'Fetched https://api.example.com/v1/users and https://api.example.com/v1/orders',
        'No URLs in this line'
    ]) AS log_line
)
```

```text
log_line                                                                       | urls
-------------------------------------------------------------------------------+-------------------------------------------------------------
Redirected from https://old.example.com/page to https://new.example.com/page  | ['https://old.example.com/page','https://new.example.com/page']
Fetched https://api.example.com/v1/users and ...                               | ['https://api.example.com/v1/users','https://api.example.com/v1/orders']
No URLs in this line                                                            | []
```

## Parsing Repeated Key=Value Pairs

Structured log formats often repeat a `key=value` pattern multiple times per line. `extractAll` can extract all values for a specific key pattern.

```sql
SELECT
    log_line,
    extractAll(log_line, '\w+=(\S+)') AS all_values,
    extractAll(log_line, '(\w+)=\S+') AS all_keys
FROM (
    SELECT 'level=info service=api latency=42ms status=200 user=alice' AS log_line
)
```

```text
all_keys                              | all_values
--------------------------------------+-------------------------------
['level','service','latency','status','user'] | ['info','api','42ms','200','alice']
```

## Flattening Extracted Arrays with arrayJoin

To work with each matched value as its own row, combine `extractAll` with `arrayJoin`.

```sql
SELECT
    request_id,
    arrayJoin(extractAll(log_message, '(\d+\.\d+\.\d+\.\d+)')) AS ip_address
FROM application_logs
WHERE event_date = today()
  AND log_message LIKE '%IP%'
LIMIT 50
```

This produces one row per IP address found in each log message, making it easy to count distinct IPs or join against a blocklist.

## Counting Occurrences via Array Length

`length(extractAll(...))` gives the number of times the pattern matched, producing the same result as `countMatches`, the regex-based counting function.

```sql
SELECT
    page_content,
    length(extractAll(page_content, '(https?://[^\s]+)')) AS url_count,
    length(extractAll(page_content, '(\b\d{4}\b)'))       AS four_digit_count
FROM web_pages
ORDER BY url_count DESC
LIMIT 10
```

## Extracting All Hashtags from Social Media Text

```sql
SELECT
    post_text,
    extractAll(post_text, '#([A-Za-z][A-Za-z0-9_]*)') AS hashtags,
    length(extractAll(post_text, '#([A-Za-z][A-Za-z0-9_]*)')) AS hashtag_count
FROM social_posts
WHERE event_date = today()
LIMIT 20
```

## Aggregating All Matched Tokens Across Many Rows

By combining `extractAll` with `arrayJoin` and then aggregating, you can build a global frequency table of matched tokens across an entire dataset.

```sql
SELECT
    token,
    count() AS occurrences
FROM (
    SELECT arrayJoin(extractAll(log_message, '(ERR_[A-Z0-9_]+)')) AS token
    FROM application_logs
    WHERE event_date >= today() - 7
)
GROUP BY token
ORDER BY occurrences DESC
LIMIT 20
```

This surfaces the most common error codes embedded in log messages over the past week.

## Summary

`extractAll(str, pattern)` scans the full input string and returns an `Array(String)` of every substring matched by the single capture group in the regex. It handles cases where `extract()` falls short by capturing all occurrences rather than just the first. Combine it with `arrayJoin` to expand results into individual rows, use `length()` to count matches, or pass the resulting array to other array functions for further processing. It is particularly powerful for mining repeated tokens, URLs, error codes, and structured key-value pairs from unstructured log data.
