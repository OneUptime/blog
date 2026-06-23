# Validation Summary: How to Set Max Limit on IDs Filter Values in Elasticsearch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elasticsearch Query DSL
- Elasticsearch `ids` query
- Elasticsearch `terms` query and `index.max_terms_count`
- Elasticsearch multi get (`_mget`) API
- Elasticsearch scroll API
- Elasticsearch slow logs
- Python Elasticsearch client
- JavaScript Elasticsearch client

## Sources Consulted
- Elasticsearch IDs query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-ids-query
- Elasticsearch terms query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-terms-query
- Elasticsearch general index settings documentation: https://www.elastic.co/docs/reference/elasticsearch/index-settings/index-modules
- Elasticsearch search settings documentation: https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/search-settings
- Elasticsearch multi get API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-mget
- Elasticsearch pagination and scroll API documentation: https://www.elastic.co/docs/reference/elasticsearch/rest-apis/paginate-search-results
- Elasticsearch slow log settings documentation: https://www.elastic.co/docs/reference/elasticsearch/index-settings/slow-log
- Python Elasticsearch client examples and API reference: https://www.elastic.co/docs/reference/elasticsearch/clients/python/examples and https://elasticsearch-py.readthedocs.io/en/latest/api/elasticsearch.html
- JavaScript Elasticsearch client API reference: https://www.elastic.co/docs/reference/elasticsearch/clients/javascript/api-reference

## Issues Found
- The post incorrectly treated the `ids` query as having a directly configurable max-values setting. Updated the introduction and default-limit section to clarify that `index.max_terms_count` applies to `terms` queries, including `terms` queries on `_id`, while the `ids` query is documented separately and has no dedicated configurable value limit.
- The error example incorrectly referenced `maxClauseCount` and `too_many_clauses` for the 65,536 terms limit. Updated the example to describe exceeding `index.max_terms_count` for a `terms` query.
- The cluster-level configuration example used `indices.query.bool.max_clause_count`, which is deprecated in Elasticsearch 8.x and has no effect. Replaced it with a warning that it does not configure `index.max_terms_count`.
- Python examples used older `body=` request style. Updated search examples to pass `query=` and `size=` directly, and mget examples to pass `ids=` directly.
- JavaScript examples used `body` for search and mget. Updated them to use current top-level request properties such as `query`, `size`, and `ids`.
- The scroll example processed only `ids[:65000]`, silently ignoring remaining IDs. Updated it to batch IDs and clear each scroll context.
- The filtering guidance implied filters could reduce the ID list before applying the ID query. Clarified that filters reduce returned results but do not increase the maximum number of IDs accepted by a single query.
- Replaced invalid Python placeholder lists using `...` with runnable list comprehensions.
- Removed a duplicate `mget` call introduced during correction in the Redis caching example.

## Review Notes
The remaining REST examples use Elasticsearch Console-style snippets with comments and illustrative ellipses. These are acceptable as documentation examples but should be converted to fully executable curl or Console examples in a future cleanup if strict machine-runnable snippets are required.
