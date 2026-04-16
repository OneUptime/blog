# How to Use hex() and unhex() Functions in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Encoding, String Function, HEX, Data Transformation

Description: Learn how hex() converts integers and strings to hexadecimal representation and unhex() decodes hex strings back to binary in ClickHouse for encoding, hashing, and UUID workflows.

---

ClickHouse's `hex(value)` function converts an integer or string to its uppercase hexadecimal representation as a `String`. `unhex(hex_string)` is the inverse: it interprets each pair of hexadecimal characters as a byte and returns the resulting binary `String`. These functions are commonly used for encoding binary data, formatting hash outputs, working with UUIDs, and debugging raw byte sequences.

## Basic hex() Usage

```sql
-- Integer to hex
SELECT
    hex(0)      AS zero,
    hex(10)     AS ten,
    hex(16)     AS sixteen,
    hex(255)    AS ff,
    hex(256)    AS one_hundred,
    hex(65535)  AS ffff;
```

```text
zero  ten  sixteen  ff   one_hundred  ffff
00    0A   10       FF   0100         FFFF
```

Note: `hex()` on integers pads to the full byte width of the integer type.

```sql
-- UInt8, UInt16, UInt32, UInt64 each produce different padding widths
SELECT
    hex(toUInt8(255))   AS u8,
    hex(toUInt16(255))  AS u16,
    hex(toUInt32(255))  AS u32,
    hex(toUInt64(255))  AS u64;
```

```text
u8  u16   u32       u64
FF  00FF  000000FF  00000000000000FF
```

## hex() on Strings

When applied to a `String`, `hex()` encodes each byte as two uppercase hex characters.

```sql
-- ASCII string to hex
SELECT
    hex('Hello') AS hex_hello,
    hex('A')     AS hex_A,
    hex('0')     AS hex_zero_char;
```

```text
hex_hello     hex_A  hex_zero_char
48656C6C6F    41     30
```

## unhex() - Decoding Hex Strings

```sql
-- Decode hex back to string
SELECT
    unhex('48656C6C6F') AS decoded_hello,
    unhex('41')         AS decoded_A;
```

```text
decoded_hello  decoded_A
Hello          A
```

```sql
-- Round-trip: hex then unhex returns the original string
SELECT
    original,
    hex(original)        AS encoded,
    unhex(hex(original)) AS roundtrip
FROM (SELECT 'ClickHouse' AS original);
```

```text
original    encoded              roundtrip
ClickHouse  436C69636B486F757365  ClickHouse
```

## Working with Hash Functions

Hash functions like `MD5` and `SHA256` return binary strings; `hex()` formats them as readable hex digests.

```sql
-- SHA256 as a hex digest
SELECT
    hex(SHA256('Hello, ClickHouse!')) AS sha256_hex;
```

```text
sha256_hex
C19B2EAFAD4D1E196357279660C6E8F36307FCE2C3C56BD3E47052FCF54F7780
```

```sql
-- MD5 hex digest of a URL
SELECT
    lower(hex(MD5(url))) AS url_md5
FROM (
    SELECT 'https://clickhouse.com' AS url
);
```

## Formatting UUIDs

```sql
-- Generate a UUID and view its raw hex components
SELECT
    generateUUIDv4()       AS uuid_formatted,
    hex(toUInt128(generateUUIDv4())) AS uuid_as_hex;
```

```sql
-- Manually format a 128-bit UUID from two UInt64 halves
WITH generateUUIDv4() AS u
SELECT
    u                AS formatted_uuid,
    lower(hex(u))    AS uuid_hex_lower;
```

## Using hex() to Inspect Binary Column Data

```sql
CREATE TABLE binary_data
(
    id      UInt32,
    payload String
)
ENGINE = MergeTree()
ORDER BY id;
```

```sql
INSERT INTO binary_data VALUES
    (1, 'Hello'),
    (2, char(0, 1, 2, 3)),
    (3, char(255, 254, 253));
```

```sql
-- View raw bytes as hex for debugging
SELECT
    id,
    length(payload)  AS byte_length,
    hex(payload)     AS hex_dump
FROM binary_data
ORDER BY id;
```

```text
id  byte_length  hex_dump
1   5            48656C6C6F
2   4            00010203
3   3            FFFEFD
```

## Encoding User IDs as Fixed-Width Hex Keys

```sql
-- Produce a fixed-width hex key from a UInt32 ID for use in external systems
SELECT
    user_id,
    lower(hex(toUInt32(user_id))) AS hex_key
FROM (
    SELECT number AS user_id FROM numbers(1, 6)
);
```

```text
user_id  hex_key
1        00000001
2        00000002
3        00000003
4        00000004
5        00000005
6        00000006
```

## unhex() for Decoding Stored Hex Values

```sql
-- Decode hex-encoded payloads stored in a String column
SELECT
    id,
    hex_payload,
    unhex(hex_payload) AS decoded_payload
FROM (
    SELECT
        number AS id,
        hex(concat('message_', toString(number))) AS hex_payload
    FROM numbers(1, 4)
);
```

## Lowercase vs Uppercase

`hex()` always produces uppercase output. Use `lower()` to convert when matching against lowercase hex strings from external systems.

```sql
SELECT
    hex('Hello')         AS uppercase_hex,
    lower(hex('Hello'))  AS lowercase_hex;
```

```text
uppercase_hex  lowercase_hex
48656C6C6F     48656c6c6f
```

`unhex()` accepts both uppercase and lowercase hex digits.

```sql
SELECT
    unhex('48656c6c6f') AS from_lower,
    unhex('48656C6C6F') AS from_upper;
-- Both return 'Hello'
```

## Summary

`hex(value)` converts integers (with type-width padding) and strings (byte-by-byte) to uppercase hexadecimal strings. `unhex(hex_string)` reverses the conversion. Use `hex()` to format binary hash outputs from `MD5`, `SHA256`, and similar functions into human-readable digests, to inspect raw binary column contents, and to produce fixed-width hex identifiers. Wrap with `lower()` when your downstream system expects lowercase hex. Use `unhex()` to decode hex-encoded payloads back to binary for further processing.
