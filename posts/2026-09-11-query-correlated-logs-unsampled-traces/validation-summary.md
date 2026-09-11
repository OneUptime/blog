# Validation Summary: Query Correlated Logs in Loki or Elasticsearch Without Sampled Traces

## Status
validated

## Post Type
Technical guide with structured logging examples, Loki queries, and Elasticsearch mapping and search requests.

## Technologies Covered
- OpenTelemetry trace context, sampling, and log correlation
- Grafana Loki, LogQL, stream labels, and structured metadata
- Elasticsearch mappings, keyword fields, and Query DSL
- JSON structured logging and HTTP API requests
- .NET activity creation and listener behavior

## Sources Consulted
- [OpenTelemetry tracing SDK and sampling](https://opentelemetry.io/docs/specs/otel/trace/sdk/#sampling)
- [OpenTelemetry tracing API and SpanContext](https://opentelemetry.io/docs/specs/otel/trace/api/#spancontext)
- [Microsoft ActivitySource.StartActivity](https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.activitysource.startactivity?view=net-10.0)
- [Loki LogQL log queries](https://grafana.com/docs/loki/latest/query/log_queries/)
- [Loki structured metadata](https://grafana.com/docs/loki/latest/get-started/labels/structured-metadata/)
- [Elasticsearch keyword mapping](https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/keyword)
- [Elasticsearch ignore_above](https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/ignore-above)
- [Elasticsearch create index API](https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-create)
- [Elasticsearch term query](https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-term-query)
- [Elasticsearch Boolean query](https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-bool-query)
- [Elasticsearch range query](https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-range-query)
- [Elasticsearch sorting](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/sort-search-results)
- [Elasticsearch pagination](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/paginate-search-results)
- [Elasticsearch data stream modification](https://www.elastic.co/docs/manage-data/data-store/data-streams/modify-data-stream)
- [Author profile](https://github.com/nawazdhandala) — checked the linked profile destination.

## Issues Found
No technical issues found.

## Review Notes
- Reviewed all examples and implementation claims against official documentation. README.md was left unchanged.
- OpenTelemetry generates span identifiers independently of sampling decisions. Valid non-recording span contexts support the proposed log enrichment; all-zero identifiers are invalid. The example trace and span IDs have the correct hexadecimal lengths. Microsoft documentation also confirms that activity creation can return null without listeners.
- Both LogQL queries use supported stream selectors, JSON parsing, error filtering, and exact string field filters. The post correctly distinguishes ingestion labels from query-time extraction and explains collisions and structured metadata. Actual label names and retained data remain deployment prerequisites.
- The Elasticsearch create-index mapping and search request use supported APIs and Query DSL. Keyword fields suit exact identifiers, while ignore_above is an indexing threshold rather than format validation. The data stream advice correctly distinguishes template updates from changes to previously indexed documents.
- Parsed the example log record and both HTTP JSON bodies with Python. Checked identifier lengths, agreement between the correlation filter and example record, and coverage of the record fields by the mapping.
- The search returns at most 100 matching documents in timestamp order. Larger investigations require pagination; equal timestamps alone do not establish causal order across services. These are operational considerations, not errors in the example.
- The HTTP snippets describe API requests, not terminal commands. No CLI examples or pinned software versions require additional checks. The linked documentation pages resolved to the intended resources, and no deprecated feature was identified in the examples.
- Validation consisted of documentation review and local payload checks. No queries were executed against live Loki or Elasticsearch deployments; ingestion, propagation, authorization, retention, and exporter behavior were not integration-tested.
