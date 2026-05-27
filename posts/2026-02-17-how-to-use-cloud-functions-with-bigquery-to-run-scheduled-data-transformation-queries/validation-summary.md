# Validation Summary: Use Cloud Functions with BigQuery to Run Scheduled Data Transformation Queries

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Functions / Cloud Run functions
- Cloud Scheduler
- BigQuery
- GoogleSQL
- Node.js
- Google Cloud CLI
- Slack webhooks with Axios

## Sources Consulted
- Google Cloud Run functions Node.js runtime documentation: https://cloud.google.com/functions/docs/concepts/nodejs-runtime
- Google Cloud Run Node.js dependency documentation: https://cloud.google.com/run/docs/runtimes/nodejs-dependencies
- Google Cloud Run container runtime contract: https://cloud.google.com/run/docs/container-contract
- Google Cloud SDK `gcloud functions deploy` reference: https://cloud.google.com/sdk/gcloud/reference/functions/deploy
- Google Cloud SDK `gcloud scheduler jobs create http` reference: https://cloud.google.com/sdk/gcloud/reference/scheduler/jobs/create/http
- BigQuery Node.js client library reference: https://cloud.google.com/nodejs/docs/reference/bigquery/latest/bigquery/bigquery
- BigQuery GoogleSQL DDL reference: https://cloud.google.com/bigquery/docs/reference/standard-sql/data-definition-language
- BigQuery GoogleSQL DML reference: https://cloud.google.com/bigquery/docs/reference/standard-sql/dml-syntax

## Issues Found
- The sample used `process.env.GCP_PROJECT`, but Cloud Run functions do not document that environment variable as an automatically injected runtime variable. Changed the sample to use an explicit `PROJECT_ID` environment variable and updated the deploy command to set it.
- The deployment used `nodejs20`, which is past its April 30, 2026 deprecation date. Updated the deployment example to `nodejs22`.
- The function imported external packages without showing the required `package.json`. Added a minimal `package.json` snippet with the BigQuery client, Functions Framework, and Axios dependencies.
- The user metrics and revenue summary queries used `DATE(@target_date)` even though `@target_date` is already bound as a `DATE` parameter. Changed them to use `@target_date` directly.
- The code read query job metadata before waiting for query completion. Moved `job.getQueryResults()` before `job.getMetadata()` for the DML query examples.
- The user metrics step used DML affected-row metadata for a `CREATE OR REPLACE TABLE AS SELECT` DDL query. Replaced that with a follow-up `COUNT(*)` query against the created table.
- The request date was interpolated into a table name after only removing hyphens. Added `YYYY-MM-DD` validation before using the date in SQL-derived identifiers.
- The notification snippet used `axios` without importing it. Added the `require('axios')` line.

## Review Notes
The examples assume the destination BigQuery tables already exist for the `MERGE` and `INSERT` statements, and that the function service account has the required BigQuery permissions. Those are deployment prerequisites rather than syntax errors in the shown code.
