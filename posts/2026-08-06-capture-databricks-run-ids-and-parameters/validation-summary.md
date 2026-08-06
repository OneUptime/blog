# Validation Summary: Capture Databricks Run IDs and Parameters Reliably

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Databricks Lakeflow Jobs
- Dynamic value references and job/task parameters
- Databricks Jobs REST API 2.2
- OAuth and idempotent job launches
- Databricks notebook widgets (`dbutils.widgets`)
- Python and PySpark
- Delta Lake audit tables
- Unity Catalog system tables
- Databricks SQL

## Sources Consulted

- [Dynamic value references](https://docs.databricks.com/aws/en/jobs/dynamic-value-references)
- [Access parameter values from a task](https://docs.databricks.com/aws/en/jobs/parameter-use)
- [Configure task parameters](https://docs.databricks.com/aws/en/jobs/task-parameters)
- [Configure job parameters](https://docs.databricks.com/aws/en/jobs/job-parameters)
- [Trigger a new job run — Jobs API](https://docs.databricks.com/api/workspace/jobs/runNow)
- [Get a single job run — Jobs API](https://docs.databricks.com/api/workspace/jobs/getRun)
- [Jobs system table reference](https://docs.databricks.com/aws/en/admin/system-tables/jobs)
- [System tables reference](https://docs.databricks.com/aws/en/admin/system-tables)
- [Monitor Lakeflow Jobs](https://docs.databricks.com/aws/en/jobs/monitor)
- [Spark Submit task deprecation notice and migration guide](https://docs.databricks.com/aws/en/jobs/tasks/spark-submit)
- [Authorize service principal access with OAuth](https://docs.databricks.com/aws/en/dev-tools/auth/oauth-m2m)
- [Databricks SQL `max_by` aggregate function](https://docs.databricks.com/aws/en/sql/language-manual/functions/max_by)
- [Databricks SQL named parameter markers](https://docs.databricks.com/aws/en/sql/user/queries/query-parameters)
- [PySpark `SparkSession.createDataFrame`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.SparkSession.createDataFrame.html)
- [PySpark `DataFrameWriter.saveAsTable`](https://docs.databricks.com/aws/en/pyspark/reference/classes/dataframewriter/saveAsTable)
- [Python `datetime` documentation](https://docs.python.org/3/library/datetime.html)

## Issues Found

- The task-parameter guidance listed Spark Submit without noting its current status. Clarified that only existing Spark Submit tasks use this pattern, that the task type is deprecated and pending removal, and that JVM workloads should migrate to JAR tasks.
- The system-table description called the data account-level without noting that Lakeflow Jobs system tables are regional. Changed it to "region-scoped, account-level" operational history.
- The task-run timeline description implied that `task_parameters` is available throughout retained history. Added the documented limitation that it is populated only for rows emitted since early December 2025.
- The conclusion said the dynamic-parameter approach works across task types. Scoped the statement to task types that support parameter passing because some Lakeflow task types do not accept parameters.

## Review Notes

The dynamic reference names, notebook widget access, JSON-array parameter rules, Jobs API 2.2 endpoints, `run-now` response, idempotency behavior, OAuth recommendation, pagination warning, system-table column names, timeline aggregation, and SQL parameter markers match current official documentation. The Jobs UI retains run history for 60 days, while the referenced Lakeflow Jobs system tables currently have 365 days of free retention and update throughout the day rather than in real time. The append example is valid Databricks/PySpark code, but it assumes that the target catalog and schema exist and that the run identity has permission to create or write the table; as the post notes, production audit logic should enforce idempotency because append mode does not deduplicate records.
