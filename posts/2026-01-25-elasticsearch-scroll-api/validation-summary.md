# Validation Summary: How to Implement Scroll API in Elasticsearch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elasticsearch 8.x
- Elasticsearch Scroll API
- Elasticsearch Point-in-Time API
- Elasticsearch `search_after` pagination
- Elasticsearch sliced scrolls
- Python Elasticsearch client
- Bash, curl, jq

## Sources Consulted
- Elasticsearch documentation: Paginate search results - https://www.elastic.co/docs/reference/elasticsearch/rest-apis/paginate-search-results
- Elasticsearch API documentation: Scroll API - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-scroll
- Elasticsearch API documentation: Clear scroll API - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-clear-scroll
- Elasticsearch API documentation: Open point in time - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-open-point-in-time
- Elasticsearch API documentation: Close point in time - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-close-point-in-time
- Elasticsearch API documentation: Search API - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search
- Python Elasticsearch client API documentation - https://elasticsearch-py.readthedocs.io/en/latest/api/elasticsearch.html

## Issues Found
- The examples showed exact total hit counts over 10,000 without enabling `track_total_hits`. Added `track_total_hits: true` / `track_total_hits=True` where the examples display or rely on exact totals.
- The Bash export wrote newline-delimited JSON documents to a file named `export.json`. Renamed it to `export.jsonl` to match the actual output format.
- The PIT examples sorted on `_id`, which is not the recommended tiebreaker for `search_after`; Elastic recommends a doc-values tiebreaker field without PIT, and PIT requests include an implicit `_shard_doc` tiebreaker. Removed `_id` from the PIT sort examples and updated the sample `search_after` value accordingly.
- The Python examples used request `body` style for search and bulk operations. Updated examples to current named parameters such as `query`, `size`, `source`, `sort`, `pit`, `search_after`, and `operations`.
- The PIT Python example closed the PIT using `body={"id": pit_id}`. Updated it to the current `id=pit_id` client parameter.
- The parallel sliced scroll Python snippet referenced `Elasticsearch` without importing it. Added the missing import.
- The parallel sliced scroll processor accumulated totals across repeated calls. Reset `total_processed` at the start of `parallel_scroll`.

## Review Notes
The post correctly notes that Scroll is still useful for large export and processing workflows, but Elastic no longer recommends Scroll for new deep-pagination implementations. The post now keeps that distinction by framing PIT plus `search_after` as the preferred modern approach.
