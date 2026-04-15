# Validation Summary: How to Migrate from Elasticsearch to ClickHouse

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- ClickHouse (MergeTree engine, JSON functions, `url()` table function, secondary indexes)
- Elasticsearch (search/scroll API, mappings, Query DSL aggregations)
- Python (`elasticsearch-py` client)
- Fluent Bit (HTTP output plugin for dual-write)
- `clickhouse-client` CLI (TSV insert)

## Sources Consulted
- ClickHouse documentation: `url()` table function — https://clickhouse.com/docs/en/sql-reference/table-functions/url
- ClickHouse documentation: `JSONExtract*` functions — https://clickhouse.com/docs/en/sql-reference/functions/json-functions
- ClickHouse documentation: `parseDateTime64BestEffort` — https://clickhouse.com/docs/en/sql-reference/functions/type-conversion-functions#parsedatetime64besteffort
- ClickHouse documentation: `hasToken` and `tokenbf_v1` index — https://clickhouse.com/docs/en/sql-reference/functions/string-search-functions#hastoken
- ClickHouse documentation: secondary data skipping indexes — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-data_skipping-indexes
- Elasticsearch Python client documentation — https://elasticsearch-py.readthedocs.io/
- Elasticsearch Scroll API documentation — https://www.elastic.co/guide/en/elasticsearch/reference/current/scroll-api.html
- Fluent Bit HTTP output plugin — https://docs.fluentbit.io/manual/pipeline/outputs/http

## Issues Found

### 1. Step 5 heading typo: "Elasticseach" → "Elasticsearch"
- **What was wrong:** Heading read "Use Elasticseach-to-ClickHouse Direct Load" with a misspelling.
- **Fix:** Corrected the heading to "Direct Load via ClickHouse SQL" (also reworded to remove the false claim about `elasticsearch()` table function — see issue #2).

### 2. Step 5 falsely claimed ClickHouse has an `elasticsearch()` table function
- **What was wrong:** The text stated "Use `clickhouse-client` with the `elasticsearch()` table function" but ClickHouse has no built-in `elasticsearch()` table function. The code actually used the `url()` table function.
- **Fix:** Rewrote the section description to accurately describe the `url()` table function approach and its limitations (single HTTP request, no scroll pagination, capped by the `size` parameter).

### 3. Step 5 SQL was fundamentally broken
- **What was wrong:** The SQL treated the Elasticsearch `_search` response as if each row were an individual document. In reality, Elasticsearch wraps documents inside a `hits.hits[]._source` envelope. The `url()` function returns the entire response as a single JSON string, and `JSONExtractString(doc, '@timestamp')` would fail because `@timestamp` is not a top-level key in the search response. Additionally, the `scroll=5m` URL parameter was useless since `url()` makes a single HTTP request and cannot follow up with scroll continuation requests.
- **Fix:** Rewrote the SQL to properly unpack the ES response: `JSONExtractRaw(response, 'hits', 'hits')` → `JSONExtractArrayRaw()` → `arrayJoin()` to expand hits into rows → `JSONExtractRaw(hit, '_source')` to extract each document. Removed the `scroll=5m` parameter. Added a note directing readers to the Python approach for full migrations.

### 4. Step 5 used `parseDateTimeBestEffort` instead of `parseDateTime64BestEffort`
- **What was wrong:** `parseDateTimeBestEffort` returns `DateTime` (second precision), but the target column `ts` is `DateTime64(3)` (millisecond precision). Millisecond precision from Elasticsearch timestamps would be silently lost.
- **Fix:** Changed to `parseDateTime64BestEffort(src, '@timestamp', 3)` which returns `DateTime64(3)` and preserves milliseconds.

### 5. Unused import in transform_and_load.py
- **What was wrong:** `from datetime import datetime` was imported but never used in the script. All timestamp handling is done via string operations.
- **Fix:** Removed the unused import.

### 6. Misleading comment about bloom filter and `hasToken`
- **What was wrong:** The comment "Bloom filter index speeds up equality checks" above the `hasToken` example implied that the `bloom_filter` indexes (defined on `level` and `service` columns in the schema) would accelerate `hasToken` queries on `message`. In fact, `hasToken` is accelerated by `tokenbf_v1` indexes, not `bloom_filter`, and no such index is defined on `message`.
- **Fix:** Changed comment to "Token matching (matches whole words; add a tokenbf_v1 index on message to accelerate)" which accurately describes the function and how to speed it up.

## Review Notes
- The Elasticsearch Python client `body` parameter used in the scroll export script (Step 3) is deprecated in `elasticsearch-py` 8.x. The modern 8.x syntax uses direct keyword arguments (e.g., `es.search(index=index, query={"match_all": {}}, ...)`). The `body` parameter still works with a deprecation warning, so this is not broken but worth noting for readers using the latest client.
- The scroll API itself is deprecated in Elasticsearch 7.10+ in favor of search_after with Point in Time (PIT). The scroll-based approach still works but readers starting fresh may want to use the PIT approach instead.
- The JSON code blocks in Step 6 use `//` comments which are not valid JSON syntax. This is a common blog convention for annotating examples and does not affect readability, but readers copying the JSON directly would need to remove the comments.
- For the `bloom_filter` secondary indexes on `LowCardinality(String)` columns (`level`, `service`), a `set` index type would typically be more efficient for low-cardinality columns. `bloom_filter` still works correctly but is better suited for high-cardinality columns.
- ClickHouse has introduced experimental full-text index support (`TYPE full_text`) in recent versions (23.x+). The post's statement that "ClickHouse does not have native full-text search" is still practically correct since the feature is experimental and far less capable than Elasticsearch's, but readers should be aware of the evolving landscape.
