# Validation Summary: How to Monitor Cloud Composer Health Using the Built-In Monitoring Dashboard

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Composer / Managed Service for Apache Airflow
- Google Cloud Monitoring
- Apache Airflow CLI and DAGs
- Google Cloud CLI
- Terraform Google provider

## Sources Consulted
- Google Cloud Composer monitoring dashboard documentation: https://docs.cloud.google.com/composer/docs/composer-3/use-monitoring-dashboard
- Google Cloud Composer Cloud Monitoring metrics documentation: https://docs.cloud.google.com/composer/docs/composer-3/monitor-environments
- Google Cloud SDK `gcloud composer environments run` reference: https://cloud.google.com/sdk/gcloud/reference/composer/environments/run
- Apache Airflow CLI reference for `tasks states-for-dag-run` and `db clean`: https://airflow.apache.org/docs/apache-airflow/stable/cli-and-env-variables-ref.html
- Terraform Google provider `google_composer_environment` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/composer_environment

## Issues Found
- The environment health section described health as healthy/degraded/unhealthy and implied it was determined by scheduler heartbeat, database connectivity, and worker availability. Google documents the environment health metric as reported by the immutable `airflow_monitoring` liveness DAG, with separate dashboard timelines for scheduler heartbeat, web server health, database health, operations, maintenance, and dependencies. Updated the section to match the documented behavior.
- The task instance CLI example used `airflow tasks list` through `gcloud composer environments run`, but `tasks list` lists tasks in a DAG rather than task instance states for a DAG run. Replaced it with `tasks states-for-dag-run`, which is the documented Airflow CLI command for task instance states in a DAG run.
- The task metrics description said the dashboard showed queued, running, success, failed, and up-for-retry states in one task instance panel. Google documents completed task counts broken down by success/failure and active Airflow tasks in running, queued, or deferred states. Updated the wording accordingly.
- The worker scaling guidance mentioned increasing the machine type. For Composer workload resource tuning, the Terraform example and provider documentation use `workloads_config` worker resources and worker counts. Updated the wording to "increasing worker resources or adding more workers."
- Two custom metric names were inaccurate: `composer.googleapis.com/environment/scheduler_heartbeat` and `composer.googleapis.com/environment/zombie_task_killed`. Updated them to the documented metric API names `composer.googleapis.com/environment/scheduler_heartbeat_count` and `composer.googleapis.com/environment/zombie_task_killed_count`.

## Review Notes
- The Terraform `google_composer_environment` workload configuration fields are valid for current Managed Airflow / Cloud Composer environments. Real deployments generally also need provider/project configuration, service account setup, IAM, and an appropriate `software_config.image_version`, but the snippet is acceptable as a focused resource sizing example.
- The Airflow metadata cleanup DAG uses `airflow db clean`, which is valid for Airflow 2.x. Operators should back up the metadata database before running cleanup and test with `--dry-run` first.
