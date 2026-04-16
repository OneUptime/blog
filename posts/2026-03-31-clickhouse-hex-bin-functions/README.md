# How to Use hex(), unhex(), bin(), unbin() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Encoding, HEX, bin, String Function

Description: Learn how to use hex(), unhex(), bin(), and unbin() in ClickHouse to convert numbers and strings to hexadecimal or binary representations and decode them back.

---

ClickHouse provides four encoding functions for converting numeric and string values into hexadecimal or binary text representations and decoding them back. These functions are useful for debugging binary data, formatting hash outputs, network address manipulation, and protocol-level encoding tasks.

## How the Functions Work

```mermaid
graph LR
    A[Integer or String] -->|hex()| B[Hex String]
    B -->|unhex()| A
    A -->|bin()| C[Binary String]
    C -->|unbin()| A
```

- `hex(value)` - converts an integer or string to an uppercase hexadecimal string
- `unhex(hex_string)` - converts a hexadecimal string back to a binary string
- `bin(value)` - converts an integer or string to a binary (0/1 digits) string
- `unbin(bin_string)` - converts a binary string back to its original bytes

## Syntax

```sql
hex(value)
unhex(hex_string)
bin(value)
unbin(bin_string)
```

All four functions accept `String`, `FixedString`, or integer types. They return `String`.

## hex() and unhex() Examples

### Basic Integer Encoding

Converting integers to hexadecimal is useful for formatting hash values and protocol bytes.

```sql
SELECT
    hex(0)     AS zero_hex,
    hex(10)    AS ten_hex,
    hex(255)   AS ff_hex,
    hex(65535) AS ffff_hex;
```

```text
zero_hex | ten_hex | ff_hex | ffff_hex
---------+---------+--------+---------
00       | 0A      | FF     | FFFF
```

### String to Hex

When passed a string, `hex()` encodes each byte as two uppercase hex characters.

```sql
SELECT
    hex('A')        AS letter_A,
    hex('hello')    AS hello_hex,
    hex('ClickHouse') AS ch_hex;
```

```text
letter_A | hello_hex  | ch_hex
---------+------------+-------------------
41       | 68656C6C6F | 436C69636B486F757365
```

### Reversing with unhex()

`unhex()` takes a hex string (each pair of characters represents one byte) and returns the corresponding binary string.

```sql
SELECT
    unhex('68656C6C6F') AS decoded,
    hex(unhex('436C69636B486F757365')) AS roundtrip;
```

```text
decoded | roundtrip
--------+--------------------
hello   | 436C69636B486F757365
```

## bin() and unbin() Examples

### Integer to Binary

`bin()` converts an integer to a string of `0` and `1` digits. ClickHouse always prints eight digits per byte (omitting leading zero bytes), so the output length is a multiple of 8.

```sql
SELECT
    bin(0)   AS zero_bin,
    bin(1)   AS one_bin,
    bin(5)   AS five_bin,
    bin(255) AS ff_bin;
```

```text
zero_bin | one_bin  | five_bin | ff_bin
---------+----------+----------+----------
00000000 | 00000001 | 00000101 | 11111111
```

### String to Binary

When applied to a string, `bin()` encodes each character byte as 8 binary digits concatenated together.

```sql
SELECT bin('A') AS letter_A_bin, bin('hi') AS hi_bin;
```

```text
letter_A_bin | hi_bin
-------------+------------------
01000001     | 0110100001101001
```

### Decoding with unbin()

`unbin()` converts a binary digit string back to the original bytes.

```sql
SELECT
    unbin('01000001')          AS letter_A,
    unbin('0110100001101001')  AS hi_word;
```

```text
letter_A | hi_word
---------+--------
A        | hi
```

## Complete Working Example

This example creates a table that stores binary payloads as hex strings, inserts some rows, and demonstrates encoding and decoding.

```sql
CREATE TABLE encoded_data
(
    id         UInt32,
    label      String,
    payload    String
)
ENGINE = MergeTree()
ORDER BY id;

INSERT INTO encoded_data VALUES
    (1, 'greeting',  hex('Hello, World!')),
    (2, 'number',    hex(12345)),
    (3, 'protocol',  hex(0xDEADBEEF));

SELECT
    id,
    label,
    payload                    AS hex_encoded,
    unhex(payload)             AS decoded_string,
    bin(reinterpretAsUInt8(substring(unhex(payload), 1, 1))) AS first_byte_binary
FROM encoded_data
ORDER BY id;
```

## Practical Use Cases

### Formatting MD5 / SHA Hash Output

Hash functions in ClickHouse return raw binary strings. Use `hex()` to make them human-readable.

```sql
SELECT
    hex(MD5('clickhouse'))    AS md5_hex,
    hex(SHA256('clickhouse')) AS sha256_hex;
```

### Network Address Encoding

IPv4 addresses can be stored as UInt32 and formatted as hex for compact representation.

```sql
SELECT
    toIPv4('192.168.1.1')              AS ip,
    hex(toUInt32(toIPv4('192.168.1.1'))) AS ip_hex;
```

### UUID Handling

UUIDs are 128-bit values. `hex()` and `unhex()` help when working with raw UUID bytes from external systems.

```sql
SELECT
    generateUUIDv4()              AS uuid_val,
    replaceAll(toString(generateUUIDv4()), '-', '') AS uuid_no_dashes;
```

## Differences Between hex() and bin()

The table below summarizes the key differences.

```text
Function | Input         | Output format     | Output for value 65
---------+---------------+-------------------+--------------------
hex()    | Int/String    | Uppercase hex     | 41
unhex()  | Hex string    | Binary String     | A
bin()    | Int/String    | Binary digits     | 01000001
unbin()  | Binary string | Binary String     | A
```

## Summary

`hex()` and `unhex()` provide hexadecimal encoding and decoding for integers and strings, making them ideal for formatting hash digests, UUIDs, and binary protocol data. `bin()` and `unbin()` serve the same purpose using binary digit strings, which is useful when inspecting individual bits or working with bit-level protocols. Both pairs of functions are available in all ClickHouse query contexts and work with string and integer types.
