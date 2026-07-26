# Validation Summary: How to Tune StarRocks for High-Concurrency BI Dashboards with Resource Groups

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- StarRocks resource groups and classifiers
- StarRocks Query Queue v1 and v2
- StarRocks Pipeline Engine
- StarRocks SQL, FE configuration, audit logs, and metrics
- BI dashboard concurrency and workload isolation

## Sources Consulted

- [StarRocks resource groups](https://docs.starrocks.io/docs/administration/management/resource_management/resource_group/)
- [CREATE RESOURCE GROUP](https://docs.starrocks.io/docs/sql-reference/sql-statements/cluster-management/resource_group/CREATE_RESOURCE_GROUP/)
- [StarRocks query queues](https://docs.starrocks.io/docs/administration/management/resource_management/query_queues/)
- [SHOW USAGE RESOURCE GROUPS](https://docs.starrocks.io/docs/sql-reference/sql-statements/cluster-management/resource_group/SHOW_USAGE_RESOURCE_GROUPS/)
- [SHOW RUNNING QUERIES](https://docs.starrocks.io/docs/sql-reference/sql-statements/cluster-management/nodes_processes/SHOW_RUNNING_QUERIES/)
- [View Running Queries](https://docs.starrocks.io/docs/using_starrocks/running_queries/)
- [StarRocks FE query and loading parameters](https://docs.starrocks.io/docs/administration/management/FE_parameters/user_query_loading/)
- [StarRocks system variables](https://docs.starrocks.io/docs/sql-reference/System_variable/)
- [StarRocks 3.3 release notes](https://docs.starrocks.io/releasenotes/release-3.3/)
- [StarRocks 4.1 release notes](https://docs.starrocks.io/releasenotes/release-4.1/)
- [StarRocks resource-group percentage CPU controls implementation](https://github.com/StarRocks/starrocks/pull/66947)
- [StarRocks `ShowRunningQueriesStmt` implementation](https://github.com/StarRocks/starrocks/blob/main/fe/fe-core/src/main/java/com/starrocks/sql/ast/ShowRunningQueriesStmt.java)

## Issues Found

- The post described `concurrency_limit` as an unconditional admission boundary. That is a Query Queue v1 resource-group trigger and does not drive admission under Query Queue v2, which is enabled by default from StarRocks 4.1. The wording now scopes `concurrency_limit` to v1 and explicitly identifies the resource-group and global fixed thresholds that v2 replaces with logical slots.
- The shared resource-group example used `cpu_weight = 16` without stating that `cpu_weight` cannot exceed the average BE CPU-core count. The post now tells readers to validate this example value against the cluster.
- The exclusive resource-group example used `exclusive_cpu_cores = 8` without stating its upper bound. The post now explains that this value requires at least nine cores on every BE because the maximum is `min_be_cpu_cores - 1`.
- The post listed `/global_current_queries` without a version boundary. The command was introduced in StarRocks 3.3.3, so the post now directs earlier releases to use `/current_queries`.
- The post identified Query Queue v2 only at the 3.3 major/minor level. The FE configuration reference gives the precise introduction point as 3.3.4, so both occurrences now use that version.
- The post described all values from `SHOW USAGE RESOURCE GROUPS` as approximate. Official documentation marks only `BEInUseCpuCores` as an approximate estimate; the wording now applies that qualification specifically to CPU usage.

## Review Notes

- The SQL examples are syntactically consistent with the documented StarRocks resource-group, classifier, session-variable, and monitoring syntax.
- Query Queue v1 and v2 behavior differs materially. Operators should continue checking the exact deployed minor version and the non-mutable `enable_query_queue_v2` FE setting before applying queue tuning.
- The examples assume the referenced users, roles, database objects, and required resource-group privileges already exist.
