# Validation Summary: How to Scale ClickHouse Reads with Replicas

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse replication and ReplicatedMergeTree
- ClickHouse Keeper / ZooKeeper
- ClickHouse distributed query routing and parallel replicas
- ClickHouse system tables
- Python ClickHouse clients
- HAProxy
- Nginx
- Kubernetes Services

## Sources Consulted
- ClickHouse ReplicatedMergeTree documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/replication
- ClickHouse replication architecture guide: https://clickhouse.com/docs/architecture/replication
- ClickHouse settings documentation: https://clickhouse.com/docs/operations/settings/settings
- ClickHouse parallel replicas documentation: https://clickhouse.com/docs/deployment-guides/parallel-replicas
- ClickHouse Distributed table engine documentation: https://clickhouse.com/docs/engines/table-engines/special/distributed
- ClickHouse system.replicas documentation: https://clickhouse.com/docs/operations/system-tables/replicas
- ClickHouse system.replication_queue documentation: https://clickhouse.com/docs/operations/system-tables/replication_queue
- ClickHouse system.query_log documentation: https://clickhouse.com/docs/operations/system-tables/query_log
- ClickHouse system.metrics documentation: https://clickhouse.com/docs/operations/system-tables/metrics
- ClickHouse Connect Python documentation: https://clickhouse.com/docs/integrations/python
- ClickHouse Connect advanced usage documentation: https://clickhouse.com/docs/integrations/language-clients/python/advanced-usage
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Service API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/
- HAProxy health check documentation: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/reliability/health-checks/
- Nginx upstream module documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Nginx proxy module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- clickhouse-pool documentation: https://clickhouse-pool.readthedocs.io/en/latest/api.html

## Issues Found
- The replica architecture described a primary/secondary model and synchronous replication. ClickHouse replicated tables do not require a primary replica, writes can go to any available replica with a Keeper/ZooKeeper session, and replication is asynchronous. Updated the diagram labels and added a clarifying note.
- The Kubernetes Service snippet described `sessionAffinity: None` as round-robin across pods. Kubernetes documents `None` as no session affinity, not a portable guarantee of round-robin behavior. Updated the comment to say traffic is distributed across ready endpoints without client-IP affinity.
- The read-write split section called the write target a primary. Updated it to a preferred write replica, which matches ClickHouse behavior while preserving the operational pattern.
- The parallel replicas example used `parallel_replicas_mode = 'read_tasks'`, which is no longer the current documented way to enable parallel replicas. Replaced it with `enable_parallel_replicas = 1` and `max_parallel_replicas`.
- The `select_sequential_consistency` comment implied it generally waits for any replica to sync before reading. ClickHouse documents this in the context of quorum inserts. Updated the comment accordingly.
- The replication queue depth query referenced `event_time` and `queue_size` columns on `system.replication_queue`, but those columns are not in that system table. Replaced it with a current queue-depth query using `count()` grouped by replica, database, and table.
- The resource usage example claimed to show CPU and memory, but it selected the `Query` metric, which is current query count. Updated the comment to match the query.
- The custom health-check SQL comment claimed the SQL itself returns HTTP 200 or 503. A SELECT query returns a status string; an external wrapper or endpoint must map that to HTTP status codes. Updated the comment.
- The `clickhouse_pool` example used `pool.pull()`, but the documented API uses `pool.get_client()`. Updated the snippet.

## Review Notes
The remaining examples are illustrative and assume self-managed ClickHouse configuration. ClickHouse Cloud manages replication differently and does not use XML server configuration files in the same way.
