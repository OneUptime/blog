# Validation Summary: How to Implement Loki Querier Configuration

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Grafana Loki
- LogQL
- Loki querier
- Loki query frontend
- Loki query scheduler
- Loki runtime configuration
- Loki caching and limits configuration

## Sources Consulted
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configure/
- Grafana Loki query troubleshooting documentation: https://grafana.com/docs/loki/latest/query/troubleshoot-query/
- Grafana Loki LogQL documentation: https://grafana.com/docs/loki/latest/logql/

## Issues Found
- The querier examples used `querier.engine.timeout`, but current Loki configuration uses `limits_config.query_timeout` for query backend timeouts. I moved timeout examples to `limits_config`.
- The `max_look_back_period` comments described it as a general query lookback limit. Loki documents it as applying to instant log queries, while the general query lookback limit is `limits_config.max_query_lookback`. I corrected the comments and the limits example.
- The parallelism example nested `query_range` under `querier` and placed `max_query_parallelism` under `query_range`. I moved `query_range` to the top level and placed `max_query_parallelism` under `limits_config`.
- The frontend worker example used `parallelism`, which is not documented in the current `frontend_worker` block. I removed it and added `dns_lookup_duration`, while clarifying `frontend_address` versus `scheduler_address`.
- The per-tenant override example showed `overrides` as top-level Loki config. Loki documents per-tenant overrides as runtime configuration, so I added `runtime_config` and labeled the overrides as runtime config file contents.
- The query frontend example used `query_frontend`, `address`, and scheduler gRPC server fields in unsupported locations. I changed the block to `frontend`, moved retries to `query_range.max_retries`, and used `query_scheduler.grpc_client_config`.
- The cache example used unsupported `storage_config.index_cache` and `storage_config.chunk_cache` blocks. I changed them to `storage_config.index_queries_cache_config` and `chunk_store_config.chunk_cache_config`.
- The production example repeated the invalid timeout and frontend worker fields. I updated it to match the corrected configuration patterns.

## Review Notes
The corrected examples are aligned with the current Loki configuration reference. The production configuration is still illustrative and omits required deployment-specific storage and schema settings, so readers should combine it with a complete Loki deployment configuration.
