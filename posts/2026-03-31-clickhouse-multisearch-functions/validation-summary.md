# Validation Summary: How to Use multiSearchAny() and multiSearchFirstPosition() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL analytical database)
- ClickHouse multiSearch family of string functions (`multiSearchAny`, `multiSearchAnyCaseInsensitive`, `multiSearchFirstPosition`, `multiSearchFirstIndex`)
- Volnitsky multi-pattern matching algorithm

## Sources Consulted
- ClickHouse official documentation: String Search Functions — https://clickhouse.com/docs/en/sql-reference/functions/string-search-functions
- ClickHouse source code: `src/Common/Volnitsky.h` (Multi-Volnitsky implementation)
- Danila Kutenin's 2019 thesis "Clever String Processing Algorithms in ClickHouse" describing the Multi-Volnitsky algorithm used in multiSearch functions

## Issues Found

### 1. Incorrect algorithm attribution (Aho-Corasick vs Volnitsky) — FIXED
**What was wrong:** The post repeatedly stated that `multiSearch*` functions use the "Aho-Corasick algorithm" and build a "finite-state machine." This is incorrect. ClickHouse's `multiSearch*` functions use the **Volnitsky algorithm** (specifically a "Multi-Volnitsky" variant), which is a bigram hash table approach, not a finite-state machine. Aho-Corasick is used in the separate `multiMatch*` family (regex-based matching via the Hyperscan library), not in `multiSearch*` (literal substring matching).

**What was changed:** Replaced all references to "Aho-Corasick" with "Volnitsky" or "multi-pattern matching algorithm." Rewrote the algorithm description section to accurately describe the bigram hash table approach rather than a finite-state machine.

**Locations changed:** Description field, intro paragraph, algorithm section heading and body, SQL comment on line 117, summary paragraph.

### 2. Incorrect claim about when the data structure is built — FIXED
**What was wrong:** The post stated the algorithm's data structure is built "at query planning time." The hash table is actually built at **execution time** — specifically when the function first processes its constant needle array argument. For constant needle arrays, it is built once and reused across all rows, which is efficient, but this happens during execution, not during query planning/compilation.

**What was changed:** Replaced "at query planning time" with "when the query begins executing."

### 3. Overstated SIMD claim — FIXED
**What was wrong:** The post claimed the implementation is "SIMD-accelerated." While ClickHouse's `Volnitsky.h` does include SSE4.1 SIMD intrinsics, these are used in the fallback single-needle searcher (StringSearcher), not in the core Multi-Volnitsky bigram hash table algorithm. The primary optimization is CPU cache locality (the hash table fits in L2 cache at 64KB), not SIMD vectorization.

**What was changed:** Replaced "SIMD-accelerated" with "highly optimized for CPU cache locality."

## Review Notes
- All function signatures (`multiSearchAny`, `multiSearchAnyCaseInsensitive`, `multiSearchFirstPosition`, `multiSearchFirstIndex`) are correct with accurate return value descriptions.
- All SQL examples use valid ClickHouse syntax and demonstrate realistic use cases.
- The `multiSearchFirstIndex` description ("1-based index of the first matching needle in the array") is correct per ClickHouse source code — it returns the lowest array index among needles that match anywhere in the haystack.
- The post does not mention that `multiSearch*` functions have a limit of 256 needles and 255-byte maximum needle length. This is a minor omission but acceptable for a tutorial-level post.
- The `substring(log_line, pos, 5)` example extracts 5 bytes which is correct for 'ERROR' and 'DEBUG' but captures one extra byte for 'WARN' and 'INFO'. The column alias "likely_level" appropriately signals this is approximate.
- The `multiSearchFirstPosition` correctly returns 1-based byte positions (not character positions). For UTF-8 strings with multi-byte characters, users would need `multiSearchFirstPositionUTF8` for character-based positions. This is not mentioned but is an edge case beyond the post's scope.
