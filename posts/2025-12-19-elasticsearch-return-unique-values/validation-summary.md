# Validation Summary: How to Return Unique Values in Elasticsearch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elasticsearch Search API
- Elasticsearch terms aggregation
- Elasticsearch cardinality aggregation
- Elasticsearch composite aggregation
- Elasticsearch field collapsing
- Python Elasticsearch client
- curl

## Sources Consulted
- Elasticsearch terms aggregation documentation: https://www.elastic.co/docs/reference/aggregations/search-aggregations-bucket-terms-aggregation
- Elasticsearch cardinality aggregation documentation: https://www.elastic.co/docs/reference/aggregations/search-aggregations-metrics-cardinality-aggregation
- Elasticsearch composite aggregation documentation: https://www.elastic.co/docs/reference/aggregations/search-aggregations-bucket-composite-aggregation
- Elasticsearch collapse search results documentation: https://www.elastic.co/docs/reference/elasticsearch/rest-apis/collapse-search-results
- Elasticsearch keyword field documentation: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/keyword
- Python Elasticsearch client API documentation: https://elasticsearch-py.readthedocs.io/en/latest/api/elasticsearch.html

## Issues Found
- The terms aggregation notes said "results are approximate" for high-cardinality fields. Changed this to clarify that document counts and top-term selection can be approximate; the returned bucket keys are still exact terms.
- The cardinality precision notes said values up to the threshold are "nearly exact." Changed this to match Elasticsearch documentation: counts up to the threshold are expected to be close to accurate, but exactness is not guaranteed.
- The composite aggregation pagination text said to use `after_key`, which could be read as placing `after_key` in the next request. Changed it to state that the next request should set `after` to the `after_key` returned in the previous response.
- The performance table overstated terms aggregation accuracy and composite aggregation accuracy. Updated it to clarify that terms returns exact values for returned buckets while counts/top-list selection may be approximate, and that composite aggregation is exact when all pages are read.

## Review Notes
The examples use `https://localhost:9200` with basic authentication. In a default secured local Elasticsearch setup, curl may also require a trusted CA certificate or an explicit insecure test option; this is environment-specific and not an Elasticsearch API error.
