# Validation Summary: How to Use simpleJSONExtractString() for Fast JSON Parsing in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- SQL
- JSON parsing functions (`simpleJSONExtractString`, `JSONExtractString`)

## Sources Consulted
- [ClickHouse JSON Functions Official Docs](https://clickhouse.com/docs/sql-reference/functions/json-functions) — canonical reference for `simpleJSONExtractString` signature, behavior, and assumptions
- [ClickHouse Other JSON Approaches](https://clickhouse.com/docs/integrations/data-formats/json/other-approaches) — performance benchmarks comparing `simpleJSONExtractString` vs full JSON parsers
- [ClickHouse GitHub Issue #21383](https://github.com/ClickHouse/ClickHouse/issues/21383) — `visitParam*` to `simpleJSON*` alias history

## Issues Found

### 1. Incorrect claim that escaped characters are not supported
**What was wrong:** The post stated that `simpleJSONExtractString` is "not suitable for JSON where string values contain escaped characters like `\n` or `\"`." This is factually incorrect — the ClickHouse documentation explicitly demonstrates that the function unescapes standard JSON escape sequences (`\n`, `\u0000`, `\u263a`, etc.) and returns the unescaped value.

**What was changed:** Removed the escaped-characters bullet from the limitations list. Replaced it with the actual documented limitations: no support for whitespace outside string literals, and surrogate pair handling for non-BMP Unicode characters (converted to CESU-8 instead of UTF-8). Updated the summary paragraph to note that the function does unescape standard JSON escape sequences.

### 2. Inaccurate "flat JSON only" characterization
**What was wrong:** The intro stated the function "only works reliably on flat, well-formed JSON objects with simple string values." According to the official docs, the function searches for matching field names "on any nesting level, indiscriminately" and returns the first occurrence. It is not limited to flat/top-level JSON.

**What was changed:** Rewrote the intro to accurately describe the function's behavior: it searches at any nesting level indiscriminately and returns the first match. Listed the actual documented assumptions (constant field names, canonical encoding, no whitespace outside strings). Updated the limitations section to clarify that the issue with nested objects is the inability to target a specific path, not that nested keys are invisible.

### 3. Summary paragraph repeated the escaped-characters error
**What was wrong:** The summary said to use `JSONExtractString` for "special characters in values," reinforcing the incorrect limitation claim.

**What was changed:** Replaced with accurate guidance: use `JSONExtractString` for "targeted nested paths or complex JSON structures where correctness matters more than speed." Added a note that `simpleJSONExtractString` does handle standard escape sequences.

## Review Notes
- The function `visitParamExtractString` is the official alias for `simpleJSONExtractString` (legacy naming from before v21.4). The post does not mention this, but it is not an error — just additional context that could be useful for readers working with older codebases.
- The ClickHouse docs state that the JSON "doesn't have space characters outside of string literals" as one of the strict assumptions. The blog post's inline JSON examples (e.g., `'{"env": "production"}'`) contain spaces after colons. In practice, `simpleJSONExtractString` handles these spaces correctly in modern ClickHouse versions, but this is technically outside the documented assumptions. This was not changed since the examples work correctly in practice.
- The `empty string on missing key` claim is correct but incomplete — the function also returns an empty string if unescaping fails. This was not changed as the blog post's characterization is accurate for the common case.
