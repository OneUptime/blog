# Validation Summary: How to Create Tempo Querier Configuration

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Grafana Tempo (querier, query-frontend, ingester, compactor, storage)
- TraceQL search
- Object storage backends (S3, GCS, Azure Blob Storage)
- Apache Parquet block format (vParquet4 / vParquet5)
- Redis and Memcached caching
- Prometheus alerting rules / PromQL
- OTLP (gRPC + HTTP) for ingestion
- Mermaid diagrams

## Sources Consulted
- Grafana Tempo configuration reference: https://grafana.com/docs/tempo/latest/configuration/
- Grafana Tempo source — querier config: https://github.com/grafana/tempo/blob/main/modules/querier/config.go
- Grafana Tempo source — frontend config: https://github.com/grafana/tempo/blob/main/modules/frontend/config.go
- Grafana Tempo caching documentation: https://grafana.com/docs/tempo/latest/operations/caching/
- Grafana Tempo backend search tuning: https://grafana.com/docs/tempo/latest/operations/backend_search/
- Grafana Tempo Parquet block format docs: https://grafana.com/docs/tempo/latest/configuration/parquet/

## Issues Found

1. **Invalid `querier.search_query_timeout` field (basic and production configs).**
   The post placed `search_query_timeout` directly under `querier:`. The real
   field is `querier.search.query_timeout`. Restructured both YAML examples to
   nest the timeout under a `search:` sub-block, and updated the prose key
   reference accordingly.

2. **Misleading comment on `s3.insecure`.**
   The comment claimed `insecure: false` enables server-side encryption. In
   Tempo's S3 backend, `insecure` controls whether the client uses HTTP
   instead of HTTPS — it has nothing to do with server-side encryption.
   Rewrote the comment to describe the actual behavior.

3. **Outdated block version recommendation (`vParquet3`).**
   `vParquet4` is the current default in recent Tempo releases and
   `vParquet5` is also available. Updated both YAML snippets and the
   accompanying comment to recommend `vParquet4` and mention `vParquet5`.

4. **Invented `querier.search.prefer_self` and `querier.search.external_endpoints` fields.**
   Neither field exists in Tempo's `SearchConfig`. (`external_endpoints` is a
   `querier.trace_by_id.external` concept, not a search setting; `prefer_self`
   is not a Tempo option at all.) Replaced the block with a valid
   `query_timeout` setting under `querier.search`.

5. **Invalid `query_frontend.address` field.**
   The frontend listens on the ports defined in the top-level `server` block
   (`grpc_listen_port` for queriers connecting via `frontend_worker`,
   `http_listen_port` for HTTP clients) — there is no `address` field on
   `query_frontend`. Replaced it with the valid `max_outstanding_per_tenant`
   field and added a brief sentence clarifying how the frontend address is
   actually configured.

6. **Mislabeled `default_result_limit` in section 5.**
   The comment described it as "Number of shards for parallel search
   execution," but `default_result_limit` is the default number of search
   results returned. Corrected the comment.

## Review Notes

- The post uses the `storage.trace.cache` nested cache configuration, which
  works but is the legacy path. Modern Tempo (2.3+) prefers a top-level
  `cache:` block with named roles (`bloom`, `parquet-footer`, `parquet-page`,
  `frontend-search`, `trace-id-index`, etc.). The current syntax still
  functions, so this was left as written rather than rewritten — it remains
  technically valid for current Tempo versions but readers deploying fresh
  installations should consider migrating to the top-level cache block.
- The post mixes Redis and Memcached as roughly equivalent cache backends.
  Tempo's Redis support has historically been marked experimental in the
  docs; Memcached is the more battle-tested option in production. This is a
  caveat worth knowing but not a factual error in the post.
- Mermaid diagrams render correctly and accurately depict the high-level
  data flow.
- The Prometheus metric names (`tempo_querier_query_duration_seconds_bucket`,
  `tempo_querier_query_total`, `tempo_cache_hits_total`,
  `tempo_cache_misses_total`, `tempo_querier_bytes_processed_total`) follow
  Tempo's standard `tempo_*` naming convention. They are presented as
  illustrative monitoring targets; operators should verify exact metric
  names against the version of Tempo they run, as some names have shifted
  across releases.
- The `frontend_worker.grpc_client_config` block in the production example
  uses dskit's gRPC client settings, which is a valid Tempo configuration
  point.
- The `ingestion_rate_limit_bytes` field in the per-tenant overrides is an
  ingestion-side limit and not a querier setting, but its presence in a
  per-tenant overrides example is reasonable since overrides are shared
  across components.
