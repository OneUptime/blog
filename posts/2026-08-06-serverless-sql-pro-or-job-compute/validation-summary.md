# Validation Summary: Serverless SQL, Pro Warehouse, or Job Compute?

## Status
validated

## Post Type
Technical decision guide

## Technologies Covered

- Databricks SQL serverless and pro SQL warehouses
- Databricks Photon, Predictive IO, and Intelligent Workload Management
- Lakeflow Jobs with serverless and classic job compute
- Notebook, Python script, Python wheel, JAR, Spark Submit, SQL, and dbt tasks
- Spark Connect and serverless compute limitations
- Unity Catalog and serverless network connectivity configurations
- Databricks billing and query-history system tables
- JDBC, ODBC, BI, concurrency, autoscaling, and cost attribution

## Sources Consulted

- [SQL warehouse types](https://docs.databricks.com/aws/en/compute/sql-warehouse/warehouse-types)
- [SQL warehouse sizing, scaling, and queuing behavior](https://docs.databricks.com/aws/en/compute/sql-warehouse/warehouse-behavior)
- [Connect to a SQL warehouse](https://docs.databricks.com/aws/en/compute/sql-warehouse)
- [Set up serverless SQL warehouses](https://docs.databricks.com/aws/en/admin/sql/serverless)
- [Configure compute for jobs](https://docs.databricks.com/aws/en/jobs/compute)
- [Run your Lakeflow Jobs with serverless compute for workflows](https://docs.databricks.com/aws/en/jobs/run-serverless-jobs)
- [Configure the serverless environment](https://docs.databricks.com/aws/en/compute/serverless/dependencies)
- [Serverless compute limitations](https://docs.databricks.com/aws/en/compute/serverless/limitations)
- [Spark Submit task deprecation notice and migration guide](https://docs.databricks.com/aws/en/jobs/tasks/spark-submit)
- [Private Link concepts](https://docs.databricks.com/aws/en/security/network/concepts/privatelink-concepts)
- [Billable usage system table reference](https://docs.databricks.com/aws/en/admin/system-tables/billing)
- [Query history system table reference](https://docs.databricks.com/aws/en/admin/system-tables/query-history)

## Issues Found

- The post treated all JAR tasks as requiring classic job compute. Current Databricks documentation supports JAR tasks on serverless jobs in Public Preview. The decision table and job-compute guidance now identify the preview and retain classic job compute as the alternative when preview use is unsuitable.
- The post recommended classic compute for Spark Submit without noting the task type's lifecycle. Spark Submit tasks are classic-only, but Databricks has deprecated the task type, restricted new use, and marked it pending removal. The post now labels Spark Submit as legacy and recommends migrating new use cases to JAR, notebook, or Python script tasks.

## Review Notes
Serverless JAR task support remains a Public Preview feature and should be rechecked when the post is updated. The general job-compute matrix, last updated July 10, 2026, still lists JAR tasks with classic compute, while the newer dedicated serverless-jobs documentation, last updated July 22, 2026, and the serverless-environment documentation explicitly describe serverless JAR support as Public Preview. This review follows the newer, feature-specific documentation while preserving classic compute as the non-preview alternative. The remaining warehouse performance, concurrency, networking, system-table metadata, startup-time, and cost-model claims agree with the official Databricks documentation consulted on the validation date.
