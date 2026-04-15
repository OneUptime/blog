# Validation Summary: How to Build a Self-Hosted Analytics Platform with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (analytical database, SQL syntax, MergeTree engine, DateTime64, LowCardinality, Map types, TTL)
- dbt (data transformation on ClickHouse)
- Grafana (visualization with ClickHouse data source plugin)
- Vector (event ingestion)
- Kubernetes / Helm (deployment)
- Altinity ClickHouse Operator

## Sources Consulted
- ClickHouse SQL function reference — date/time functions: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse CREATE TABLE documentation (MergeTree, PARTITION BY, ORDER BY, TTL): https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse data types (DateTime64, LowCardinality, Map): https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse window functions documentation: https://clickhouse.com/docs/en/sql-reference/window-functions
- Altinity ClickHouse Operator Helm chart: https://docs.altinity.com/clickhouse-operator/
- dbt-clickhouse adapter documentation: https://github.com/ClickHouse/dbt-clickhouse

## Issues Found

### 1. Incorrect `dateadd` function in dbt model
- **What was wrong:** The dbt SQL model used `dateadd(day, -90, today())`, which is SQL Server syntax. ClickHouse does not have a `dateadd()` function.
- **What was changed:** Replaced with `today() - INTERVAL 90 DAY`, which is valid ClickHouse syntax.
- **Why:** ClickHouse uses `date_sub()` or `INTERVAL` arithmetic for date calculations, not `dateadd()`.

### 2. Nested aggregate inside window function in Grafana query
- **What was wrong:** The query used `max(count(DISTINCT user_id)) OVER ()`, nesting an aggregate function inside a window function. This is invalid in both ClickHouse and standard SQL — aggregate functions cannot be arguments to window functions.
- **What was changed:** Restructured the query to use a subquery that first computes `count(DISTINCT user_id)` per `event_name`, then applies the `max(...) OVER ()` window function on the pre-aggregated result.
- **Why:** Window functions operate on the result set after GROUP BY, but they cannot contain aggregate calls themselves. A subquery is needed to separate the two levels of aggregation.

### 3. Incorrect Helm chart repository URL and chart name
- **What was wrong:** The post used `https://charts.clickhouse.com` as the Helm repo URL, which is not a valid ClickHouse Helm repository. The `--set replicaCount=3` and `--set persistence.size=500Gi` parameters also did not correspond to any known official chart's values schema.
- **What was changed:** Replaced with the Altinity ClickHouse Operator Helm chart (`https://docs.altinity.com/clickhouse-operator/`), which is the standard approach for deploying ClickHouse on Kubernetes.
- **Why:** The Altinity ClickHouse Operator is the most widely adopted method for running ClickHouse on Kubernetes and has a well-documented Helm chart.

## Review Notes
- The `CREATE TABLE` schema is syntactically correct and uses appropriate ClickHouse features (MergeTree, LowCardinality, Map, DateTime64, TTL, PARTITION BY toYYYYMM).
- The dbt model uses `{{ ref('events') }}` Jinja syntax correctly for dbt. The `dbt-clickhouse` adapter supports this pattern.
- The curl example for event ingestion is a generic HTTP endpoint illustration and is correct as a conceptual example.
- The Kubernetes deployment section was simplified to just installing the operator. In practice, users would also need to create a `ClickHouseInstallation` custom resource to define replicas, storage, and other cluster settings. This is a simplification but acceptable for a blog post overview.
