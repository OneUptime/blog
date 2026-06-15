# Validation Summary: How to Write Query DSL in Elasticsearch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elasticsearch 8.x
- Elasticsearch Query DSL
- Elasticsearch REST APIs
- curl
- Python
- Official Elasticsearch Python client

## Sources Consulted
- Elasticsearch Query and filter context: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-filter-context
- Elasticsearch Boolean query: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-bool-query
- Elasticsearch Match query: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-match-query
- Elasticsearch Multi-match query: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-multi-match-query
- Elasticsearch Term query: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-term-query
- Elasticsearch Terms query: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-terms-query
- Elasticsearch Range query: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-range-query
- Elasticsearch Prefix query: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-prefix-query
- Elasticsearch Wildcard query: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-wildcard-query
- Elasticsearch Query string query: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-query-string-query
- Elasticsearch Bulk API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-bulk
- Elasticsearch keyword field type: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/keyword
- Elasticsearch text field type: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/text
- Elasticsearch Python client examples: https://www.elastic.co/docs/reference/elasticsearch/clients/python/examples

## Issues Found
- The sample data relied on dynamic mappings while later examples used term-level exact matching on `brand`, `category`, and `name`. Dynamic string mappings create analyzed `text` fields with keyword subfields, which would make several term-level examples behave differently from their descriptions. Added an explicit index mapping with `keyword` fields for structured values and a `name.keyword` subfield.
- The bulk indexing command used regular JSON content type and `-d`. Updated it to `application/x-ndjson`, `--data-binary`, and `refresh=true` so the NDJSON payload is sent correctly and the examples can be searched immediately.
- Prefix and wildcard examples queried `name`, an analyzed `text` field. Changed them to query `name.keyword`, matching Elasticsearch's term-level query behavior.
- The filter-caching explanation overstated caching as unconditional. Updated it to say frequently used filters can be cached and are often faster.
- The Python query builder boosted products with a rating exactly equal to `4.5` while the comment said it boosted high-rated products. Added a `should_range` helper and used `rating >= 4.5`.
- The Python price filter skipped valid zero values because it checked truthiness. Changed it to check `is not None`.
- The Python client initialization omitted the URL scheme. Updated it to `http://localhost:9200`.
- Removed an unused `Optional` import from the Python example.

## Review Notes
The remaining Query DSL examples are syntactically consistent with Elasticsearch 8.x documentation. The local examples assume an Elasticsearch node is available at `http://localhost:9200`; Elasticsearch 8.x installations with default security enabled may also require TLS and authentication settings.
