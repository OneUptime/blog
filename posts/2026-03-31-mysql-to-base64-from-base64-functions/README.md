# How to Use TO_BASE64() and FROM_BASE64() Functions in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, String Function, Database

Description: Learn how MySQL's TO_BASE64() and FROM_BASE64() functions encode and decode Base64 strings, with practical use cases for data storage and transport.

---

## What are TO_BASE64() and FROM_BASE64()?

MySQL provides two complementary functions for Base64 encoding and decoding:

- `TO_BASE64(str)` - encodes a string or binary value to its Base64 representation
- `FROM_BASE64(str)` - decodes a Base64-encoded string back to its original value

These functions are available in MySQL 5.6.1 and later. They are useful for encoding binary data, obfuscating values in URLs, or storing compact representations of structured data.

The syntax is:

```sql
TO_BASE64(str)
FROM_BASE64(str)
```

## Basic Examples

```sql
SELECT TO_BASE64('Hello, World!');
-- Result: SGVsbG8sIFdvcmxkIQ==

SELECT FROM_BASE64('SGVsbG8sIFdvcmxkIQ==');
-- Result: Hello, World!
```

## Round-Trip Encoding

```sql
SELECT FROM_BASE64(TO_BASE64('MySQL Base64 test'));
-- Result: MySQL Base64 test
```

## Encoding Binary Data

`TO_BASE64()` works on any string or binary column:

```sql
SELECT TO_BASE64(profile_image) AS encoded_image
FROM users
WHERE id = 42;
```

This is useful when you need to serialize a BLOB for transport over a text-only channel.

## Storing Encoded Values

You can store Base64-encoded secrets or tokens and decode them on retrieval:

```sql
INSERT INTO api_keys (user_id, encoded_key)
VALUES (1, TO_BASE64('sk_live_abc123xyz'));

SELECT
  user_id,
  FROM_BASE64(encoded_key) AS raw_key
FROM api_keys
WHERE user_id = 1;
```

Note: Base64 is encoding, not encryption. Do not use it as a security measure for sensitive data.

## Using with BLOB Columns

```sql
CREATE TABLE file_storage (
  id INT AUTO_INCREMENT PRIMARY KEY,
  filename VARCHAR(255),
  content LONGBLOB
);

INSERT INTO file_storage (filename, content)
VALUES ('config.json', FROM_BASE64('eyJrZXkiOiAidmFsdWUifQ=='));

SELECT filename, TO_BASE64(content) AS base64_content
FROM file_storage;
```

## NULL Handling

Both functions return `NULL` when given a `NULL` input:

```sql
SELECT TO_BASE64(NULL);
-- Result: NULL

SELECT FROM_BASE64(NULL);
-- Result: NULL
```

## Checking if a Column is Valid Base64

You can use `FROM_BASE64()` to attempt decoding and use `LENGTH()` to validate:

```sql
SELECT
  token,
  LENGTH(FROM_BASE64(token)) AS decoded_length
FROM session_tokens
WHERE FROM_BASE64(token) IS NOT NULL;
```

## Use in URL Token Generation

For short-lived tokens stored in the database, Base64 encoding provides a compact text representation suitable for transport:

```sql
SELECT
  user_id,
  TO_BASE64(CONCAT(user_id, ':', UNIX_TIMESTAMP(), ':reset')) AS reset_token
FROM users
WHERE email = 'user@example.com';
```

Decode on verification:

```sql
SELECT FROM_BASE64('dXNlcjoxNzAwMDAwMDAwOnJlc2V0') AS decoded_token;
```

## MySQL vs Standard Base64

MySQL's `TO_BASE64()` follows RFC 2045 (MIME) encoding, inserting a newline (`\n`) every 76 characters. This differs from URL-safe Base64 encoders. If you need URL-safe Base64 without newlines, post-process with `REPLACE()`:

```sql
SELECT REPLACE(REPLACE(REPLACE(TO_BASE64('test string'), '\n', ''), '+', '-'), '/', '_') AS url_safe;
```

## Summary

`TO_BASE64()` and `FROM_BASE64()` provide a simple way to Base64-encode and decode strings and binary data in MySQL. They are useful for serializing BLOB columns, generating compact tokens, and preparing binary content for text transport. Remember that Base64 is encoding only - not encryption - and that MySQL's implementation inserts newlines every 76 characters per RFC 2045.
