# Validation Summary: How to Implement Elasticsearch Caching

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Elasticsearch
- Node query cache
- Shard request cache
- Field data cache
- Elasticsearch REST APIs
- Elasticsearch circuit breakers

## Sources Consulted
- Elasticsearch Reference: Node query cache settings - https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/node-query-cache-settings
- Elasticsearch Reference: The shard request cache - https://www.elastic.co/docs/reference/elasticsearch/rest-apis/shard-request-cache
- Elasticsearch Reference: Shard request cache settings - https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/shard-request-cache-settings
- Elasticsearch Reference: Field data cache settings - https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/field-data-cache-settings
- Elasticsearch Reference: Circuit breaker settings - https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/circuit-breaker-settings
- Elasticsearch API Documentation: Clear the cache - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-clear-cache
- Elasticsearch Reference: _id field - https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/mapping-id-field

## Issues Found
- The post said the request cache caches the entire search response. Updated this to clarify that, by default, shard request cache caches `size: 0` requests and does not cache document hits, but can cache `hits.total`, aggregations, and suggestions.
- The post implied term queries in filter context are cached by the node query cache. Current Elasticsearch documentation says term queries are not eligible for caching, so the examples and bullet list were updated to use an eligible range filter instead.
- The post showed disabling `index.queries.cache.enabled` through an ordinary open-index settings update. Elasticsearch documents this setting as static and only settable at index creation time or on a closed index, so the command comment was corrected.
- The post described query cache invalidation as happening directly whenever documents are added, updated, or deleted. Updated the explanation to reflect the per-segment behavior and note that merges can invalidate cached query results.
- The post stated that rounded `now` expressions allow request caching. Updated this to the more precise behavior: most `now` queries bypass the cache, while rounded expressions can improve reuse within the rounded interval.
- The time-based index examples used `value_count` on `_id`. Elasticsearch restricts `_id` from aggregations, sorting, and scripting, so those examples now count the `timestamp` field instead.

## Review Notes
The examples use Elasticsearch 8/9-style REST APIs and current setting names. Cache sizing values such as `indices.requests.cache.size: 2%` and `indices.fielddata.cache.size: 30%` are workload-specific examples rather than defaults; future revisions could call that out explicitly.
