# Validation Summary: How to Set Up Dataform in BigQuery for Version-Controlled SQL-Based Data

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Dataform
- BigQuery
- Dataform SQLX
- Dataform REST API
- Google Cloud CLI authentication and API enablement
- Apache Airflow / Cloud Composer Dataform operators

## Sources Consulted
- Google Cloud Dataform repository creation documentation: https://docs.cloud.google.com/dataform/docs/create-repository
- Google Cloud Dataform repository management and workflow settings documentation: https://docs.cloud.google.com/dataform/docs/manage-repository
- Google Cloud Dataform source declaration documentation: https://docs.cloud.google.com/dataform/docs/declare-source
- Google Cloud Dataform table and incremental table documentation: https://docs.cloud.google.com/dataform/docs/create-tables
- Google Cloud Dataform assertions documentation: https://docs.cloud.google.com/dataform/docs/assertions
- Google Cloud Dataform REST API repository, workspace, compilation result, workflow invocation, and invocation config references: https://docs.cloud.google.com/dataform/reference/rest
- Apache Airflow Google provider Dataform operators documentation: https://airflow.apache.org/docs/apache-airflow-providers-google/stable/operators/cloud/dataform.html
- Local Google Cloud SDK 527.0.0 help output, used to verify that `gcloud dataform` is not available in the current SDK.

## Issues Found
- The post used `gcloud dataform ...` commands, but the current Google Cloud SDK does not provide a `gcloud dataform` command group. Replaced repository, Git connection, workspace, compilation, and workflow invocation examples with official Dataform REST API `curl` calls authenticated by `gcloud auth print-access-token`.
- The setup instructions enabled only the Dataform API, while current setup documentation requires both BigQuery and Dataform APIs. Updated the command to enable both.
- The project structure and configuration section used `dataform.json` as the default workflow settings file. Current Dataform Core 3.0 repositories use `workflow_settings.yaml` by default, so the examples were updated to `workflow_settings.yaml` with the correct `defaultProject`, `defaultDataset`, `defaultLocation`, `defaultAssertionDataset`, and `vars` keys.
- Source declarations named the source tables `events` and `customers`, but downstream SQLX files referenced `raw_events` and `raw_customers`. Updated the `ref()` calls to `ref("events")` and `ref("customers")`, matching Dataform's documented behavior that `ref()` uses the declared source name.
- The `stg_customers` comment described SCD Type 2 handling, but the SQL keeps only the latest record per customer and does not preserve historical versions. Updated the comment to describe the actual behavior.

## Review Notes
The Cloud Composer / Airflow operator example matches the current Apache Airflow Google provider Dataform operator signatures. The post now uses REST API examples because Dataform is documented through the console, REST API, client libraries, and Airflow operators rather than a current `gcloud dataform` surface.
