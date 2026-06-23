# Validation Summary: How to Implement Aggregation with Sorting and Pagination

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elasticsearch aggregations
- Composite aggregation
- Terms aggregation
- bucket_sort pipeline aggregation
- Partitioned terms aggregation
- Python Elasticsearch client
- curl

## Sources Consulted
- Elastic Docs: Composite aggregation - https://www.elastic.co/docs/reference/aggregations/search-aggregations-bucket-composite-aggregation
- Elastic Docs: Bucket sort aggregation - https://www.elastic.co/docs/reference/aggregations/search-aggregations-pipeline-bucket-sort-aggregation
- Elastic Docs: Terms aggregation - https://www.elastic.co/docs/reference/aggregations/search-aggregations-bucket-terms-aggregation
- Elastic Docs: _id field - https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/mapping-id-field
- Elastic Docs: Python client configuration - https://www.elastic.co/docs/reference/elasticsearch/clients/python/configuration

## Issues Found
- The composite aggregation example claimed to sort by a metric within the aggregation. Composite aggregations order buckets by their source keys, not by computed sub-aggregation metrics. Changed the section title and wording to describe key sorting while calculating metrics.
- Several examples used `value_count` on the `_id` field. Elasticsearch restricts `_id` from use in aggregations, sorting, and scripting. Changed those examples to count the `amount` field instead.
- The Python `sorted_aggregation` method used `terms.order` with a `sum` sub-aggregation. Elasticsearch warns that ordering terms buckets by most sub-aggregations can produce incorrect results except for specific max-desc/min-asc cases. Changed the method to use a `bucket_sort` pipeline aggregation over a bounded parent terms bucket set, matching the article's bucket_sort guidance.

## Review Notes
- `bucket_sort` only sorts buckets already returned by the parent aggregation, so the parent `terms.size` remains an important correctness and performance bound.
- Composite aggregation is appropriate for sequential cursor-based bucket pagination, but it does not provide random page access or sorting by arbitrary metric values.
