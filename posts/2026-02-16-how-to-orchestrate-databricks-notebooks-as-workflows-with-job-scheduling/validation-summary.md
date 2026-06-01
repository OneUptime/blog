# Validation Summary: How to Orchestrate Databricks Notebooks as Workflows with Job Scheduling

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Databricks
- Databricks Workflows / Lakeflow Jobs
- Databricks Jobs REST API
- Databricks notebook tasks
- Databricks widgets and task values
- Quartz cron scheduling
- Delta Lake
- Apache Spark / PySpark

## Sources Consulted
- Databricks Lakeflow Jobs overview: https://docs.databricks.com/jobs.html
- Databricks Jobs API create job reference: https://docs.databricks.com/api/workspace/jobs/create
- Databricks Jobs API list runs reference: https://docs.databricks.com/api/workspace/jobs/listruns
- Databricks notebook task documentation: https://docs.databricks.com/aws/en/jobs/notebook
- Databricks task parameters documentation: https://docs.databricks.com/aws/en/jobs/task-parameters
- Databricks task values documentation: https://docs.databricks.com/gcp/en/jobs/task-values
- Databricks dynamic value references documentation: https://docs.databricks.com/aws/en/jobs/dynamic-value-references
- Databricks task dependency and run-if documentation: https://docs.databricks.com/aws/en/jobs/run-if
- Azure Databricks scheduled jobs documentation: https://learn.microsoft.com/en-us/azure/databricks/jobs/scheduled
- Azure Databricks job automation documentation: https://learn.microsoft.com/en-us/azure/databricks/jobs/automate

## Issues Found
- The introduction described Databricks Workflows as "formerly Jobs"; current Databricks documentation presents the feature as Lakeflow Jobs. Updated the wording to mention that Workflows is now documented as Lakeflow Jobs.
- The UI path referenced the old Workflows sidebar label. Updated it to Jobs & Pipelines, matching current Azure Databricks documentation.
- The notebook value-passing section implied `dbutils.notebook.exit()` is the mechanism for downstream job tasks to consume values. Updated it to use `dbutils.jobs.taskValues.set()` and Databricks dynamic value references, which is the documented approach for passing values between tasks.
- The data quality notebook used `dbutils.widgets.get("target_table")` without defining a default widget or showing the task parameter. Added a widget definition and a task parameter example.
- The REST example used Jobs API `2.1`, while current Databricks documentation recommends Jobs API `2.2` for new and existing clients. Updated create and run-list endpoints to `/api/2.2/...`.
- The REST job example used `existing_cluster_id": "same-as-previous"`, which is not a valid cluster ID or a valid way to reuse prior task compute. Replaced it with a documented shared job cluster using `job_clusters` and `job_cluster_key`.
- The conditional failure task used `depends_on.outcome: "failed"`, which is not the documented Jobs API shape for run-if dependency behavior. Replaced it with `run_if: "AT_LEAST_ONE_FAILED"`.
- The notification example placed `no_alert_for_skipped_runs` under `email_notifications`. Moved it under `notification_settings`, matching the Jobs API schema.
- Removed JavaScript-style comments from JSON snippets so the snippets are valid JSON.

## Review Notes
The post remains a practical introductory tutorial. Future improvements could mention Databricks Asset Bundles for source-controlled job definitions, but that is an enhancement rather than a correctness issue.
