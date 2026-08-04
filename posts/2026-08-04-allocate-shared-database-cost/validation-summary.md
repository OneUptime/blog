# Validation Summary: Allocate Shared Database Cost by Workload Drivers

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- PostgreSQL
- PostgreSQL `pg_stat_statements`
- Amazon RDS for PostgreSQL
- Amazon CloudWatch metrics for Amazon RDS
- CloudWatch Database Insights
- Amazon RDS Performance Insights API
- FinOps showback and workload-based cost allocation

## Sources Consulted

- [PostgreSQL: `pg_stat_statements`](https://www.postgresql.org/docs/current/pgstatstatements.html)
- [PostgreSQL: Monitoring database activity and statistics](https://www.postgresql.org/docs/current/monitoring-stats.html)
- [PostgreSQL: Database object size functions](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-ADMIN-DBOBJECT)
- [Amazon RDS: CloudWatch metrics for Amazon RDS](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-metrics.html)
- [Amazon RDS: Database load and average active sessions](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.Overview.ActiveSessions.html)
- [Amazon RDS: Overview of Performance Insights and its July 31, 2026 console end of life](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.Overview.html)
- [Amazon CloudWatch: CloudWatch Database Insights](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Database-Insights.html)
- [Amazon RDS: Storage for DB instances](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Storage.html)
- [Amazon RDS for PostgreSQL pricing](https://aws.amazon.com/rds/postgresql/pricing/)
- [AWS Performance Insights API Reference](https://docs.aws.amazon.com/performance-insights/latest/APIReference/Welcome.html)

## Issues Found

- The post referred to "Amazon RDS Database Insights and Performance Insights" without distinguishing the current CloudWatch product from the retired Performance Insights console experience. Changed this to "CloudWatch Database Insights and the continuing Performance Insights API," consistent with AWS's July 31, 2026 console end-of-life notice and its statement that the API continues unchanged.
- The scrape identity fields omitted `userid` and `toplevel`, even though a `pg_stat_statements` row is keyed by database ID, user ID, query ID, and whether the statement is top-level. Added the user identifier and top-level flag so samples can be matched without merging distinct rows.
- The post implied that evicted work could be quantified directly and assigned to an unknown pool. Clarified that an increase in `pg_stat_statements_info.dealloc` identifies an interval with discarded entries but does not measure the discarded calls, time, or I/O; the interval must remain missing coverage unless another total can quantify the residual.

## Review Notes

- The formula blocks are explanatory pseudocode rather than executable code; their arithmetic and per-pool weighting are internally consistent.
- PostgreSQL planning statistics require `pg_stat_statements.track_planning`, which is disabled by default. The proposed driver uses `total_exec_time`, so the allocation example does not depend on planning statistics being enabled.
- RDS charges vary by deployment and storage type. The post correctly uses the provider bill as the cost source and treats telemetry only as allocation weights.
