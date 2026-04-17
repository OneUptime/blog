# How to Use base64Encode() and base64Decode() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, String Function, Encoding, Security, SQL

Description: Learn how to use base64Encode() and base64Decode() in ClickHouse to encode binary data as text, handle API tokens, and decode log fields inline.

---

Base64 encoding converts arbitrary binary data into a printable ASCII string. This makes it safe to store binary content in text columns, embed it in JSON payloads, pass it through systems that only handle text, or display it in logs. ClickHouse provides `base64Encode()` and `base64Decode()` as native functions, so you can encode and decode data at query time without pulling rows into application code.

## Function Signatures

```text
base64Encode(str)   -- encodes a String to its base64 representation
base64Decode(str)   -- decodes a base64 String back to the original bytes
```

Both functions operate on `String` columns. `base64Decode` will throw an error if the input is not valid base64. Use `tryBase64Decode` when the input may be malformed - it returns an empty string instead of an error.

```text
tryBase64Decode(str)   -- returns empty string on invalid input instead of throwing
```

## Basic Encoding and Decoding

A simple round-trip demonstrates that the functions are inverses of each other.

```sql
SELECT
    original,
    base64Encode(original)                    AS encoded,
    base64Decode(base64Encode(original))      AS decoded
FROM (
    SELECT arrayJoin([
        'hello world',
        'OneUptime monitoring',
        'user:password',
        'Bearer eyJhbGciOiJIUzI1NiJ9'
    ]) AS original
)
```

```text
original                     | encoded                              | decoded
-----------------------------+--------------------------------------+-----------------------------
hello world                  | aGVsbG8gd29ybGQ=                     | hello world
OneUptime monitoring         | T25lVXB0aW1lIG1vbml0b3Jpbmc=         | OneUptime monitoring
user:password                | dXNlcjpwYXNzd29yZA==                 | user:password
Bearer eyJhbGciOiJIUzI1NiJ9 | QmVhcmVyIGV5SmhiR2NpT2lKSVV6STFOaUo5 | Bearer eyJhbGciOiJIUzI1NiJ9
```

## Encoding API Tokens for Storage

API tokens and credentials are sometimes stored as base64 in configuration tables to avoid issues with special characters in text pipelines. You can encode them at insert time using a query.

```sql
INSERT INTO api_token_store (service_name, encoded_token, created_at)
SELECT
    service_name,
    base64Encode(raw_token) AS encoded_token,
    now()                   AS created_at
FROM token_staging
```

When you need to retrieve and use the token, decode it in the SELECT.

```sql
SELECT
    service_name,
    base64Decode(encoded_token) AS raw_token
FROM api_token_store
WHERE service_name = 'payment-gateway'
```

## Decoding Base64 Fields in Log Tables

Many systems write base64-encoded payloads into structured logs. You can decode them inline without any application-layer processing.

```sql
SELECT
    event_time,
    request_id,
    base64Decode(encoded_body) AS raw_body
FROM http_request_logs
WHERE
    event_date = today()
    AND status_code >= 400
ORDER BY event_time DESC
LIMIT 50
```

## Safe Decoding with tryBase64Decode

When log data is not guaranteed to contain valid base64 (for example, some rows may have a raw JSON body instead of an encoded one), use `tryBase64Decode` to avoid query failures.

```sql
SELECT
    event_time,
    request_id,
    raw_field,
    tryBase64Decode(raw_field) AS decoded_field,
    length(tryBase64Decode(raw_field)) > 0 AS was_base64
FROM mixed_log_table
WHERE event_date = today()
LIMIT 100
```

## Storing Binary Hashes as Base64 Text

Functions like `MD5` return `FixedString(16)` (raw bytes). Base64-encoding them produces a compact, printable representation that is shorter than hex but safe in text contexts.

```sql
SELECT
    user_email,
    base64Encode(MD5(user_email)) AS avatar_hash
FROM users
LIMIT 10
```

For comparison, the hex representation of the same hash would be twice as long.

```sql
SELECT
    user_email,
    hex(MD5(user_email))          AS hex_hash,
    base64Encode(MD5(user_email)) AS base64_hash,
    length(hex(MD5(user_email)))        AS hex_len,
    length(base64Encode(MD5(user_email))) AS b64_len
FROM users
LIMIT 5
```

## Encoding Composite Keys for External Systems

When sending data to external APIs that require URL-safe identifiers, use `base64URLEncode` instead of `base64Encode`. Standard base64 uses `+` and `/`, which have special meaning in URLs; `base64URLEncode` substitutes `-` and `_` (RFC 4648 section 5) so the output can be dropped into a URL without further escaping.

```sql
SELECT
    concat(toString(tenant_id), ':', toString(event_id)) AS composite_key,
    base64URLEncode(concat(toString(tenant_id), ':', toString(event_id))) AS encoded_key
FROM events
WHERE event_date = today()
LIMIT 10
```

## Summary

`base64Encode()` converts any string or binary data to a base64 ASCII representation. `base64Decode()` reverses the operation. Use `tryBase64Decode()` when input quality is uncertain to avoid query errors on malformed values. These functions are useful for storing binary hashes compactly, encoding credentials for text pipelines, decoding log fields inline, and building encoded identifiers for external APIs - all without leaving the SQL layer.
