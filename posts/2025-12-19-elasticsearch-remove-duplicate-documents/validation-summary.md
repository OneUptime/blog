# Validation Summary: How to Remove Duplicate Documents in Elasticsearch

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Elasticsearch search aggregations
- Elasticsearch Delete by Query API
- Elasticsearch Transforms
- Elasticsearch Watcher
- Elasticsearch Python client
- Python
- curl

## Sources Consulted
- Elasticsearch `_id` field documentation: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/mapping-id-field
- Elasticsearch top hits aggregation documentation: https://www.elastic.co/docs/reference/aggregations/search-aggregations-metrics-top-hits-aggregation
- Elasticsearch cardinality aggregation documentation: https://www.elastic.co/docs/reference/aggregations/search-aggregations-metrics-cardinality-aggregation
- Elasticsearch terms aggregation documentation: https://www.elastic.co/docs/reference/aggregations/search-aggregations-bucket-terms-aggregation
- Elasticsearch composite aggregation documentation: https://www.elastic.co/docs/reference/aggregations/search-aggregations-bucket-composite-aggregation
- Elasticsearch Delete by Query API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-delete-by-query
- Elasticsearch Transform create API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-transform-put-transform
- Elasticsearch Count API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-count
- Elasticsearch IDs query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-ids-query
- Elasticsearch Watcher compare condition documentation: https://www.elastic.co/docs/explore-analyze/alerting/watcher/condition-compare
- Elasticsearch Python client examples: https://www.elastic.co/docs/reference/elasticsearch/clients/python/examples
- Elasticsearch Python client helpers documentation: https://www.elastic.co/docs/reference/elasticsearch/clients/python/client-helpers

## Issues Found
- The post used `value_count` on the `_id` metadata field. Elasticsearch documents that `_id` is restricted from aggregations, sorting, and scripting, so these examples could fail on current Elasticsearch versions. I changed those counts to use `order_id.keyword` where appropriate and used the Count API in the complete script for total document count.
- The "Count Total Duplicates" aggregation labeled a cardinality result as total duplicates. Cardinality counts unique values and is approximate above its precision threshold. I renamed the aggregation to `unique_order_ids`, added `total_orders`, and set `precision_threshold` to the documented maximum of `40000`.
- The reindexing snippets sorted `scan()` results but did not pass `preserve_order=True`. The Python client documents that `scan()` does not preserve sort order by default, so the snippets could keep the wrong document. I added `preserve_order=True`.
- The bulk helper examples unpacked `(success, errors)` while leaving default error behavior in place. The helper raises on errors by default, so I added `raise_on_error=False` where the code inspects the returned error list.
- The transform example used a pivot transform with scripted metrics to approximate latest-document selection. Elasticsearch has a `latest` transform type specifically for finding the latest document for each unique key, so I changed the example to use `latest.unique_key` and `latest.sort`.
- The complete script used a `bucket_selector` pipeline aggregation under a composite aggregation. Elasticsearch documentation states composite aggregations are not currently compatible with pipeline aggregations. I replaced that logic with ordered scanning by duplicate key and timestamp.
- The complete script divided by `total` when printing the duplicate ratio, which would raise for an empty index. I added the same zero-document guard already used in the returned ratio.

## Review Notes
- The examples assume `order_id` has a `.keyword` multi-field and `created_at` is mapped as a sortable date field.
- The examples use `verify_certs=False` for local demonstration. Production code should validate TLS certificates.
- The cardinality aggregation remains approximate for high-cardinality datasets, even with `precision_threshold` set to `40000`.
