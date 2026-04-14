# Validation Summary: How to Use Dapr with Redis Enterprise

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Dapr (state store and pub/sub components)
- Redis Enterprise (on Kubernetes)
- Redis Enterprise Operator for Kubernetes
- Redis Enterprise Active-Active (CRDB) geo-distribution
- Redis modules (RediSearch, RedisTimeSeries)

## Sources Consulted
- Dapr Redis State Store component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr Redis Pub/Sub component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-redis-pubsub/
- Redis Enterprise Kubernetes Operator quick start: https://redis.io/docs/latest/operate/kubernetes/deployment/quick-start/
- RedisEnterpriseCluster API reference: https://redis.io/docs/latest/operate/kubernetes/7.8.6/reference/redis_enterprise_cluster_api/
- RedisEnterpriseDatabase API reference: https://redis.io/docs/latest/operate/kubernetes/7.8.6/reference/redis_enterprise_database_api/
- Redis Enterprise module configuration for Kubernetes: https://redis.io/docs/latest/operate/kubernetes/re-databases/modules/
- crdb-cli crdb create reference: https://redis.io/docs/latest/operate/rs/references/cli-utilities/crdb-cli/crdb/create/
- GitHub: RedisLabs/redis-enterprise-k8s-docs: https://github.com/RedisLabs/redis-enterprise-k8s-docs

## Issues Found
1. **`maxConnections` is not a valid Dapr Redis metadata field** (Performance Tuning section). The correct field name is `poolSize`, which controls the maximum number of socket connections. Changed `maxConnections` to `poolSize`. Source: Dapr Redis component documentation.

## Review Notes
- The `version` field in the RedisEnterpriseDatabase `modulesList` is deprecated per the Redis Enterprise API reference and will be removed in future releases. For Redis 8+, bundled modules are automatically enabled. The blog could note this deprecation for future-proofing.
- The Redis Enterprise Operator installation uses the `master` branch URL. Best practice is to pin to a specific version or use Helm (now the recommended installation method per Redis docs). The URL still works.
- Several Dapr metadata values in the pub/sub and performance tuning sections are set to their documented defaults (`concurrency: "10"`, `processingTimeout: "15s"`, `dialTimeout: "5s"`, `readTimeout: "3s"`, `writeTimeout: "3s"`, `poolTimeout: "4s"`). This is not an error -- explicitly stating defaults is a reasonable documentation practice.
- The RedisEnterpriseCluster and RedisEnterpriseDatabase CRD definitions are correct, including apiVersions, field names, and values.
- The crdb-cli Active-Active database creation command syntax is correct.
- All Dapr state store and pub/sub metadata fields are valid and correctly named.
