# Validation Summary: How to Fix Elasticsearch Rejecting OpenTelemetry Data Due to Index Template

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry semantic conventions
- OpenTelemetry Transform Processor / OTTL
- Elasticsearch
- Elasticsearch index templates and mappings
- Elasticsearch exporter for OpenTelemetry Collector

## Sources Consulted
- Elasticsearch dynamic templates documentation: https://www.elastic.co/guide/en/elasticsearch/reference/8.19/dynamic-templates.html
- Elasticsearch coerce mapping parameter documentation: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/coerce
- Elasticsearch index statistics API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-stats
- OpenTelemetry Collector Contrib Elasticsearch exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/elasticsearchexporter/README.md
- OpenTelemetry Collector Contrib Transform Processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry common specification concepts for attribute value types: https://opentelemetry.io/docs/specs/otel/common/
- OpenTelemetry HTTP semantic convention attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/http/

## Issues Found
- The post used deprecated `http.status_code` examples. Updated examples to the stable `http.response.status_code` attribute, which the current OpenTelemetry HTTP semantic conventions define as the replacement.
- The post described OpenTelemetry attributes as "dynamically typed." Updated this to clarify that attributes have explicit value types, but different services can still send inconsistent types for the same key.
- The "keyword vs text" conflict example implied Elasticsearch chooses between `keyword` and `text` based on string length. Updated it to describe template-driven mapping differences instead.
- The index template explanation implied keyword dynamic templates solve all attribute conflicts. Updated it to clarify that object-valued attributes still require object mappings or Collector-side normalization.
- The Elasticsearch exporter example used `mapping.mode`, `flush.bytes`, and `retry.max_requests`, which are deprecated or ignored in current exporter documentation. Replaced the example with `elastic.mapping.mode` set via the Transform Processor scope context, `sending_queue.batch.max_size`, and `retry.max_retries`.
- The exporter mapping section omitted the current Elasticsearch version caveat. Added that `ecs` and `otel` mapping modes require Elasticsearch 8.12 or later.

## Review Notes
The post is technically relevant and valid after corrections. Future improvements could mention that ECS mapping mode is documented as unstable in the current exporter docs and that `otel` is the default and recommended mapping mode for newer Elasticsearch deployments.
