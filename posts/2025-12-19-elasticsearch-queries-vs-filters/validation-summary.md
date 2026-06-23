# Validation Summary: How to Understand Queries vs Filters in Elasticsearch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elasticsearch Query DSL
- Elasticsearch bool queries
- Elasticsearch filter context and query context
- Elasticsearch node query cache
- Elasticsearch aggregations and post_filter
- Python Elasticsearch client
- curl

## Sources Consulted
- Elasticsearch Reference: Query and filter context - https://www.elastic.co/docs/reference/query-languages/query-dsl/query-filter-context
- Elasticsearch Reference: Boolean query - https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-bool-query
- Elasticsearch Reference: Node query cache settings - https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/node-query-cache-settings
- Elasticsearch Reference: Filter search results / post_filter - https://www.elastic.co/docs/reference/elasticsearch/rest-apis/filter-search-results
- Elasticsearch Python client documentation: Querying - https://www.elastic.co/docs/reference/elasticsearch/clients/python/querying
- Elasticsearch API documentation: Get node statistics - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-nodes-stats

## Issues Found
- The post stated that filter results are cached as a blanket rule and referred to a "filter cache." Current Elasticsearch documentation says filter clauses are considered for caching, eligible filters may be stored in the node query cache, and not every filter query is cached. Updated the caching language throughout the post to say "considered for caching," "eligible for caching," or "node query cache."
- The benchmark text claimed filters are typically 2-10x faster. That specific range is not guaranteed by Elasticsearch documentation and depends on mappings, data distribution, segments, and cache eligibility. Reworded it to say filters often show faster results when they avoid scoring and are eligible for query caching.
- The aggregation section said filters are "essential" for efficient aggregations. Filters are useful and commonly appropriate, but not strictly essential for every efficient aggregation. Reworded this to "useful."
- The Python benchmark used `body={ "query": ... }` for search requests. Updated it to pass `query=` directly, matching the current Python client documentation style for first-level request body parameters.

## Review Notes
The remaining examples are structurally valid Query DSL examples, but real results depend on mappings. In particular, exact `term` and `terms` examples assume fields such as `status`, `category`, `brand`, and `location` are mapped as `keyword`, boolean, numeric, or other exact-value field types rather than analyzed `text` fields.
