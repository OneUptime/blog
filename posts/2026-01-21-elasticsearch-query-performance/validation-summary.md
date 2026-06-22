# Validation Summary: How to Optimize Elasticsearch Query Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Elasticsearch Query DSL
- Elasticsearch Search API
- Elasticsearch Profile API
- Elasticsearch Explain API
- Elasticsearch request cache and query cache
- Elasticsearch pagination with `search_after` and point in time
- Elasticsearch aggregations
- Elasticsearch source filtering, stored fields, and doc value fields
- Elasticsearch index settings, index sorting, refresh interval, shard sizing, and slow logs

## Sources Consulted
- Elasticsearch Query and filter context: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-filter-context
- Elasticsearch Boolean query: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-bool-query
- Elasticsearch Profile API: https://www.elastic.co/docs/reference/elasticsearch/rest-apis/search-profile
- Elasticsearch Explain API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-explain
- Elasticsearch Term query: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-term-query
- Elasticsearch Match query: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-match-query
- Elasticsearch Constant score query: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-constant-score-query
- Elasticsearch Wildcard query: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-wildcard-query
- Elasticsearch shard request cache: https://www.elastic.co/docs/reference/elasticsearch/rest-apis/shard-request-cache
- Elasticsearch node query cache settings: https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/node-query-cache-settings
- Elasticsearch pagination with `search_after` and PIT: https://www.elastic.co/docs/reference/elasticsearch/rest-apis/paginate-search-results
- Elasticsearch composite aggregation: https://www.elastic.co/docs/reference/aggregations/search-aggregations-bucket-composite-aggregation
- Elasticsearch sampler aggregation: https://www.elastic.co/docs/reference/aggregations/search-aggregations-bucket-sampler-aggregation
- Elasticsearch retrieve selected fields: https://www.elastic.co/docs/reference/elasticsearch/rest-apis/retrieve-selected-fields
- Elasticsearch refresh interval and refresh API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-refresh
- Elasticsearch index sorting settings: https://www.elastic.co/docs/reference/elasticsearch/index-settings/sorting
- Elasticsearch shard sizing guidance: https://www.elastic.co/docs/deploy-manage/production-guidance/optimize-performance/size-shards
- Elasticsearch slow log settings: https://www.elastic.co/docs/reference/elasticsearch/index-settings/slow-log

## Issues Found
- The execution overview described aggregations as a separate query phase. Changed the wording to describe query, fetch, and optional aggregation work without implying a separate formal phase.
- The filter section said filters are cached. Changed this to say filters skip scoring and frequently used filters are eligible for caching, matching Elasticsearch query-cache behavior.
- The caching section described `request_cache=true` as query caching. Renamed it to request caching for repeated aggregations, added `size: 0`, and changed the example to an aggregation-oriented request.
- The `search_after` examples sorted on `_id`. Replaced this with a stable `tie_breaker_id` field and added a note that non-PIT pagination needs a unique tiebreaker field.
- The PIT example included `_id` as an explicit sort tiebreaker. Removed it because PIT searches add an implicit `_shard_doc` tiebreaker.
- The stored-fields section implied stored fields can be used for any frequently retrieved small field. Clarified that `stored_fields` only works for fields explicitly mapped with `store: true`, and that source filtering or `docvalue_fields` is usually preferred.

## Review Notes
The remaining examples are generally valid Elasticsearch Query DSL and REST API usage. Some examples assume mappings exist, such as `keyword` fields, stored fields, sortable fields, and doc-value-compatible fields. In a future revision, the post could mention that slow logs are shard-level and that newer Elastic documentation recommends query logging for broader end-to-end search logging, but the slow-log settings shown are still valid.
