# Validation Summary: How to Use decodeURLComponent() and encodeURLComponent() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- ClickHouse SQL
- ClickHouse URL functions (`decodeURLComponent`, `encodeURLComponent`, `extractURLParameter`, `path`)
- Percent-encoding (RFC 3986)
- UTF-8 encoding

## Sources Consulted
- ClickHouse official URL functions documentation: https://clickhouse.com/docs/en/sql-reference/functions/url-functions
- RFC 3986 (Uniform Resource Identifier — Generic Syntax) for unreserved character set

## Issues Found
No technical issues found.

Verification notes:
- `decodeURLComponent(URL)` and `encodeURLComponent(URL)` are valid ClickHouse functions with behavior matching the description.
- `extractURLParameter(URL, name)` and `path(URL)` are valid URL helper functions.
- All percent-encoding outputs in the examples are correct:
  - `hello world` → `hello%20world` ✓
  - `price: $100` → `price%3A%20%24100` (`:`→`%3A`, ` `→`%20`, `$`→`%24`) ✓
  - `user@example.com` → `user%40example.com` (`.` is unreserved) ✓
  - `path/to/resource` → `path%2Fto%2Fresource` ✓
  - `caf%C3%A9` → `café` (UTF-8 C3 A9) ✓
  - `search%3Fq%3Dclick%2Bhouse` → `search?q=click+house` ✓
- Round-trip examples are valid: encoding then decoding returns the original string for the given inputs.
- Double-encoding detection logic (checking for `%25` and comparing once vs twice decoded) is sound.
- The unreserved character set described (letters, digits, `-`, `_`, `.`, `~`) matches RFC 3986.

## Review Notes
- The intro phrasing "`%C3%A9` with `e` (with accent)" is slightly awkward — it refers to `é`, which is correctly shown in the expected output (`café`). Not technically wrong, so left unchanged.
- The ClickHouse docs do not enumerate the exact unencoded character set for `encodeURLComponent`, but the RFC 3986 unreserved set described in the post is a reasonable and accurate-enough description for tutorial purposes.
- The `decodeURLComponent(decodeURLComponent(url))` pattern in the double-encoding section could error on malformed input in edge cases, but is adequate for the illustrative purpose.
