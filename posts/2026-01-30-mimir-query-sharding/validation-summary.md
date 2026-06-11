# Validation Summary: How to Implement Mimir Query Sharding

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Grafana Mimir
- Prometheus PromQL
- Kubernetes
- Grafana dashboards
- Prometheus recording rules
- Memcached result caching

## Sources Consulted
- Grafana Mimir query sharding documentation: https://grafana.com/docs/mimir/latest/references/architecture/query-sharding/
- Grafana Mimir query-frontend documentation: https://grafana.com/docs/mimir/latest/references/architecture/components/query-frontend/
- Grafana Mimir query-scheduler documentation: https://grafana.com/docs/mimir/latest/references/architecture/components/query-scheduler/
- Grafana Mimir configuration parameters: https://grafana.com/docs/mimir/latest/configure/configuration-parameters/
- Grafana Labs query sharding performance article: https://grafana.com/blog/how-we-improved-grafana-mimir-query-performance-by-up-to-10x/

## Issues Found
- The post used `query_frontend` as the YAML block name. Updated examples to use Mimir's `frontend` block and moved shard-count settings into the `limits` block where appropriate.
- The `__query_shard__` examples used `0_of_4` through `3_of_4`. Updated them to Mimir's documented one-based form, `1_of_4` through `4_of_4`.
- The shard-count formula incorrectly implied cardinality estimation can increase shards and strictly computes shards from index lookup. Reworded it to match Mimir behavior: cardinality estimates are based on previous executions and only reduce shard count within configured upper bounds.
- The cardinality-estimation section described index lookups and included unsupported `max_fetched_samples_per_query`. Replaced that with results-cache based estimation and `querier.max_samples`.
- The query scheduler example mixed ring discovery with `scheduler_address`. Changed it to a DNS-based scheduler example using `frontend.scheduler_address` and `querier.scheduler_address`.
- The monitoring metrics used non-documented sharding counters. Replaced them with documented `cortex_frontend_query_sharding_rewrites_*` counters and `cortex_frontend_sharded_queries_per_query`.
- The post claimed `histogram_quantile()` queries cannot be sharded at all. Updated the example to clarify that the full function is not shardable, but Mimir can shard the inner aggregation.
- The curl verification advice referenced an `X-Query-Parallelism` response header. Replaced it with the documented `sharded_queries` field in query-frontend query statistics logs and added a tenant header for multi-tenant Mimir.

## Review Notes
The post is now technically aligned with current Grafana Mimir documentation. The Kubernetes example remains illustrative and still omits the rest of a complete Mimir production deployment, such as object storage, memberlist or ring configuration, services, and query-scheduler deployment manifests.
