# Validation Summary: How to Build Tempo Search Tags

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Grafana Tempo (distributed tracing backend)
- TraceQL (Tempo query language)
- Parquet block format (vParquet4 / vParquet5)
- OpenTelemetry / OTLP
- Prometheus metrics and alerting
- Object storage (S3) backend
- Mermaid diagrams

## Sources Consulted
- [Grafana Tempo Configuration](https://grafana.com/docs/tempo/latest/configuration/)
- [Grafana Tempo Configuration Manifest](https://grafana.com/docs/tempo/latest/configuration/manifest/)
- [Tempo Parquet Block Format](https://grafana.com/docs/tempo/latest/configuration/parquet/)
- [Tempo Dedicated Attribute Columns](https://grafana.com/docs/tempo/latest/operations/dedicated_columns/)
- [TraceQL Reference](https://grafana.com/docs/tempo/latest/traceql/)
- [TraceQL Query Construction](https://grafana.com/docs/tempo/latest/traceql/construct-traceql-queries/)
- [Monitor Tempo](https://grafana.com/docs/tempo/latest/operations/monitor/)
- [Tempo HTTP API](https://grafana.com/docs/tempo/latest/api_docs/)

## Issues Found

1. **Fictional `search_tags` configuration block.** The post centered Section 4, Section 8 (Pitfall 1 and Pitfall 4), and Section 10 (Step 4) on an `overrides.defaults.search_tags` field with `resource_attributes` and `span_attributes` string arrays. This configuration does not exist in Tempo. The actual feature is `parquet_dedicated_columns`, which is an array of objects with `name`, `type` (`string` or `int`), and `scope` (`resource`, `span`, `event`). Rewrote all of these sections to use the correct field and structure, and noted the per-scope column limits (10 on vParquet4, 20 strings + 5 ints on vParquet5).

2. **Outdated block format version (`vParquet3`).** Replaced with `vParquet4` (current default) and noted that `vParquet5` is also available. vParquet3 is no longer documented as a valid option in current Tempo.

3. **Non-existent `prefer_self` field under querier.search.** Removed from Section 4 and Section 7 — this field does not appear in the Tempo configuration manifest.

4. **`concurrent_jobs` placed under `querier.search`.** The actual location is `query_frontend.search.concurrent_jobs`. Moved it in Section 7 and added the related `target_bytes_per_job`, `default_result_limit`, and `max_result_limit` fields.

5. **Invalid TraceQL `rate()` aggregator.** TraceQL supports only `count`, `avg`, `max`, `min`, and `sum`. Rewrote the "Error rate by service" example to use `count()`.

6. **Invalid unscoped TraceQL search `{ "order-12345" }`.** TraceQL requires a scoped attribute filter; a bare string in braces is not valid syntax. Replaced with a scoped equivalent.

7. **Updated default value for `bloom_filter_shard_size_bytes`.** The documented default is `102400`, not `100000`. Corrected in Section 7.

8. **Unverified / fabricated Prometheus metric names in Section 9.** Replaced `tempo_query_frontend_search_query_seconds_bucket`, `tempo_bloom_filter_inserts_total`, `tempo_querier_blocks_inspected_total`, `tempo_ingester_index_bytes`, and `tempo_span_received_total` (used in Step 3) with real, documented metrics: `tempo_query_frontend_request_duration_seconds_bucket`, `tempo_query_frontend_bytes_inspected_total`, `tempo_ingester_live_trace_bytes`, and `tempodb_backend_request_duration_seconds_count`. Adjusted the alerting rules and dashboard guidance to match.

9. **Step 3 cardinality validation example.** Replaced the fabricated PromQL query against `tempo_span_received_total` with a curl call to the documented `/api/v2/search/tag/<TraceQL identifier>/values` endpoint, using the correct scoped identifier `span.order.id`.

10. **Conceptual framing of "search tags".** Updated the intro, Section 1, Section 2, Section 6 intro, and Summary to reflect how modern Tempo actually works: Parquet makes every attribute searchable; dedicated columns are a performance optimization, not a prerequisite for searchability. Adjusted Pitfall 3 wording accordingly. Kept the author's structure, headings, and tone intact.

## Review Notes

- The post title and the "Search Tags" terminology are widely used colloquially in the Tempo community, but the official documentation now talks about "dedicated attribute columns." The post still uses the colloquial framing in headings (kept intact per the no-restructuring guideline) but the body now consistently refers to the actual feature name.
- The Mermaid architecture diagrams reference a generic "Tag Index" subgraph. This is a simplification — Tempo's index information is split between bloom filters (for trace ID lookups) and Parquet column metadata. Left as-is because the diagrams are conceptual and not technically wrong.
- The "shorthand" forms `status = error` and `duration > 2s` in TraceQL examples work in practice; the canonical intrinsic syntax is `span:status` and `span:duration`. The post uses the shorthand throughout, which is acceptable but could be modernized in a future revision.
- The `query_frontend.search.results_cache` block in Section 7 reflects an older configuration style; newer Tempo releases configure caches under a top-level `cache:` block. Added a parenthetical note rather than rewriting, since the older style still works.
- vParquet4 caps dedicated columns at 10 per scope. The original post listed 7 resource and 14 span attributes; the rewritten example trims to 6 resource and 10 span attributes so it actually deploys on vParquet4 (and easily fits within vParquet5 limits as well).
