# Validation Summary: How to Track Elasticsearch Indexing Rate, Search Latency, and Merge Throughput

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Elasticsearch receiver
- Elasticsearch node stats, cluster health, and index stats APIs
- Elasticsearch indexing, search, merge, and indexing-pressure metrics
- YAML collector configuration

## Sources Consulted
- OpenTelemetry Collector contrib Elasticsearch receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/elasticsearchreceiver
- OpenTelemetry Collector contrib Elasticsearch receiver generated metric metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/elasticsearchreceiver/metadata.yaml
- OpenTelemetry Collector contrib Elasticsearch receiver generated metric documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/elasticsearchreceiver/documentation.md
- Elasticsearch Get index statistics API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-stats

## Issues Found
- The post used non-existent receiver metric names such as `elasticsearch.indices.search.query.total`, `elasticsearch.indices.search.fetch.time`, `elasticsearch.indices.merges.total_size`, and `elasticsearch.indexing.index.total`. Replaced these with the current receiver metrics: `elasticsearch.index.operations.completed`, `elasticsearch.index.operations.time`, `elasticsearch.index.operations.merge.current`, `elasticsearch.index.operations.merge.docs_count`, and `elasticsearch.index.operations.merge.size`.
- The collector configuration had duplicate metric keys after the original split between indexing, search, and merge metrics. Consolidated the shared operation metrics so the YAML example has unique keys and parses cleanly.
- The search and indexing latency formulas divided cumulative counters directly without clarifying that this produces a lifetime average. Added rate-based formulas for recent latency over a 5-minute window.
- The indexing rejection alert used an unsupported `operation="index_failed"` value. Replaced it with the receiver's indexing-pressure rejection counters for primary and replica stages.
- The post described the receiver as collecting these metrics from the "cluster API." Updated this to the receiver's documented sources: Elasticsearch node stats, cluster health, and index stats APIs.
- The "Bulk Indexing" section listed per-index operation metrics rather than bulk-specific receiver metrics. Renamed the section to "Per-Index Indexing" and updated the metric descriptions.

## Review Notes
The alert examples remain pseudo-YAML because no specific alerting backend syntax is declared. The metric names and attributes now match the current OpenTelemetry Collector contrib Elasticsearch receiver documentation.
