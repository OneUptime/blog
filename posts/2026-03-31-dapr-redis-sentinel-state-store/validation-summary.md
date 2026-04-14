# Validation Summary: How to Use Redis Sentinel with Dapr State Store

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (state store component)
- Redis Sentinel (high availability)
- Bitnami Redis Helm chart
- Kubernetes (kubectl, Helm)
- Dapr JavaScript SDK (@dapr/dapr)

## Sources Consulted
- Dapr Redis State Store component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Redis Sentinel documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Bitnami Redis Helm chart documentation: https://github.com/bitnami/charts/tree/main/bitnami/redis
- Dapr JavaScript SDK documentation: https://docs.dapr.io/developing-applications/sdks/js/
- Previously validated Dapr Redis posts in the same blog repository

## Issues Found
1. **Incorrect grep pattern for Sentinel failover logs (line 96)**: The grep pattern used `LFAILOVER` which is not a valid Redis Sentinel log string. Redis Sentinel uses event names like `+try-failover`, `+failover-state-select-slave`, `+failover-end`, and `+elected-leader`. Changed `grep "LFAILOVER\|elected"` to `grep "failover\|elected-leader"` to match actual Sentinel log output.

## Review Notes
- All Dapr component metadata fields (`redisHost`, `sentinelMasterName`, `failover`, `maxRetries`, `maxRetryBackoff`, `redisPassword` with `secretKeyRef`) are correct per official Dapr documentation.
- The `apiVersion: dapr.io/v1alpha1`, `kind: Component`, `type: state.redis`, and `version: v1` are all correct.
- The Bitnami Helm chart parameters (`architecture=replication`, `sentinel.enabled=true`, `sentinel.quorum=2`, `replica.replicaCount=3`, `auth.password`) are valid.
- The `DEBUG sleep 60` command is a valid way to simulate primary unresponsiveness for failover testing, though it requires the DEBUG command to be enabled (default in most configurations).
- The Sentinel vs Cluster comparison table is accurate.
- The JavaScript SDK usage (`DaprClient`, `client.state.get()`) is correct for the current @dapr/dapr package.
