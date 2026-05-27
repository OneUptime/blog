# Validation Summary: How to Schedule BigQuery Stored Procedures Using Cloud Scheduler

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google BigQuery
- BigQuery stored procedures and GoogleSQL scripting
- Cloud Scheduler
- Cloud Run functions / Cloud Functions 2nd gen
- Cloud Workflows
- Google Cloud CLI
- Python Functions Framework
- Google Cloud BigQuery Python client
- IAM

## Sources Consulted
- BigQuery scheduled queries: https://cloud.google.com/bigquery/docs/scheduling-queries
- BigQuery stored procedures: https://cloud.google.com/bigquery/docs/procedures
- BigQuery procedural language reference: https://cloud.google.com/bigquery/docs/reference/standard-sql/procedural-language
- Cloud Scheduler HTTP job CLI reference: https://cloud.google.com/sdk/gcloud/reference/scheduler/jobs/create/http
- Cloud Functions deploy CLI reference: https://cloud.google.com/sdk/gcloud/reference/functions/deploy
- Cloud Run functions IAM roles: https://cloud.google.com/functions/docs/reference/iam/roles
- Workflows BigQuery jobs.insert connector: https://cloud.google.com/workflows/docs/reference/googleapis/bigquery/v2/jobs/insert
- Workflows service account authentication: https://cloud.google.com/workflows/docs/authentication
- Scheduling workflows with Cloud Scheduler: https://cloud.google.com/workflows/docs/schedule-workflow
- Workflows roles and permissions: https://cloud.google.com/workflows/docs/access-control

## Issues Found
- The introduction incorrectly stated that BigQuery scheduled queries cannot call stored procedures directly. Official BigQuery documentation says scheduled queries run GoogleSQL, including DDL and DML, and BigQuery stored procedures are called with the GoogleSQL `CALL` statement. I updated the claim to say scheduled queries can run stored procedure calls but Cloud Scheduler provides more orchestration flexibility.
- The Python Cloud Function built SQL using direct string interpolation of `process_date`. I changed the sample to parse the date with `date.fromisoformat`, return a 400 for invalid input, and pass the value as a BigQuery `DATE` query parameter.
- The Cloud Function deployment and IAM examples were ambiguous for current Cloud Run functions / Cloud Functions 2nd gen. I added `--gen2` to the deployment command and changed the invoker binding from `roles/cloudfunctions.invoker` with `gcloud functions add-iam-policy-binding` to `roles/run.invoker` with `gcloud run services add-iam-policy-binding`, which matches current 2nd gen HTTP function IAM guidance.
- The Workflows example did not attach the BigQuery-capable service account to the workflow and did not grant the scheduler caller permission to execute the workflow. I added `--service-account=my-etl-sa@my_project.iam.gserviceaccount.com` to the workflow deploy command and added a `roles/workflows.invoker` binding for the service account used by Cloud Scheduler.

## Review Notes
- `gcloud` is not installed in the review environment, so CLI validation was performed against official Google Cloud SDK reference pages rather than local `--help` output.
- The direct Cloud Scheduler to BigQuery API approach is technically valid for simple jobs, but it remains less suitable when callers need custom result handling or structured application logs.
