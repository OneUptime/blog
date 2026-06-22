# Validation Summary: How to Build Product Search with Elasticsearch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elasticsearch index mappings and analyzers
- Elasticsearch Query DSL
- Elasticsearch aggregations and faceted search
- Elasticsearch completion suggester
- Elasticsearch request cache and index settings
- Python Elasticsearch client
- curl

## Sources Consulted
- Elasticsearch Boolean query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-bool-query
- Elasticsearch Function score query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-function-score-query
- Elasticsearch Edge n-gram token filter documentation: https://www.elastic.co/docs/reference/text-analysis/analysis-edgengram-tokenfilter
- Elasticsearch Completion field type documentation: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/completion
- Elasticsearch Filter search results / post_filter documentation: https://www.elastic.co/docs/reference/elasticsearch/rest-apis/filter-search-results
- Elasticsearch Prefix query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-prefix-query
- Elasticsearch Nested aggregation documentation: https://www.elastic.co/docs/reference/aggregations/search-aggregations-bucket-nested-aggregation
- Elasticsearch Terms aggregation documentation: https://www.elastic.co/docs/reference/aggregations/search-aggregations-bucket-terms-aggregation
- Elasticsearch Sort search results documentation: https://www.elastic.co/docs/reference/elasticsearch/rest-apis/sort-search-results
- Python Elasticsearch client connection documentation: https://www.elastic.co/docs/reference/elasticsearch/clients/python/connecting

## Issues Found
- The autocomplete search examples used a `bool` query with `should` clauses and a `filter` clause but did not set `minimum_should_match`. Elasticsearch defaults `minimum_should_match` to `0` when a bool query has a filter, so the query could return all in-stock products instead of requiring an autocomplete match. Added `"minimum_should_match": 1` to both the curl and Python autocomplete examples.
- The sorting and request-cache examples queried `category` as `"electronics"` even though the mapping defines `category` as a `keyword` and the sample document stores full category paths such as `"electronics/phones/smartphones"`. Changed those examples to use a `prefix` filter for `"electronics/"`, which matches the demonstrated category-path format.

## Review Notes
- The remaining examples use current Elasticsearch Query DSL constructs and mapping features. The completion suggester example defines a valid completion field with category contexts, but real results require documents to be indexed with a populated `suggest` field.
