# Validation Summary: How to Optimize String Comparisons in ClickHouse

## Status
validated

## Post Type
Tutorial / Performance Guide

## Technologies Covered
- ClickHouse (MergeTree engine, skip indexes, LowCardinality data type)
- SQL (DDL, DML, query optimization)
- Bloom filter indexes (bloom_filter, ngrambf_v1, tokenbf_v1)

## Sources Consulted
- ClickHouse MergeTree skip index documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#available-types-of-indices
- ClickHouse string search functions: https://clickhouse.com/docs/en/sql-reference/functions/string-search-functions
- ClickHouse LowCardinality type: https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality
- ClickHouse system.query_log: https://clickhouse.com/docs/en/operations/system-tables/query_log

## Issues Found

1. **Incorrect recommendation of tokenbf_v1 for substring LIKE searches (Section: "Token Bloom Filter for LIKE Searches")**
   - **What was wrong:** The post recommended using `tokenbf_v1` instead of `ngrambf_v1` for substring searches with `LIKE '%term%'`. This is backwards. `tokenbf_v1` tokenizes text at word boundaries (non-alphanumeric characters) and is suited for whole-word matching. `ngrambf_v1` splits text into character-level n-grams and is the correct choice for arbitrary substring matching.
   - **What was changed:** Replaced the section to correctly recommend `ngrambf_v1` for arbitrary substring searches (with correct 4-parameter syntax including n-gram size), and added a note that `tokenbf_v1` is appropriate for whole-word matching instead.
   - **Why:** Using `tokenbf_v1` for `LIKE '%clickhouse%'` only works if "clickhouse" appears as a complete token. `ngrambf_v1` works for any substring, making it the correct general recommendation.

2. **Misleading "Slow" label on prefix LIKE pattern (Section: "Using startsWith Instead of LIKE")**
   - **What was wrong:** The comment labeled `LIKE '/api/%'` as "Slow: LIKE with suffix wildcard". ClickHouse actually optimizes prefix-only LIKE patterns (constant prefix with trailing `%`) to use the primary key index, so calling it "Slow" is inaccurate.
   - **What was changed:** Updated the comments to say "Works but less explicit" for the LIKE version and "Preferred: startsWith is explicit and always optimized" for the startsWith version.
   - **Why:** While `startsWith` is still the preferred approach for clarity and explicitness, the LIKE version is not slow since ClickHouse optimizes it. The original comments overstated the performance difference.

## Review Notes
- The `ProfileEvents['SelectedMarks']` key used in the system.query_log example is a valid, long-standing ClickHouse metric but is not always prominently documented. Users may need to check `SELECT * FROM system.events WHERE event LIKE '%Mark%'` to discover available metrics on their specific ClickHouse version.
- The LowCardinality ~10K unique values recommendation aligns with official docs. ClickHouse docs also note that performance may degrade above ~100K distinct values.
- The range scan trick (`path >= '/api/' AND path < '/api0'`) is technically correct since '/' (ASCII 47) is immediately followed by '0' (ASCII 48), making this a valid prefix range. However, this technique is fragile and less readable than `startsWith` — it's an advanced optimization that most users won't need.
