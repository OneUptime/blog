# Validation Summary: How to Use base58Encode() and base58Decode() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- ClickHouse SQL
- Base58 encoding (Bitcoin alphabet)
- `base58Encode()`, `base58Decode()`, `tryBase58Decode()` string functions
- `MergeTree` table engine
- `MD5`, `hex`, `base64Encode`, `reinterpretAsString`, `numbers()` table function

## Sources Consulted
- ClickHouse string-functions documentation: https://clickhouse.com/docs/sql-reference/functions/string-functions (confirmed signatures of `base58Encode`, `base58Decode`, `tryBase58Decode`; confirmed `tryBase58Decode` returns empty string on error)
- Standard Bitcoin Base58 alphabet specification (`123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz`)
- Independent Python reference implementation of Base58 used to verify all encoded sample outputs (cross-checked against the documented `base58Encode('Encoded') = '3dc8KtHrwM'` example from ClickHouse docs)

## Issues Found
1. **Wrong encoded output for `base58Encode('ClickHouse')`** — the post showed `3zFSuvJUAaB3` (12 chars), which is not even long enough to represent a 10-byte input. Replaced with the correct value `4nhk8K7GHXf6zx`. The matching `base58Decode('3zFSuvJUAaB3')` example was updated to use the corrected encoded string.
2. **Wrong encoded output for `base58Encode('1234567890')`** — the post showed `3mJoB3Kp6PvXFr`. Replaced with the correct value `3mJr7AoUCHxNqd`.
3. **Wrong encoded outputs for `base58Encode('user:0')` … `base58Encode('user:4')`** — the post showed `2mf7Gi`–`2mf7Gn`, which are too short for a 6-byte input. Replaced with the correct values `21VFSb7y9`–`21VFSb7yD`.
4. **Misleading `tryBase58Decode('ValidBase58Str')` example** — the string `ValidBase58Str` contains the character `l`, which is excluded from the Base58 alphabet, so it would also fail and return an empty string. Replaced with `tryBase58Decode('9Ajdvzr')`, which is genuinely valid Base58 and decodes to `Hello`. The accompanying expected output was updated accordingly.

## Review Notes
- The function signatures, alphabet, behavior of `tryBase58Decode` (empty string on error), and the MD5/hex length comparison (16-byte MD5 → ~22 Base58 chars vs 32 hex chars) were all verified correct.
- The general claim that "Base58 is more compact than hex but slightly longer than Base64" is accurate as a rule of thumb (Base58 ~1.37× vs Base64 ~1.33×), but for the specific 16-byte input "ClickHouse rules" used in the comparison snippet, Base58 actually comes out shorter than padded Base64 (22 vs 24 chars). Left as-is since the general statement is correct and the post does not assert specific lengths for that example.
- The post claims both functions accept `String` or `FixedString`; the official docs only document `String`. `FixedString` may work in practice, but readers relying strictly on documented behavior should treat `String` as the canonical input type. Left as-is.
- The Bitcoin-style address `1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf` used in the IPFS/Bitcoin example is the genesis address with the trailing checksum bytes stripped; `base58Decode` will succeed but the resulting bytes are not a complete Bitcoin payload. This is acceptable for the inspection use case shown.
