# How to Use the String Data Type in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Data Type, String, Text

Description: Learn how to use the String data type in ClickHouse for arbitrary-length text, including UTF-8 handling, storage behavior, and key string functions.

---

ClickHouse's String type stores arbitrary sequences of bytes with no fixed length limit. Unlike many databases, ClickHouse does not have separate VARCHAR, TEXT, or BLOB types - String handles all of them. It is used for everything from short codes and labels to long log messages and JSON payloads. Understanding how String works in ClickHouse, including its UTF-8 awareness, compression behavior, and available functions, will help you design efficient schemas and write effective queries.

## How String Storage Works

ClickHouse stores String columns using variable-length encoding. Each value is stored as its actual byte content prefixed by its length. Strings are not null-terminated and can contain any byte sequence including null bytes (`\0`). The column is compressed at the block level, so repetitive string data compresses very well.

There is no maximum length enforced by the type itself - but keeping strings short improves performance. For fixed-length strings like hash digests or codes, consider `FixedString(N)` instead.

## Creating Tables with String Columns

```sql
CREATE TABLE web_requests
(
    request_id   UInt64,
    method       String,
    path         String,
    user_agent   String,
    ip_address   String,
    response_body String,
    created_at   DateTime
)
ENGINE = MergeTree()
ORDER BY (created_at, request_id);
```

## Inserting String Data

```sql
INSERT INTO web_requests
    (request_id, method, path, user_agent, ip_address, response_body, created_at) VALUES
(1, 'GET',  '/api/users', 'Mozilla/5.0 (Macintosh)', '10.0.0.1', '{"status":"ok"}',       '2026-03-31 10:00:00'),
(2, 'POST', '/api/login', 'curl/7.68.0',             '10.0.0.2', '{"token":"abc123"}',     '2026-03-31 10:01:00'),
(3, 'GET',  '/health',    'kube-probe/1.26',          '10.0.0.3', 'OK',                     '2026-03-31 10:02:00');
```

## UTF-8 Handling

ClickHouse String is byte-string aware, not character-aware by default. Standard functions like `length()` return byte length, not character count. For Unicode-aware operations, use the `lengthUTF8`, `upperUTF8`, `lowerUTF8`, and `substringUTF8` variants.

```sql
SELECT
    '日本語'                   AS text,
    length('日本語')           AS byte_length,
    lengthUTF8('日本語')       AS char_length,
    lowerUTF8('Hello World')   AS lower_utf8,
    upperUTF8('hello')         AS upper_utf8;
```

## Common String Functions

### Searching and Matching

```sql
SELECT
    path,
    positionCaseInsensitive(path, 'api')     AS api_position,
    startsWith(path, '/api')                 AS is_api_path,
    endsWith(path, 'login')                  AS is_login,
    match(user_agent, 'Mozilla|curl')        AS is_browser_or_curl
FROM web_requests;
```

### Extracting Substrings

```sql
SELECT
    path,
    substring(path, 1, 4)                        AS first_4_bytes,
    substringUTF8(path, 2, 10)                   AS chars_2_to_11,
    extractAll(path, '[a-z]+')                   AS path_segments
FROM web_requests;
```

### String Transformation

```sql
SELECT
    method,
    lower(method)                                AS method_lower,
    upper(method)                                AS method_upper,
    replaceAll(path, '/api/', '/v2/')             AS updated_path,
    trim(BOTH ' ' FROM '  hello world  ')        AS trimmed,
    concat(method, ' ', path)                    AS full_request
FROM web_requests;
```

## Splitting and Joining Strings

```sql
-- Split a path into segments
SELECT
    path,
    splitByChar('/', path)            AS path_parts,
    arrayJoin(splitByChar('/', path)) AS each_segment
FROM web_requests;

-- Join strings with a separator
SELECT arrayStringConcat(['a', 'b', 'c'], ',') AS joined;
```

## Working with JSON Stored as String

ClickHouse has built-in JSON extraction functions for String columns containing JSON.

```sql
SELECT
    request_id,
    response_body,
    JSONExtractString(response_body, 'status')  AS status,
    JSONExtractString(response_body, 'token')   AS token,
    isValidJSON(response_body)                  AS valid_json
FROM web_requests;
```

## Pattern Matching with LIKE and ilike

```sql
SELECT
    path,
    method
FROM web_requests
WHERE path LIKE '/api/%'
  AND user_agent ILIKE '%mozilla%';
```

## String Aggregation

```sql
-- Collect all paths per method
SELECT
    method,
    groupArray(path) AS paths,
    count()          AS request_count
FROM web_requests
GROUP BY method;
```

## Summary

ClickHouse's String type is a flexible, variable-length byte array with no maximum length restriction. It handles UTF-8 text, binary data, and JSON payloads equally well. For Unicode-aware operations, use the UTF8-suffixed function variants. String columns compress well in columnar storage, making them practical for log messages and free-form text at scale. When storing fixed-length data like hashes or codes, consider FixedString(N) for more predictable storage layout and comparison performance.
