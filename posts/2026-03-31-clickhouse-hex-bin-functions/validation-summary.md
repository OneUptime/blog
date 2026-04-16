# Validation Summary: How to Use hex(), unhex(), bin(), unbin() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse SQL
- Encoding functions: `hex()`, `unhex()`, `bin()`, `unbin()`
- Related ClickHouse functions: `MD5`, `SHA256`, `toIPv4`, `toUInt32`, `generateUUIDv4`, `reinterpretAsUInt8`, `substring`, `replaceAll`

## Sources Consulted
- ClickHouse official documentation: https://clickhouse.com/docs/sql-reference/functions/encoding-functions
- Verified by running queries against the actual ClickHouse binary (clickhouse-local) downloaded from https://clickhouse.com/

## Issues Found

The post originally claimed that `hex()` and `bin()` return outputs without padding for small integer values. Per the official documentation and verified empirically, ClickHouse always prints both hex digits per byte, and always prints eight binary digits per byte (leading zero bytes within the value's type width are omitted, but the most significant remaining byte is fully padded).

Specific corrections made:

1. **Integer hex example table (line ~56)**: Original showed `hex(0) = 0` and `hex(10) = A`. Corrected to `hex(0) = 00` and `hex(10) = 0A`. Verified with `clickhouse-local`.

2. **Integer bin example table (line ~109)**: Original showed `bin(0) = 0`, `bin(1) = 1`, `bin(5) = 101`. Corrected to `bin(0) = 00000000`, `bin(1) = 00000001`, `bin(5) = 00000101`. Adjusted column widths to fit the wider values. Verified with `clickhouse-local`.

3. **Description preceding integer-to-binary section**: Original stated "The output length varies with the value." Updated to clarify that ClickHouse pads to eight digits per byte, so the length is a multiple of 8.

4. **Differences table (line ~212)**: `bin()` for value 65 showed `1000001`. Corrected to `01000001`. Verified with `clickhouse-local`.

## Review Notes

- The string-input examples (`hex('A') = 41`, `hex('hello') = 68656C6C6F`, `bin('A') = 01000001`, etc.) were all verified correct.
- The `unhex()` and `unbin()` round-trip examples were verified.
- The `CREATE TABLE` example with `hex('Hello, World!')`, `hex(12345)`, and `hex(0xDEADBEEF)` was executed end-to-end and runs as described.
- The use-case examples (`MD5`, `SHA256`, `toIPv4`/`toUInt32`/`hex`, `generateUUIDv4`/`replaceAll`) were verified to execute.
- One minor stylistic note (not changed): the `unhex()` and `unbin()` "Output format" column in the differences table calls the result a "Binary String", which is correct terminology in ClickHouse (return type is `String` containing raw bytes), though some readers may misread "Binary String" as the binary-digit output of `bin()`. The author's wording was preserved.
