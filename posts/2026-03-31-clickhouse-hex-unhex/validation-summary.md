# Validation Summary: How to Use hex() and unhex() Functions in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse SQL
- `hex()` and `unhex()` encoding functions
- Hash functions (`MD5`, `SHA256`)
- UUID type and `generateUUIDv4()`
- `char()`, `numbers()`, `toUInt8/16/32/64/128` type functions
- MergeTree table engine (example table)

## Sources Consulted
- ClickHouse Encoding Functions reference: https://clickhouse.com/docs/en/sql-reference/functions/encoding-functions
- ClickHouse Hash Functions reference: https://clickhouse.com/docs/en/sql-reference/functions/hash-functions
- ClickHouse `numbers()` table function: https://clickhouse.com/docs/en/sql-reference/table-functions/numbers
- Local verification of SHA-256 digests via `sha256sum`

## Issues Found
1. **Incorrect SHA256 digest**: The post showed `2CF24DBA5FB0A30E26E83B2AC5B9E29E1B161E5C1FA7425E73043362938B9824` as the hex digest of `"Hello, ClickHouse!"`. That hash is actually the SHA-256 of the string `"hello"`. Even though it was labeled "example only", a misleading value next to a specific input string is a technical error. Replaced with the correct digest: `C19B2EAFAD4D1E196357279660C6E8F36307FCE2C3C56BD3E47052FCF54F7780`.

2. **`numbers(1, 6)` output missing last row**: `numbers(N, M)` generates `M` integers starting at `N` (i.e., `N..N+M-1`), so `numbers(1, 6)` produces 1..6. The expected-output block only listed rows 1–5. Added the missing sixth row (`6  00000006`).

3. **"Lowercase vs Uppercase" example did not demonstrate the claim**: The example used `hex('abc')` which yields `616263` — entirely digits with no A–F characters, so `lower()` produced identical output and the point was invisible. Changed the input to `'Hello'` so uppercase (`48656C6C6F`) and lowercase (`48656c6c6f`) are visibly different.

4. **`unhex()` case-acceptance example was a duplicate**: Both queries passed `'616263'` with labels `from_lower` and `from_upper`, so it didn't actually show `unhex()` accepting both cases (and `616263` has no case-sensitive characters anyway). Replaced with `unhex('48656c6c6f')` and `unhex('48656C6C6F')` to properly demonstrate that both cases decode to `'Hello'`.

## Review Notes
- `hex()` on `UUID` type is supported natively in current ClickHouse (listed among supported types alongside `(U)Int*`, `String`, `FixedString`, `Date`, `DateTime`, `Float*`, `Decimal`). The UUID examples therefore work without a cast, although casting to `UInt128` is also valid.
- Integer-literal padding relies on ClickHouse inferring the smallest integer type for the literal; `hex(255)` produces `"FF"` because `255` is inferred as `UInt8`. Explicit casts (as shown later in the post) are the reliable way to get predictable padding widths.
- `unhex()` silently tolerates odd-length input (last lone digit treated as the low nibble) and invalid characters — worth being aware of when handling untrusted hex input, though not necessary to cover in this introductory post.
