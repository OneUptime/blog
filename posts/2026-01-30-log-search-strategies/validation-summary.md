# Validation Summary: How to Build Log Search Strategies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Elasticsearch
- OpenSearch
- OpenTelemetry semantic conventions and logs data model
- TypeScript
- Elasticsearch JavaScript client
- JSON index mappings
- curl-based REST API requests

## Sources Consulted
- Elasticsearch bool query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-bool-query
- Elasticsearch JavaScript client API reference: https://www.elastic.co/docs/reference/elasticsearch/clients/javascript/api-reference
- Elasticsearch terms aggregation documentation: https://www.elastic.co/docs/reference/aggregations/search-aggregations-bucket-terms-aggregation
- Elasticsearch stats aggregation documentation: https://www.elastic.co/docs/reference/aggregations/search-aggregations-metrics-stats-aggregation
- Elasticsearch field data types documentation: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/field-data-types
- Elasticsearch keyword field documentation: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/keyword
- Elasticsearch text field documentation: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/text
- Elasticsearch range query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-range-query
- OpenSearch Query DSL documentation: https://docs.opensearch.org/latest/query-dsl/
- OpenTelemetry logs data model: https://opentelemetry.io/docs/specs/otel/logs/data-model/
- OpenTelemetry service semantic attributes: https://opentelemetry.io/docs/specs/semconv/registry/attributes/service/
- OpenTelemetry error semantic attributes: https://opentelemetry.io/docs/specs/semconv/registry/attributes/error/
- OpenTelemetry exception log semantic conventions: https://opentelemetry.io/docs/specs/semconv/exceptions/exceptions-logs/

## Issues Found
- The post stated that the sample field names followed OpenTelemetry semantic conventions. Some fields are conventional log aliases rather than strict OpenTelemetry log data model fields, so the wording was corrected to explain that the example borrows from OpenTelemetry and should be mapped to `service.name`, `SeverityText`, `Body`, `TraceId`, and `SpanId` when strict OpenTelemetry compatibility is required.
- The TypeScript Elasticsearch client examples used the older `body` wrapper style. Current Elasticsearch JavaScript client documentation lists request body fields such as `query`, `aggregations`, `sort`, `size`, and `_source` as top-level request properties, so the examples were updated.
- The triage TypeScript example used a `stats` aggregation on `timestamp` and then read `min_as_string` and `max_as_string`. The official stats aggregation response documents numeric stats, so the example now uses explicit `min` and `max` aggregations and converts returned epoch-millisecond values to ISO strings.
- The TypeScript snippets referenced `ElasticsearchClient` and `LogEntry` without defining them. Imports and a minimal `LogEntry` type alias were added so the examples are syntactically complete.
- Exact-match filters in the TypeScript snippets used `match` queries against keyword-like fields. These were changed to `term` queries in filter context to match Elasticsearch/OpenSearch term-level query semantics for exact values.

## Review Notes
The REST API examples, mapping snippet, time-range filters, terms aggregations, and keyword/text guidance are technically valid for Elasticsearch-style Query DSL and are broadly compatible with OpenSearch. In production, teams may prefer `@timestamp` or a strict OpenTelemetry export schema depending on their ingestion pipeline, but the post's custom schema is valid once the mapping expectations are documented.
