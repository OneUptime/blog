# Validation Summary: How to Implement Fuzzy String Matching in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse SQL
- ClickHouse string functions (`editDistance`, `ngramDistance`, `soundex`)
- ClickHouse parameterized queries (`{name:Type}` syntax)
- ClickHouse `ALTER TABLE` for materialized columns and bloom filter skip indexes

## Sources Consulted
- ClickHouse string functions reference: https://clickhouse.com/docs/sql-reference/functions/string-functions (covers `editDistance`, `soundex`)
- ClickHouse string search functions reference: https://clickhouse.com/docs/sql-reference/functions/string-search-functions (covers `ngramDistance`, its UTF-8/case-insensitive variants, and `ngramSearch`)
- ClickHouse `ALTER TABLE ... ADD COLUMN` reference: https://clickhouse.com/docs/sql-reference/statements/alter/column#add-column
- ClickHouse skipping-index reference: https://clickhouse.com/docs/sql-reference/statements/alter/skipping-index
- ClickHouse MergeTree index types (bloom_filter): https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree#bloom_filter
- ClickHouse parameterized-query syntax: https://clickhouse.com/docs/sql-reference/syntax

## Issues Found
- **`ngramSimilarity` does not exist in ClickHouse.** The post introduced and used `ngramSimilarity` as if it were a built-in function. ClickHouse's actual built-in is `ngramDistance` (with `ngramDistanceCaseInsensitive`, `ngramDistanceUTF8`, and `ngramDistanceCaseInsensitiveUTF8` variants). It returns a `Float32` in [0, 1] representing dissimilarity based on the symmetric difference of 4-gram multisets — **smaller values mean a closer match**, the opposite of a similarity score.
  - Renamed the section from "N-Gram Similarity" to "N-Gram Distance" and updated the introductory sentence to describe the actual semantics (Float32, 4-grams, smaller = closer).
  - Updated the first example's predicate from `score > 0.3` / `ORDER BY score DESC` to `score < 0.7` / `ORDER BY score ASC` to reflect that this is a distance, not a similarity.
  - In the combined ranking query, renamed the alias `sim` to `dist`, flipped the predicate `sim > 0.4` to `dist < 0.6`, and changed the `ORDER BY` expression from `(ed * 0.4 + (1 - sim) * 0.6)` to `(ed * 0.4 + dist * 0.6)` so lower ranks continue to indicate better matches.
  - Updated the Summary paragraph's list of functions accordingly.

## Review Notes
- `editDistance` (alias `levenshteinDistance`) is byte-based. For multi-byte UTF-8 text, `editDistanceUTF8` is more accurate; the post's examples assume ASCII-ish names, which is fine but worth noting for future revisions.
- `lower()` in ClickHouse is ASCII-only. For multilingual data, `lowerUTF8` or the `*CaseInsensitive*` ngram variants would be preferable.
- `soundex` was added in ClickHouse 23.4 (April 2023); users on older versions would need to upgrade.
- The "Practical Indexing Tips" section mentions pre-filtering with `LIKE '%partial%'` or a bloom filter skip index. A standard `bloom_filter` index does not accelerate unanchored `LIKE '%...%'` queries — `ngrambf_v1` or `tokenbf_v1` would. The bloom filter on the `soundex` materialized column in the example is, however, a reasonable use since it tests equality. This is a nuance rather than an outright error, so left as written.
- Newly added `MATERIALIZED` columns are only populated for new data unless the user runs `ALTER TABLE ... MATERIALIZE COLUMN` to backfill existing parts — worth calling out in a future revision.
