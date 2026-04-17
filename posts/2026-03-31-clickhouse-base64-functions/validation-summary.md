# Validation Summary: How to Use base64Encode() and base64Decode() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- ClickHouse SQL string functions (`base64Encode`, `base64Decode`, `tryBase64Decode`, `base64URLEncode`)
- ClickHouse hash functions (`MD5`, `hex`)
- Base64 encoding (RFC 4648)

## Sources Consulted
- ClickHouse official string functions documentation: https://clickhouse.com/docs/en/sql-reference/functions/string-functions
- RFC 4648 (The Base16, Base32, and Base64 Data Encodings), specifically section 4 (standard alphabet) and section 5 (URL-safe alphabet)
- Manual base64 encoding verification of each example string in the round-trip table

## Issues Found
- **"Encoding Composite Keys for External Systems" used the wrong function.** The original section claimed that `base64Encode` produced "URL-safe identifiers", which is incorrect. Standard `base64Encode` uses the RFC 4648 §4 alphabet (`+`, `/`, `=`), all of which have reserved meaning in URLs. ClickHouse provides `base64URLEncode` (RFC 4648 §5, using `-` and `_`) for this exact use case. Updated the example to use `base64URLEncode` and added a one-sentence explanation of why standard base64 is not URL-safe.

## Review Notes
- All four base64 strings in the round-trip table were manually verified byte-by-byte and are correct (`aGVsbG8gd29ybGQ=`, `T25lVXB0aW1lIG1vbml0b3Jpbmc=`, `dXNlcjpwYXNzd29yZA==`, `QmVhcmVyIGV5SmhiR2NpT2lKSVV6STFOaUo5`).
- `base64Encode` accepting a `FixedString(16)` (the return type of `MD5`) is supported — the docs explicitly list "String or FixedString" as the input type, so the avatar-hash example is valid.
- `tryBase64Decode` returning an empty string on invalid input matches current ClickHouse behavior.
- Future enhancement (not a correction): the post could mention `tryBase64URLDecode` as the safe counterpart to `base64URLDecode`, for symmetry with the `tryBase64Decode` section.
