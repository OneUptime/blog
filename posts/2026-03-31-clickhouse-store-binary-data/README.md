# How to Store Binary Data in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Data Type, Binary, String

Description: Learn how to store binary data in ClickHouse using the String type, with hex, unhex, and base64 encoding and decoding functions.

---

ClickHouse does not have a dedicated `BLOB` or `BYTES` type. Instead, binary data is stored in `String` columns, which hold arbitrary byte sequences of any length without character-set enforcement. This design makes `String` a flexible container for raw bytes, hashes, serialized structs, or any binary payload. The key is knowing which functions to use to encode, decode, and inspect that data.

## Storing Binary Data in String Columns

A `String` column in ClickHouse is simply a length-prefixed byte array. It can hold any bytes, including null bytes and non-UTF-8 sequences. Define a column as `String` and insert binary content directly:

```sql
CREATE TABLE binary_store (
    id       UInt64,
    payload  String
) ENGINE = MergeTree()
ORDER BY id;
```

When inserting from application code via the HTTP or native interface, you can write raw bytes directly without any encoding. The driver handles serialization. For SQL-level insertion, encode the data as hex or base64.

## Using hex() and unhex()

The `hex()` function encodes a binary string as an uppercase hexadecimal string. `unhex()` decodes it back to raw bytes.

```sql
-- Encode raw bytes as hex for readable storage or display
SELECT hex('Hello');
-- Result: 48656C6C6F

-- Decode a hex string back to raw bytes
SELECT unhex('48656C6C6F');
-- Result: Hello

-- Store a binary hash as hex
INSERT INTO binary_store (id, payload)
VALUES (1, unhex('deadbeef01020304'));

-- Read it back as hex
SELECT id, hex(payload) AS payload_hex
FROM binary_store
WHERE id = 1;
-- id=1, payload_hex=DEADBEEF01020304
```

`unhex()` is the standard way to insert arbitrary binary values from SQL without dealing with escape sequences.

## Using base64Encode and base64Decode

For interoperability with systems that expect base64 (such as HTTP APIs or JSON fields), use `base64Encode()` and `base64Decode()`:

```sql
-- Encode binary payload as base64
SELECT base64Encode('binary\x00data\xff');
-- Result: YmluYXJ5AGRhdGH/

-- Decode base64 back to raw bytes
SELECT base64Decode('SGVsbG8gV29ybGQ=');
-- Result: Hello World

-- Store and retrieve base64-encoded content
INSERT INTO binary_store (id, payload)
VALUES (2, base64Decode('SGVsbG8gV29ybGQ='));

SELECT id, base64Encode(payload) AS b64
FROM binary_store
WHERE id = 2;
-- id=2, b64=SGVsbG8gV29ybGQ=
```

## Storing Cryptographic Hashes

Binary hashes (MD5, SHA-1, SHA-256) are commonly stored as raw bytes rather than hex strings to save space. A SHA-256 hash is 32 bytes as binary versus 64 bytes as a hex string.

```sql
CREATE TABLE file_hashes (
    file_path  String,
    sha256     FixedString(32)  -- 32 raw bytes
) ENGINE = MergeTree()
ORDER BY file_path;

-- Insert using unhex to convert hex digest to raw bytes
INSERT INTO file_hashes (file_path, sha256)
VALUES (
    '/data/archive.tar.gz',
    unhex('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
);

-- Query and display as hex
SELECT file_path, hex(sha256) AS sha256_hex
FROM file_hashes;
```

Using `FixedString(32)` instead of `String` for fixed-length hashes is more efficient because ClickHouse stores it without a length prefix.

## Inspecting Binary Content

Use `length()` to check byte length, and `position()` or `like` to search within binary strings:

```sql
-- Check the byte length of a payload
SELECT id, length(payload) AS byte_len
FROM binary_store;

-- Search for a byte sequence (as a literal string or unhex value)
SELECT id
FROM binary_store
WHERE position(payload, unhex('deadbeef')) > 0;
```

## Practical Pattern - Storing Protocol Buffers

A common use case is storing serialized Protocol Buffer messages as binary blobs for archival or replay:

```sql
CREATE TABLE protobuf_events (
    event_id    UUID     DEFAULT generateUUIDv4(),
    topic       String,
    proto_bytes String,  -- raw serialized protobuf
    received_at DateTime DEFAULT now()
) ENGINE = MergeTree()
ORDER BY (topic, received_at);

-- Insert via application (driver sends raw bytes directly)
-- For ad-hoc SQL testing, use base64:
INSERT INTO protobuf_events (topic, proto_bytes)
VALUES ('user.created', base64Decode('CgRKb2huEAE='));

SELECT
    event_id,
    topic,
    length(proto_bytes)  AS proto_size_bytes,
    base64Encode(proto_bytes) AS proto_b64
FROM protobuf_events
LIMIT 5;
```

## Summary

ClickHouse stores binary data in `String` (variable-length) or `FixedString(N)` (fixed-length) columns as raw byte sequences. Use `hex()` / `unhex()` for hex encoding and `base64Encode()` / `base64Decode()` for base64 encoding. For fixed-size binary payloads like cryptographic hashes, prefer `FixedString(N)` to eliminate the length prefix overhead.
