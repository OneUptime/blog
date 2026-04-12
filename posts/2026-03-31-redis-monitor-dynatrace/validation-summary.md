# Validation Summary: How to Monitor Redis with Dynatrace

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis
- Dynatrace OneAgent
- Dynatrace Extension Framework (Redis Extension)
- Dynatrace PurePaths (distributed tracing)
- Dynatrace Metrics Ingest API v2
- Dynatrace Anomaly Detection
- Python (requests library)
- Java (Jedis, Lettuce)
- Node.js (ioredis)

## Sources Consulted
- Dynatrace Deployment API - OneAgent installer download: https://docs.dynatrace.com/docs/dynatrace-api/environment-api/deployment/oneagent/download-oneagent-latest
- Dynatrace Metrics API v2 - POST ingest data points: https://docs.dynatrace.com/docs/dynatrace-api/environment-api/metric-v2/post-ingest-metrics
- Dynatrace metric ingestion protocol: https://docs.dynatrace.com/docs/ingest-from/extend-dynatrace/extend-metrics/reference/metric-ingestion-protocol
- Dynatrace Hub - Redis monitoring: https://www.dynatrace.com/hub/detail/redis/
- Dynatrace Hub - Redis 2.0 extension: https://www.dynatrace.com/hub/detail/redis-20/
- Dynatrace Redis 2.0 extension docs: https://docs.dynatrace.com/docs/observe/infrastructure-observability/extensions/redis-20
- Dynatrace API authentication / access tokens: https://docs.dynatrace.com/docs/manage/identity-access-management/access-tokens-and-oauth-clients/access-tokens

## Issues Found
No technical issues found.

## Review Notes
- The OneAgent installer download URL passes the API token as a query parameter (`?Api-Token=`), which is a valid but not recommended approach per Dynatrace docs (the `Authorization` header method is preferred to avoid token exposure in logs). The post already instructs readers to replace placeholder values, so this is acceptable for an illustrative example.
- The Dynatrace Hub lists "Java Redis" as a supported auto-instrumented client rather than explicitly naming "Jedis." Jedis is the most widely used Java Redis client and is almost certainly what "Java Redis" refers to, so the claim is reasonable but technically ambiguous.
- The `DYNATRACE_TOKEN` variable in the Python example is used without being defined in the function scope. This is a standard pattern for illustrative code examples (implying it's a global or environment-sourced constant) and is not a bug.
- Dashboard metric names (e.g., `redis.memory.used_bytes`, `redis.commands.calls.persecond`) are presented in a descriptive text block rather than as executable configuration. Exact metric key names may vary by extension version and should be verified in the user's specific Dynatrace environment.
- The keyspace hit ratio tile (`redis.keyspace.hits / (hits + misses)`) would require a metric expression or calculated metric in practice, not a simple metric tile. This is presented as a conceptual description rather than literal configuration syntax.
