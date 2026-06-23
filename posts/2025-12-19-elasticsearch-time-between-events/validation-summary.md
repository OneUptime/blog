# Validation Summary: How to Calculate Time Between Events in Elasticsearch

## Status
validated

## Post Type
Technical tutorial

## Technologies Covered
- Elasticsearch Search API
- Elasticsearch runtime fields and script fields
- Elasticsearch aggregations and pipeline aggregations
- Elasticsearch transforms
- Elasticsearch Bulk API
- Python Elasticsearch client
- Python datetime handling

## Sources Consulted
- Elasticsearch Bulk API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-bulk
- Elasticsearch runtime fields retrieval documentation: https://www.elastic.co/guide/en/elasticsearch/reference/current/runtime-retrieving-fields.html
- Elasticsearch selected fields and script fields documentation: https://www.elastic.co/guide/en/elasticsearch/reference/current/search-fields.html
- Elasticsearch bucket script aggregation documentation: https://www.elastic.co/docs/reference/aggregations/search-aggregations-pipeline-bucket-script-aggregation
- Elasticsearch serial differencing aggregation documentation: https://www.elastic.co/docs/reference/aggregations/search-aggregations-pipeline-serialdiff-aggregation
- Elasticsearch date histogram aggregation documentation: https://www.elastic.co/docs/reference/aggregations/search-aggregations-bucket-datehistogram-aggregation
- Elasticsearch transform examples documentation: https://www.elastic.co/guide/en/elasticsearch/reference/8.19/transform-examples.html
- Python Elasticsearch client API documentation: https://elasticsearch-py.readthedocs.io/en/latest/api/elasticsearch.html

## Issues Found
- Bulk API examples used `Content-Type: application/json` and `curl -d` for NDJSON payloads. Changed them to `Content-Type: application/x-ndjson` and `--data-binary`, matching Elastic's Bulk API guidance for newline-delimited payloads.
- The serial differencing section described the example as calculating time between arbitrary sequential events. Serial differencing works over histogram buckets and compares a metric in adjacent buckets, so the section was renamed and reworded to describe adjacent populated time buckets.
- The transform example claimed to pre-calculate durations but only materialized filtered event timestamps. Added `bucket_script` aggregations for `time_to_ship_hours` and `time_to_deliver_hours` so the transform actually computes the duration metrics described.
- The Python example imported `timedelta` but did not use it. Removed the unused import.

## Review Notes
The examples assume the dynamically created string fields receive `.keyword` multi-fields and that timestamp strings are dynamically mapped as `date` fields. For production tutorials, explicit mappings would make the examples more deterministic, but the current examples are technically valid under Elasticsearch's default dynamic mapping behavior.
