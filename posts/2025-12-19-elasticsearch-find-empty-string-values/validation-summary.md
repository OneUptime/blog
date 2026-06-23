# Validation Summary: How to Find Documents with Empty String Values

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elasticsearch Query DSL
- Elasticsearch exists and term queries
- Elasticsearch bool queries and filters aggregations
- Elasticsearch Painless scripts
- Elasticsearch ingest pipelines
- Elasticsearch runtime fields
- Elasticsearch update by query and delete by query APIs
- Python Elasticsearch client
- curl

## Sources Consulted
- Elasticsearch exists query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-exists-query
- Elasticsearch term query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-term-query
- Elasticsearch search API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search
- Elasticsearch filters aggregation documentation: https://www.elastic.co/docs/reference/aggregations/search-aggregations-bucket-filters-aggregation
- Elasticsearch Painless field context documentation: https://www.elastic.co/docs/reference/scripting-languages/painless/painless-field-context
- Elasticsearch Painless filter context documentation: https://www.elastic.co/docs/reference/scripting-languages/painless/painless-filter-context
- Elasticsearch runtime fields in search request documentation: https://www.elastic.co/docs/manage-data/data-store/mapping/define-runtime-fields-in-search-request
- Elasticsearch ingest pipelines documentation: https://www.elastic.co/docs/manage-data/ingest/transform-enrich/ingest-pipelines
- Elasticsearch script processor documentation: https://www.elastic.co/docs/reference/enrich-processor/script-processor
- Elasticsearch update by query API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-update-by-query
- Elasticsearch delete by query API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-delete-by-query
- Python Elasticsearch client documentation: https://elasticsearch-py.readthedocs.io/en/latest/api/elasticsearch.html
- Python Elasticsearch client examples: https://www.elastic.co/docs/reference/elasticsearch/clients/python/examples

## Issues Found
- Several curl examples used Kibana Console-style triple-quoted script strings. Those are not valid JSON request bodies for curl, so the Painless script examples were converted to valid JSON strings with escaped quotes.
- The script query introduction said it applied to text fields, but the examples access `.keyword` doc values. This was changed to "keyword fields" to match Elasticsearch's term-level and doc-values behavior.
- The Python client example used an older constructor style and passed the search request as `body`. It was updated to the current documented style using `Elasticsearch('http://localhost:9200')`, `size`, `aggs`, and `track_total_hits=True`.
- The Python audit tool read `hits.total.value` without requesting exact total hits, which can make completeness inaccurate above Elasticsearch's default hit-count threshold. Added `track_total_hits=True`.
- The ingest pipeline description said it replaced empty strings with null, but the script removes fields. The description was changed to "Remove empty strings" to match the actual behavior.

## Review Notes
The core Elasticsearch behavior described in the post is accurate for normal indexed keyword fields: `exists` treats empty strings as existing values, `null` and missing values do not produce indexed values, and exact empty-string matching should use a term query on a keyword field. The examples assume fields have `.keyword` subfields; mappings without keyword subfields would need field-specific adjustments.
