# Validation Summary: How to Configure Presto/Trino Query Engine

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Trino
- PrestoDB
- JVM configuration
- Hive connector
- Iceberg connector
- PostgreSQL connector
- S3 object storage
- Trino resource groups
- Trino memory management and spilling
- Trino SQL system tables

## Sources Consulted
- Trino deployment documentation: https://trino.io/docs/current/installation/deployment.html
- Trino resource management properties: https://trino.io/docs/current/admin/properties-resource-management.html
- Trino query management properties: https://trino.io/docs/current/admin/properties-query-management.html
- Trino task properties: https://trino.io/docs/current/admin/properties-task.html
- Trino spilling properties: https://trino.io/docs/current/admin/properties-spilling.html
- Trino optimizer properties: https://trino.io/docs/current/admin/properties-optimizer.html
- Trino general properties: https://trino.io/docs/current/admin/properties-general.html
- Trino exchange properties: https://trino.io/docs/current/admin/properties-exchange.html
- Trino resource groups documentation: https://trino.io/docs/current/admin/resource-groups.html
- Trino Hive connector documentation: https://trino.io/docs/current/connector/hive.html
- Trino Iceberg connector documentation: https://trino.io/docs/current/connector/iceberg.html
- Trino PostgreSQL connector documentation: https://trino.io/docs/current/connector/postgresql.html
- Trino S3 file system support: https://trino.io/docs/current/object-storage/file-system-s3.html
- Trino system connector documentation: https://trino.io/docs/current/connector/system.html
- Trino source for system.runtime.queries columns: https://raw.githubusercontent.com/trinodb/trino/master/core/trino-main/src/main/java/io/trino/connector/system/QuerySystemTable.java
- Trino source for system.runtime.nodes columns: https://raw.githubusercontent.com/trinodb/trino/master/core/trino-main/src/main/java/io/trino/connector/system/NodeSystemTable.java
- Trino 369 release notes for removed memory property: https://trino.io/docs/current/release/release-369.html

## Issues Found
- The post implied the same configuration snippets apply equally to PrestoDB and Trino. Added a caveat that examples use current Trino property names, because PrestoDB property names vary by version and distribution.
- The JVM snippet included `-XX:+UseG1GC` but omitted options from the current Trino recommended JVM baseline. Removed the redundant G1 flag and added current recommended options.
- `query.max-total-memory-per-node` was shown, but Trino removed it in release 369. Replaced it with supported `query.max-total-memory` where cluster-wide total memory is intended, and removed it from worker snippets.
- The worker task snippet used `task.max-drivers`, which is not the current Trino property. Replaced it with `task.max-drivers-per-task`.
- Hive and Iceberg S3 examples used removed legacy `hive.s3.*` properties. Replaced them with `fs.s3.enabled=true` and current `s3.*` properties.
- The Hive file status cache snippet used `hive.file-status-cache-size`, which is not the current property. Replaced it with `hive.file-status-cache.max-retained-size`.
- The Iceberg snippet described `iceberg.delete-schema-locations-fallback` as merge-on-read behavior. Updated the comment to match the actual property behavior.
- The PostgreSQL connector snippet included `postgresql.connection-pool.max-size`, which is not documented for the Trino PostgreSQL connector. Removed it.
- The optimizer snippet used stale or incorrect property names, including `optimizer.join-distribution-type`, `optimizer.predicate-pushdown-use-table-properties`, `optimizer.optimize-hash-generation`, `optimizer.optimize-mixed-distinct-aggregations`, and `optimizer.use-mark-distinct`. Replaced them with current documented properties.
- The monitoring SQL referenced columns that are not present in current `system.runtime.queries` or `system.runtime.nodes`, including `total_cpu_time`, `peak_memory_bytes`, `execution_time`, `queued_time`, `planning_time`, `last_response_time`, and peak memory reservation columns. Rewrote the queries to use current columns from the Trino system connector.
- The memory diagram referred to a reserved pool, which is no longer accurate for current Trino memory management. Updated it to tracked query memory and heap headroom.

## Review Notes
The post is now accurate for current Trino property names. PrestoDB deployments should still verify properties against the exact PrestoDB version in use before copying snippets.
