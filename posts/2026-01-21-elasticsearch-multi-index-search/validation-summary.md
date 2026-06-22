# Validation Summary: How to Search Across Multiple Indices in Elasticsearch

## Status
validated

## Post Type
Guide

## Technologies Covered
- Elasticsearch Search API
- Elasticsearch Query DSL
- Elasticsearch index aliases
- Elasticsearch cross-cluster search
- Elasticsearch search templates
- Elasticsearch aggregations and sorting

## Sources Consulted
- Elasticsearch Search API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search
- Elasticsearch search templates documentation: https://www.elastic.co/docs/solutions/search/search-templates
- Elasticsearch create or update script/search template API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-put-script
- Elasticsearch cross-cluster search documentation: https://www.elastic.co/docs/explore-analyze/cross-cluster-search
- Elasticsearch remote cluster settings documentation: https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/remote-clusters
- Elasticsearch field capabilities API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-field-caps
- Elasticsearch sort search results documentation: https://www.elastic.co/docs/reference/elasticsearch/rest-apis/sort-search-results
- Elasticsearch exists query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-exists-query

## Issues Found
- The "Type Coercion Settings" example used `search.allow_expensive_queries`, which controls whether expensive queries are allowed and does not perform type coercion for fields across indices. Replaced it with a field capabilities API example so readers can inspect field availability and types across the queried index patterns.
- The cross-cluster search option `ccs_minimize_roundtrips` was shown inside the request body. The Search API defines it as a query parameter, so the example now passes `?ccs_minimize_roundtrips=true` in the URL.

## Review Notes
The remaining examples align with current Elasticsearch documentation. The post does not pin an Elasticsearch version, so the review used current Elastic documentation available on 2026-06-21.
