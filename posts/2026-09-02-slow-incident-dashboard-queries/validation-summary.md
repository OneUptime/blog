# Validation Summary: Why Are OpenSearch Dashboard Queries Slow During Incidents? Diagnosing Shards, Mappings, and Expensive Aggregations

## Status

validated

## Post Type

Troubleshooting guide / operational performance guide

## Technologies Covered

- OpenSearch REST APIs and Query DSL
- OpenSearch Dashboards
- Search thread pools, shard routing, and shard fan-out
- Index lifecycle management, rollover, aliases, and data streams
- Field mappings, field capabilities, field data, and global ordinals
- Bucket aggregations, search profiling, and slow logs
- OpenSearch performance monitoring and load testing

## Sources Consulted

- OpenSearch Search API: https://docs.opensearch.org/latest/api-reference/search-apis/search/
- OpenSearch Multi-Search API: https://docs.opensearch.org/latest/api-reference/search-apis/multi-search/
- OpenSearch Profile API: https://docs.opensearch.org/latest/api-reference/search-apis/profile/
- OpenSearch CAT Thread Pool API: https://docs.opensearch.org/latest/api-reference/cat/cat-thread-pool/
- OpenSearch Nodes Stats API: https://docs.opensearch.org/latest/api-reference/nodes-apis/nodes-stats/
- OpenSearch CAT Shards API: https://docs.opensearch.org/latest/api-reference/cat/cat-shards/
- OpenSearch Cluster Health API: https://docs.opensearch.org/latest/api-reference/cluster-api/cluster-health/
- OpenSearch Resolve Index API: https://docs.opensearch.org/latest/api-reference/index-apis/resolve-index/
- OpenSearch Search Shards API: https://docs.opensearch.org/latest/api-reference/search-apis/search-shards/
- OpenSearch search shard routing and limits: https://docs.opensearch.org/latest/search-plugins/searching-data/search-shard-routing/
- OpenSearch Field Capabilities API: https://docs.opensearch.org/latest/api-reference/search-apis/field-caps/
- OpenSearch field data mapping parameter: https://docs.opensearch.org/latest/mappings/mapping-parameters/field-data/
- OpenSearch eager global ordinals mapping parameter: https://docs.opensearch.org/latest/mappings/mapping-parameters/eager_global_ordinals/
- OpenSearch terms aggregation: https://docs.opensearch.org/latest/aggregations/bucket/terms/
- OpenSearch date histogram aggregation: https://docs.opensearch.org/latest/aggregations/bucket/date-histogram/
- OpenSearch expensive queries: https://docs.opensearch.org/latest/query-dsl/
- OpenSearch search and shard slow logs: https://docs.opensearch.org/latest/install-and-configure/configuring-opensearch/logs/
- OpenSearch search settings, including `search.max_buckets`: https://docs.opensearch.org/latest/install-and-configure/configuring-opensearch/search-settings/
- OpenSearch thread pool settings: https://docs.opensearch.org/latest/install-and-configure/configuring-opensearch/thread-pool-settings/
- OpenSearch Index State Management policies and rollover conditions: https://docs.opensearch.org/latest/im-plugin/ism/policies/
- OpenSearch performance testing best practices: https://docs.opensearch.org/latest/benchmark/performance-testing-best-practices/
- OpenSearch Dashboards advanced settings: https://docs.opensearch.org/latest/dashboards/management/advanced-settings/
- OpenSearch server REST handler for Nodes Stats: https://github.com/opensearch-project/OpenSearch/blob/main/server/src/main/java/org/opensearch/rest/action/admin/cluster/RestNodesStatsAction.java

## Issues Found

- The response checklist referred generically to `timeout`, but the Search API response field that reports whether a search exceeded its timeout is `timed_out`. Changed the checklist to use the actual response field name.
- The shard fan-out explanation implied that every resolved shard always performs the full search. Clarified that a search normally targets one primary-or-replica copy per shard, while custom routing and the `can_match` prefilter can reduce the shards that perform query work.
- The Search Shards request used the invalid path `GET _search_shards/logs-*`. Changed it to the documented `GET logs-*/_search_shards` endpoint, where the index expression precedes `_search_shards`.
- The description of `max_concurrent_shard_requests` could be read as a global per-request cap. Clarified that it limits each search's concurrent shard requests per node.

## Review Notes

All other API requests and the profiled search body are syntactically valid and current. In particular, the combined Nodes Stats path is valid because its metric list includes `indices`, allowing `search` as the index submetric while also returning JVM, breaker, and filesystem statistics. The post does not target a specific OpenSearch release and its `/latest/` documentation links can drift as new releases are published. OpenSearch 2.12 and later also provide request-level search slow logs based on total request `took`; the post's recommendation to use shard slow logs remains technically correct.
