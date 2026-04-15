# Validation Summary: How to Use Dapr with Amazon MemoryDB for Redis

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Dapr (state store and pub/sub components)
- Amazon MemoryDB for Redis
- AWS CloudWatch
- Kubernetes (secrets, pod networking)
- Dapr JavaScript SDK (`@dapr/dapr`)
- Redis CLI

## Sources Consulted
- Dapr Redis State Store component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr Redis Pub/Sub component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-redis-pubsub/
- Dapr JavaScript SDK documentation: https://docs.dapr.io/developing-applications/sdks/js/js-client/
- AWS MemoryDB documentation (accessing clusters, endpoints, CloudWatch metrics): https://docs.aws.amazon.com/memorydb/latest/devguide/
- AWS MemoryDB CloudWatch metrics reference: https://docs.aws.amazon.com/memorydb/latest/devguide/metrics.memorydb.html

## Issues Found

1. **Removed `useEntraID` field from state store component** — `useEntraID` is an Azure Entra ID authentication field. It is irrelevant in an AWS MemoryDB context and its inclusion was misleading. AWS MemoryDB uses ACL-based authentication, not Azure Entra ID. Removed the field entirely.

2. **Fixed `consumerID` template value in pub/sub component** — The original value `"{uuid}"` is not a valid Dapr metadata template variable. Dapr supports template variables like `{podName}`, `{namespace}`, and `{appID}`, but not `{uuid}`. Changed to `"{podName}"` which is a valid Dapr template variable that provides unique consumer IDs per pod.

3. **Fixed CloudWatch metrics section** — The section header and comment claimed to "monitor MemoryDB data durability" but used the `EngineCPUUtilization` metric, which measures CPU usage of the Redis engine thread, not data durability. MemoryDB's multi-AZ durability is an architectural feature, not something directly measurable via a single CloudWatch metric. Changed the metric to `DatabaseMemoryUsagePercentage` (a valid and more useful MemoryDB metric) and updated the comment to "Monitor MemoryDB cluster health" to accurately describe what the command does.

## Review Notes
- The JavaScript example uses CommonJS `require()` syntax. While technically correct, modern Dapr SDK examples use ES module `import` syntax. This is a stylistic preference, not an error.
- The post states "MemoryDB requires TLS" — while TLS is enabled by default and strongly recommended, it is technically possible to create clusters with TLS disabled. The statement is accurate enough for a best-practices guide.
- The Dapr component YAML uses `apiVersion: dapr.io/v1alpha1` which is current and correct.
- All other Dapr metadata fields (`redisHost`, `redisPassword`, `enableTLS`, `failover`) are valid for the Redis state store and pub/sub components.
- The MemoryDB endpoint format and VPC connectivity requirements are accurately described.
