# Validation Summary: How to Use splitByChar() and splitByString() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL analytical database)
- ClickHouse string splitting functions: `splitByChar()`, `splitByString()`, `splitByRegexp()`
- ClickHouse array functions: `arrayFilter()`, `arrayJoin()`, `arrayReverse()`, `arrayStringConcat()`, `has()`, `length()`

## Sources Consulted
- ClickHouse official documentation — Splitting and Merging Functions: https://clickhouse.com/docs/en/sql-reference/functions/splitting-merging-functions

## Issues Found
1. **Incorrect claim about `splitByString()` with an empty separator (line 189):**
   - **What was wrong:** The post stated that `splitByString()` with an empty separator "returns the input unchanged in a single-element array rather than splitting on every character." It then recommended using `splitByRegexp('.', str)` for per-character splitting.
   - **What was changed:** Corrected to state that `splitByString()` with an empty separator splits the string into an array of individual characters (e.g., `splitByString('', 'abc')` returns `['a', 'b', 'c']`). Removed the incorrect `splitByRegexp('.')` recommendation, since the regex `.` matches every character as a delimiter and would produce an array of empty strings, not individual characters.
   - **Why:** The ClickHouse documentation explicitly states: "If the string separator is empty, it will split the string s into an array of single characters." The documented example `splitByString('', 'abcde')` returns `['a','b','c','d','e']`.

## Review Notes
- All other code examples, function signatures, return types, edge case behaviors, and array function usages are technically correct.
- The `splitByChar` separator requirement (exactly one character), consecutive-delimiter behavior (empty strings), and `Array(String)` return type are all accurate per official documentation.
- Array indexing examples correctly use ClickHouse's 1-based indexing.
- The `arrayFilter(x -> x != '', ...)` pattern for removing empty strings is idiomatic and correct.
- The post could mention the optional `max_substrings` parameter accepted by both functions, but omitting it is reasonable for the tutorial's scope.
