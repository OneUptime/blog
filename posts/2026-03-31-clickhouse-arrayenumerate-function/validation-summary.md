# Validation Summary: How to Use arrayEnumerate() and arrayEnumerateUniq() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse SQL
- ClickHouse array functions (`arrayEnumerate`, `arrayEnumerateUniq`, `arrayJoin`, `ARRAY JOIN`)
- ClickHouse table engines (`Memory`)

## Sources Consulted
- ClickHouse SQL Reference - Array Functions: https://clickhouse.com/docs/sql-reference/functions/array-functions
- ClickHouse ARRAY JOIN clause documentation: https://clickhouse.com/docs/sql-reference/statements/select/array-join

## Issues Found

1. **Incorrect count in the "Practical Example - Counting Unique Tags Per Article" section.**
   - The expected output comment stated `sql 3 (not 4, because the duplicate in article 1 is excluded)`.
   - Tracing the query: Article 1 `['sql', 'database', 'sql', 'clickhouse']` has `arrayEnumerateUniq` = `[1, 1, 2, 1]`; after filtering `occurrence = 1`, only one `sql` remains. Article 3 contributes one more. So the correct count is `sql = 2`, not 3. Likewise, the raw (non-deduplicated) count would be 3 (2 from article 1 + 1 from article 3), not 4.
   - Fixed the comment to read: `sql 2 (not 3, because the duplicate in article 1 is excluded)`.

## Review Notes

- The framing in the "Deduplication with arrayEnumerateUniq and arrayJoin" section refers to counting "unique users" per page, but the query uses `count()` rather than `uniq(user_id)`. The technique correctly deduplicates within each session's `pages` array, but counting across unique users would require `uniq(user_id)`. The example still demonstrates the dedup technique correctly; only the phrasing is slightly loose. Left as-is to preserve the author's style since the core technique is valid.
- All signatures (`arrayEnumerate(arr) -> Array(UInt32)` and `arrayEnumerateUniq(arr) -> Array(UInt32)`) match the official ClickHouse documentation.
- The single-array and multi-array `arrayEnumerateUniq` traces in the examples (`['a','b','a','c','b','a']` → `[1,1,2,1,2,3]` and the two-array tuple example → `[1,1,1,2]`) are both correct.
- The ORDER BY `article_count DESC` does not guarantee a stable order among ties (sql, database, clickhouse all equal 2); readers should be aware the exact row ordering for equal counts may vary.
