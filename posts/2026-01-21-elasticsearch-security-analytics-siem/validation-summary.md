# Validation Summary: How to Use Elasticsearch for Security Analytics (SIEM)

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Elasticsearch
- Elastic Common Schema (ECS)
- Elasticsearch Query DSL
- Elasticsearch aggregations and pipeline aggregations
- Elasticsearch enrich policies and ingest pipelines
- Elasticsearch Watcher
- Python Elasticsearch client

## Sources Consulted
- Elasticsearch Search API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search
- Elasticsearch enrich processor reference: https://www.elastic.co/docs/reference/enrich-processor/enrich-processor
- Elasticsearch enrich setup documentation: https://www.elastic.co/docs/manage-data/ingest/transform-enrich/set-up-an-enrich-processor
- Elasticsearch bucket selector aggregation reference: https://www.elastic.co/docs/reference/aggregations/search-aggregations-pipeline-bucket-selector-aggregation
- Elasticsearch Watcher webhook action documentation: https://www.elastic.co/docs/explore-analyze/alerting/watcher/actions-webhook
- Elastic Common Schema threat fields: https://www.elastic.co/docs/reference/ecs/ecs-threat
- Elastic Common Schema event fields: https://www.elastic.co/guide/en/ecs/1.12/ecs-event.html
- Python Elasticsearch client examples and API documentation: https://www.elastic.co/docs/reference/elasticsearch/clients/python/examples and https://elasticsearch-py.readthedocs.io/en/latest/api/elasticsearch.html

## Issues Found
- The threat mapping used `threat.tactic` and `threat.technique` as keyword fields, but ECS defines fields such as `threat.tactic.name` and `threat.technique.name`. Updated the mapping and malware sample event to use ECS-compatible object field shapes.
- The threat indicator mapping used `threat.indicator.file_hash`, which does not match the ECS field set for file hashes under threat indicators. Replaced it with `threat.indicator.file.hash.sha256`.
- The threat intelligence enrichment example wrote a numeric `confidence` field to `threat.indicator.confidence`, but ECS defines `threat.indicator.confidence` as a keyword confidence label. Renamed the numeric field to `confidence_score` and updated the enrich policy and sort query accordingly.
- The "Impossible Travel Detection" query only grouped login locations and countries; it did not calculate travel speed or distance. Renamed the example to "Multi-Country Login Review" and updated the summary wording to avoid overstating the detection logic.
- The Watcher webhook example posted JSON to Slack without a `Content-Type` header. Added a `Content-Type: application/json` header using Watcher's documented `headers` field.
- The Python example imported unused modules and annotated methods returning lists as `Dict`. Removed unused imports and corrected the return type hints for the list-returning detection methods.

## Review Notes
The examples are valid Elasticsearch REST API and Python client examples, but they remain tutorial-level detection patterns. Production SIEM deployments should normally use data streams or index lifecycle management, tested shard sizing, built-in Elastic Security detection rules where applicable, and tuned thresholds based on local baselines.
