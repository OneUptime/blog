# Validation Summary: How to Get Unique Count in Kibana with Elasticsearch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elasticsearch (cardinality aggregation, HyperLogLog++)
- Kibana (Lens / Visualize, dashboards)
- Elasticsearch Query DSL (date_histogram, terms, filters, bucket_script, value_count)
- Python (`elasticsearch-py` client)
- Node.js (`@elastic/elasticsearch` client)

## Sources Consulted
- Elasticsearch cardinality aggregation docs: https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-metrics-cardinality-aggregation.html
- Elasticsearch date histogram aggregation docs (calendar_interval / fixed_interval): https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-bucket-datehistogram-aggregation.html
- Elasticsearch filters aggregation docs: https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-bucket-filters-aggregation.html
- Elasticsearch bucket_script pipeline aggregation docs: https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-pipeline-bucket-script-aggregation.html
- elasticsearch-py and @elastic/elasticsearch client documentation

## Issues Found
No technical issues found.

The core technical claims were all verified as correct:
- The cardinality aggregation uses the HyperLogLog++ algorithm for approximate distinct counting.
- `precision_threshold` has a documented maximum of 40000 (values above behave as 40000) and a default of 3000 — both consistent with the post.
- Text fields cannot be used directly for cardinality without doc values/fielddata; using the `.keyword` subfield is the correct default approach.
- `calendar_interval` and `fixed_interval` are correctly used instead of the deprecated `interval` parameter.
- The `terms`, `filters`, `date_histogram`, `value_count`, `bucket_script`, and scripted-cardinality syntax are all valid Query DSL.
- The memory/error-rate tables are explicitly framed as approximations and are internally consistent (roughly linear with precision_threshold); they fall within the ballpark of documented behavior (low single-digit % error at low thresholds, sub-1% at high thresholds).

## Review Notes
- The Python (`elasticsearch-py`) and Node.js (`@elastic/elasticsearch`) examples use the `body={...}` wrapper. This still works on the 8.x clients but is deprecated in favor of passing query parameters at the top level (and is removed/disallowed in newer major client versions). The examples remain functional, so they were left as-is; a future refresh could update them to the non-`body` calling convention.
- Exact memory figures for HyperLogLog++ vary by Elasticsearch version and sparse/dense representation; the tables should continue to be read as order-of-magnitude estimates rather than guarantees.
- The funnel/filters response example omits `doc_count` fields that Elasticsearch actually returns per bucket, but this is acceptable as an illustrative, trimmed response.
