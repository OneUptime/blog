# Validation Summary: Redis vs Apache Geode for In-Memory Data Grid

## Status
validated

## Post Type
Comparison / Reference

## Technologies Covered
- Redis (Python `redis` client library)
- Apache Geode (Java client API)
- Redis Cluster
- Geode OQL (Object Query Language)
- Geode Continuous Queries (CQ)
- Redis keyspace notifications and Pub/Sub

## Sources Consulted
- Redis SET command documentation: https://redis.io/commands/set (NX, EX flags)
- Redis keyspace notifications: https://redis.io/docs/manual/keyspace-notifications/
- Apache Geode ClientCacheFactory API: https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/client/ClientCacheFactory.html
- Apache Geode CqListener interface: https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/query/CqListener.html
- Apache Geode OQL documentation: https://geode.apache.org/docs/guide/latest/developing/querying_basics/chapter_overview.html
- Apache Geode Disk Store documentation: https://geode.apache.org/docs/guide/latest/managing/disk_storage/chapter_overview.html
- GemFire history / GemStone Systems acquisition timeline

## Issues Found

1. **Incorrect GemFire origin history (line 11)**: The post stated GemFire "originated inside VMware (formerly Pivotal)." GemFire was actually created by GemStone Systems, which was later acquired by SpringSource/VMware, then moved to Pivotal, and eventually returned to VMware. Fixed to: "it originated at GemStone Systems as GemFire, later becoming part of Pivotal and then VMware."

2. **Incorrect persistence terminology in comparison table (line 102)**: The Geode persistence column listed "Disk store (HDStore)." There is no "HDStore" concept in Apache Geode. The correct term is simply "Disk Store." Fixed to: "Disk Store."

3. **CqListener anonymous class missing required onError method (lines 77-83)**: The `CqListener` interface in Apache Geode defines two abstract methods: `onEvent(CqEvent)` and `onError(CqEvent)`. The code only implemented `onEvent`, which would cause a compilation error. Added the missing `onError` override.

## Review Notes
- The Redis Python code examples are correct and use current `redis-py` API conventions.
- The Geode Java client code correctly demonstrates `ClientCacheFactory`, `ClientRegionShortcut.CACHING_PROXY`, and OQL query execution.
- The comparison table is accurate after the HDStore fix. The characterization of Redis transactions as "single-node MULTI" is correct for Redis Cluster mode.
- The post correctly notes that Redis Cluster does not support cross-node distributed queries without client-side aggregation.
- Apache Geode has been placed in the Apache Attic (retired) as of late 2024. The post does not mention this, which could be relevant for readers evaluating it for new projects. This is worth noting but was not changed since the technical content remains accurate for existing deployments.
