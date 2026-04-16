# Validation Summary: How to Use isValidUUID() in ClickHouse

## Status
not-technically-relevant

## Post Type
Tutorial / Reference guide (for a non-existent function)

## Technologies Covered
- ClickHouse (purported `isValidUUID()` function)
- ClickHouse SQL (`toUUID`, `if`, `MergeTree`, `count`, `WHERE`)
- UUID format (8-4-4-4-12 hex string)

## Sources Consulted
- ClickHouse official UUID functions documentation: https://clickhouse.com/docs/sql-reference/functions/uuid-functions
- ClickHouse official type conversion functions: https://clickhouse.com/docs/en/sql-reference/functions/type-conversion-functions
- ClickHouse official string search functions: https://clickhouse.com/docs/sql-reference/functions/string-search-functions
- ClickHouse official "other functions" reference: https://clickhouse.com/docs/sql-reference/functions/other-functions
- PostHog ClickHouse supported functions reference: https://posthog.com/docs/sql/clickhouse-functions
- ClickHouse GitHub source (code search): https://github.com/ClickHouse/ClickHouse

## Issues Found
The entire post documents a function — `isValidUUID()` — that does not exist in ClickHouse.

Verification performed:
- The official ClickHouse UUID-functions reference page lists only: `UUIDNumToString`, `UUIDStringToNum`, `UUIDToNum`, `UUIDv7ToDateTime`, `generateUUIDv4`, `generateUUIDv7`, `dateTimeToUUIDv7`, `toUUIDOrDefault`, and `toUUIDOrNull`. No `isValidUUID` is listed.
- The function is not documented under type-conversion, string-search, or other-functions sections either.
- A GitHub code search across the `ClickHouse/ClickHouse` repository for `"isValidUUID"` (case-insensitive) returns **0 matches**, while a control search for `"toUUIDOrNull"` returns 7 matches in real source files (`src/Functions/FunctionsConversion.h`, etc.). This rules out a documentation-only gap — the symbol is simply absent from the codebase.
- The PostHog ClickHouse-functions index, which is comprehensive for production use, does not list it either.

Consequently, every SQL example in the post (`isValidUUID('550e8400-...')`, `WHERE isValidUUID(id) = 1`, the "Complete Working Example", etc.) would fail at parse time in any ClickHouse version with `Unknown function isValidUUID`. The advertised return values (`1`, `0`) and the claim that the nil UUID `00000000-0000-0000-0000-000000000000` is "valid" cannot be verified because the function does not exist.

The post is not salvageable via small edits: the title, every section, and every example are built around a fabricated function. A proper post on this topic would have to be rewritten around real ClickHouse primitives such as `toUUIDOrNull(s) IS NOT NULL`, `match(s, '^[0-9a-fA-F]{8}-...')`, or a length-and-hyphen check — that is a rewrite, not a fix, and is outside the scope of technical-correctness editing. Marking as `not-technically-relevant` for removal.

## Review Notes
- If the author wants to keep a post on this topic, the recommended replacement pattern in current ClickHouse is `toUUIDOrNull(s) IS NOT NULL` (returns `1` for parseable UUID strings, `0` otherwise) or a regex via `match(s, '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$')`.
- Tangentially: the post's `if(isValidUUID(raw_id), toUUID(raw_id), NULL)` pattern would, even with a real predicate, be more idiomatically written as `toUUIDOrNull(raw_id)` — a single call that already encodes "valid → UUID, invalid → NULL".
- The mermaid diagram and prose explanation describe a plausible behavior, but plausibility is not existence; the function still has to be in the engine.
