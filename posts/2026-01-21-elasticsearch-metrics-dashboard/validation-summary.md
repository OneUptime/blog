# Validation Summary: How to Build a Metrics Dashboard with Elasticsearch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elasticsearch indices, mappings, data streams, and index templates
- Elasticsearch search aggregations and pipeline aggregations
- Elasticsearch Watcher alerts
- Elasticsearch Index Lifecycle Management
- Elasticsearch transforms
- Kibana Lens visualizations
- Python Elasticsearch client
- curl and JSON API examples

## Sources Consulted
- Elasticsearch data streams overview: https://www.elastic.co/docs/manage-data/data-store/data-streams
- Elasticsearch data stream usage: https://www.elastic.co/docs/manage-data/data-store/data-streams/use-data-stream
- Elasticsearch index templates: https://www.elastic.co/docs/manage-data/data-store/templates
- Elasticsearch date histogram aggregation: https://www.elastic.co/docs/reference/aggregations/search-aggregations-bucket-datehistogram-aggregation
- Elasticsearch percentiles aggregation: https://www.elastic.co/docs/reference/aggregations/search-aggregations-metrics-percentile-aggregation
- Elasticsearch moving function aggregation: https://www.elastic.co/docs/reference/aggregations/search-aggregations-pipeline-movfn-aggregation
- Elasticsearch ILM phases and actions: https://www.elastic.co/docs/manage-data/lifecycle/index-lifecycle-management/index-lifecycle
- Elasticsearch ILM force merge action: https://www.elastic.co/docs/reference/elasticsearch/index-lifecycle-actions/ilm-forcemerge
- Elasticsearch ILM readonly action: https://www.elastic.co/docs/reference/elasticsearch/index-lifecycle-actions/ilm-readonly
- Elasticsearch Watcher put watch API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-watcher-put-watch
- Elasticsearch Watcher webhook action: https://www.elastic.co/docs/explore-analyze/alerting/watcher/actions-webhook
- Python Elasticsearch client connection documentation: https://www.elastic.co/docs/reference/elasticsearch/clients/python/connecting
- Kibana Lens documentation: https://www.elastic.co/docs/explore-analyze/visualize/lens

## Issues Found
- The moving average query used the removed `moving_avg` pipeline aggregation. Replaced it with the current `moving_fn` aggregation and the documented `MovingFunctions.unweightedAvg(values)` and `MovingFunctions.ewma(values, 0.3)` scripts.
- The Watcher Slack webhook example did not set a JSON content type. Added a `Content-Type: application/json` header so the webhook body is sent as JSON.
- The ILM policy used the old `freeze` action in the cold phase. Replaced it with the supported `readonly` action; current ILM docs list searchable snapshot as the frozen-phase mechanism rather than a cold-phase `freeze` action.

## Review Notes
- The Elasticsearch query, mapping, data stream, Watcher, transform, and Python client examples are technically valid after the edits, assuming the referenced metric fields exist in the target indices.
- The Kibana Lens JSON snippets are best treated as illustrative saved-object fragments. Kibana Lens saved object internals can vary by Kibana version and usually require data view references when imported.
