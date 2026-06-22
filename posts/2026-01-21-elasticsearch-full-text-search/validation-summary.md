# Validation Summary: How to Build Full-Text Search with Elasticsearch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elasticsearch Query DSL
- Full-text search
- Match, match_phrase, multi_match, bool, query_string, and simple_query_string queries
- Highlighting
- Pagination with from/size and search_after
- Source filtering
- Elasticsearch mappings and analyzers

## Sources Consulted
- Elasticsearch Match query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-match-query
- Elasticsearch Match phrase query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-match-query-phrase
- Elasticsearch Multi-match query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-multi-match-query
- Elasticsearch Boolean query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-bool-query
- Elasticsearch Query string query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-query-string-query
- Elasticsearch Simple query string query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-simple-query-string-query
- Elasticsearch Pagination documentation: https://www.elastic.co/docs/reference/elasticsearch/rest-apis/paginate-search-results
- Elasticsearch _id field documentation: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/mapping-id-field
- Elasticsearch Highlighting documentation: https://www.elastic.co/docs/reference/elasticsearch/rest-apis/highlighting
- Elasticsearch Retrieve selected fields documentation: https://www.elastic.co/docs/reference/elasticsearch/rest-apis/retrieve-selected-fields

## Issues Found
- The search_after example sorted by `_id`. Elasticsearch restricts `_id` from sorting and recommends duplicating the ID into a doc_values-enabled field for this use case. Changed the tie-breaker sort field to `tie_breaker_id`.
- The complete application mapping defined `tags` as `keyword`, but the search query used `tags^2` in a full-text `multi_match` query. Changed `tags` to a `text` field with the custom analyzer and a `keyword` subfield so it works for analyzed full-text matching while preserving exact-match capability.
- The highlighting response example used `{ ... }` inside a `json` code block, which is not valid JSON. Replaced it with a concrete minimal `_source` object.

## Review Notes
- The post does not pin an Elasticsearch version. The reviewed examples match current Elasticsearch documentation as of 2026-06-21.
- The `https://localhost:9200` curl examples assume a local Elasticsearch node configured with TLS and credentials. Some local setups may require passing a CA certificate or using `-k`, but the API paths and request bodies are valid.
