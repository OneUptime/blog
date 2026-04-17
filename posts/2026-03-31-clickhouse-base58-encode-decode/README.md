# How to Use base58Encode() and base58Decode() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Encoding, base58Encode, base58Decode, String Function

Description: Learn how to use base58Encode() and base58Decode() in ClickHouse to encode binary data in the Bitcoin Base58 alphabet and decode it back for compact, human-friendly identifiers.

---

Base58 is an encoding scheme used by Bitcoin and other systems to represent binary data in a compact, human-readable form. It uses a 58-character alphabet that omits visually ambiguous characters (`0`, `O`, `I`, `l`), making encoded strings easier to read and transcribe. ClickHouse provides `base58Encode()` and `base58Decode()` for working with this encoding natively in SQL.

## How Base58 Encoding Works

```mermaid
graph LR
    A[Binary / String] -->|base58Encode()| B[Base58 String]
    B -->|base58Decode()| A
```

The Base58 alphabet used by ClickHouse follows the Bitcoin standard:

```text
123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz
```

## Syntax

```sql
base58Encode(string)
base58Decode(base58_string)
```

Both functions accept a `String` or `FixedString` argument and return a `String`. `base58Decode()` raises an error if the input contains characters outside the Base58 alphabet.

## Basic Examples

### Encoding a Simple String

```sql
SELECT
    base58Encode('Hello')        AS encoded_hello,
    base58Encode('ClickHouse')   AS encoded_ch,
    base58Encode('1234567890')   AS encoded_digits;
```

```text
encoded_hello | encoded_ch     | encoded_digits
--------------+----------------+----------------
9Ajdvzr       | 4nhk8K7GHXf6zx | 3mJr7AoUCHxNqd
```

### Decoding Back

```sql
SELECT
    base58Decode('9Ajdvzr')          AS decoded_hello,
    base58Decode('4nhk8K7GHXf6zx')   AS decoded_ch;
```

```text
decoded_hello | decoded_ch
--------------+------------
Hello         | ClickHouse
```

### Round-Trip Verification

```sql
SELECT
    base58Decode(base58Encode('test string')) = 'test string' AS roundtrip_ok;
```

```text
roundtrip_ok
------------
1
```

## Complete Working Example

This example creates a table that stores short identifiers as Base58-encoded values, inserts rows, and demonstrates encoding and decoding in queries.

```sql
CREATE TABLE identifiers
(
    id          UInt32,
    raw_key     String,
    encoded_key String
)
ENGINE = MergeTree()
ORDER BY id;

INSERT INTO identifiers (id, raw_key, encoded_key)
SELECT
    number,
    concat('user:', toString(number)),
    base58Encode(concat('user:', toString(number)))
FROM numbers(5);

SELECT
    id,
    raw_key,
    encoded_key,
    base58Decode(encoded_key) AS decoded_back
FROM identifiers
ORDER BY id;
```

```text
id | raw_key | encoded_key | decoded_back
---+---------+-------------+-------------
0  | user:0  | 21VFSb7y9   | user:0
1  | user:1  | 21VFSb7yA   | user:1
2  | user:2  | 21VFSb7yB   | user:2
3  | user:3  | 21VFSb7yC   | user:3
4  | user:4  | 21VFSb7yD   | user:4
```

## Encoding Binary Hashes

A common use case is encoding hash digests (which are binary strings) as Base58 for compact, URL-safe identifiers.

```sql
SELECT
    hex(MD5('some-data'))              AS md5_hex,
    base58Encode(MD5('some-data'))     AS md5_base58,
    length(base58Encode(MD5('some-data'))) AS base58_length,
    length(hex(MD5('some-data')))         AS hex_length;
```

Base58 encoding of a 16-byte MD5 hash produces around 22 characters, compared to 32 characters in hex, making it more compact.

## Error Handling for Invalid Input

`base58Decode()` will throw an error if the input contains characters not in the Base58 alphabet. Use `tryBase58Decode()` to return an empty string instead of raising an error.

```sql
-- Safe decoding - returns empty string for invalid input
SELECT
    tryBase58Decode('9Ajdvzr')      AS valid_result,
    tryBase58Decode('Invalid0OIl')  AS invalid_result;
```

```text
valid_result | invalid_result
-------------+---------------
Hello        | (empty string)
```

## Practical Use Cases

### Short URL Tokens

Base58 encoding is commonly used to generate short, readable tokens for URLs. You can encode a numeric ID or hash to produce a compact token.

```sql
SELECT
    number           AS user_id,
    base58Encode(reinterpretAsString(toUInt64(number + 100000))) AS short_token
FROM numbers(5);
```

### Distributed System Identifiers

Systems using content-addressed storage (like IPFS) use Base58 for content identifiers. ClickHouse can decode these identifiers for analytics.

```sql
-- Decode a Bitcoin-style address prefix for inspection
SELECT base58Decode('1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf') AS genesis_bytes_raw;
```

### Comparing Encoding Schemes

```sql
SELECT
    'ClickHouse rules'                     AS original,
    base64Encode('ClickHouse rules')       AS base64_encoded,
    base58Encode('ClickHouse rules')       AS base58_encoded,
    hex('ClickHouse rules')                AS hex_encoded,
    length(base64Encode('ClickHouse rules')) AS base64_len,
    length(base58Encode('ClickHouse rules')) AS base58_len,
    length(hex('ClickHouse rules'))          AS hex_len;
```

This shows that Base58 is more compact than hex but slightly longer than Base64, with the advantage of having no ambiguous characters or padding.

## Summary

`base58Encode()` and `base58Decode()` in ClickHouse provide efficient Base58 encoding using the Bitcoin alphabet. They are useful for generating compact identifiers from binary data such as hash digests, for interoperability with blockchain systems, and for creating human-friendly short tokens. Use `tryBase58Decode()` when decoding untrusted input to avoid query failures from invalid characters.
