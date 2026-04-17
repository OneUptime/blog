# Validation Summary: How to Use cutFragment() and cutQueryString() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse SQL
- ClickHouse URL functions (`cutFragment`, `cutQueryString`, `fragment`, `protocol`, `domain`, `path`)
- ClickHouse aggregate functions (`groupArray(DISTINCT ...)`, `uniq`, `count`, `countIf`)

## Sources Consulted
- [ClickHouse URL functions documentation](https://clickhouse.com/docs/en/sql-reference/functions/url-functions)
- [ClickHouse cutQueryString.cpp source code (GitHub)](https://github.com/ClickHouse/ClickHouse/blob/master/src/Functions/URL/cutQueryString.cpp)
- [ClickHouse Issue #45676 — cutQueryStringAndFragment behaviour](https://github.com/ClickHouse/ClickHouse/issues/45676)
- [ClickHouse groupUniqArray documentation](https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/groupuniqarray)

## Issues Found
1. **Incorrect description of `cutQueryString()` in the introduction.** The original text claimed it "removes the query string (everything from `?` onwards, including the `?` itself) and returns the URL up to and including the path." This implies the fragment is also stripped, which is wrong. According to the official ClickHouse docs and source code, `cutQueryString` removes only the query string portion (from `?` up to but not including any `#`), preserving any fragment. The phrase "everything from `?` onwards" was particularly misleading. **Fix:** Rewrote the introductory paragraph to accurately describe that the function preserves any fragment that follows.

2. **Incorrect output values in the Basic Usage table.** Three rows showed wrong `no_query_string` results:
   - `https://example.com/search?q=hello&lang=en#results` was shown as producing `https://example.com/search`; correct output is `https://example.com/search#results` (fragment preserved).
   - `https://docs.io/guide?v=2#installation` was shown as producing `https://docs.io/guide`; correct output is `https://docs.io/guide#installation`.
   - `https://app.io/#/dashboard` was shown as producing `https://app.io/`; since there is no `?` in this URL, the correct output is `https://app.io/#/dashboard` unchanged.
   **Fix:** Corrected all three rows to reflect actual ClickHouse behaviour.

## Review Notes
- The "Combining Both Functions: Fully Stripped URL" section is technically correct as written. Chaining `cutFragment(cutQueryString(url))` does produce a base URL equivalent to `protocol://host/path` for typical inputs, since the second call strips any fragment that `cutQueryString` left behind. ClickHouse also exposes `cutQueryStringAndFragment()` which does both in one call — could be mentioned as a future improvement.
- The "Building a Cache Key Without Query String" example is reasonable in practice because static-asset URLs rarely carry fragments, but strictly speaking the resulting cache key may still contain `#fragment` if one is present.
- `groupArray(DISTINCT url)` is valid ClickHouse syntax; `groupUniqArray(url)` is the more idiomatic equivalent and could be used as a stylistic alternative.
- All other SQL constructs (`yesterday()`, `arrayJoin`, `uniq`, `countIf`, `path()`, `protocol()`, `domain()`, `fragment()`) were verified against the official ClickHouse documentation and are used correctly.
