# Validation Summary: How to Implement Authorized Routines in BigQuery for Secure Data Sharing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud BigQuery
- BigQuery authorized routines
- BigQuery table-valued functions
- BigQuery stored procedures
- BigQuery IAM and dataset access controls
- Google Cloud audit logs
- bq command-line tool

## Sources Consulted
- BigQuery authorized routines: https://docs.cloud.google.com/bigquery/docs/authorized-routines
- BigQuery manage routines: https://docs.cloud.google.com/bigquery/docs/routines
- BigQuery table functions: https://docs.cloud.google.com/bigquery/docs/table-functions
- BigQuery authorized views: https://docs.cloud.google.com/bigquery/docs/authorized-views
- BigQuery control access to resources with IAM: https://docs.cloud.google.com/bigquery/docs/control-access-to-resources-iam
- BigQuery IAM roles and permissions: https://docs.cloud.google.com/bigquery/docs/access-control
- BigQuery IAM Conditions: https://docs.cloud.google.com/bigquery/docs/conditions
- bq command-line tool reference: https://docs.cloud.google.com/bigquery/docs/reference/bq-cli-reference
- BigQuery audit logs overview: https://docs.cloud.google.com/bigquery/docs/reference/auditlogs

## Issues Found
- The post stated that BigQuery views require users to have read access to the underlying dataset. This is not true for authorized views. I changed the wording to distinguish regular views from authorized views.
- The post used `bq update --authorized_routine`, which is not the documented bq flow for authorizing routines. I replaced it with the documented `bq show`, edit the dataset `access` array with a `routine` entry, and `bq update --source` workflow.
- The post described the JSON update as "using gcloud" even though the commands used `bq`. I corrected the wording.
- The post used `bq add-iam-policy-binding` against a dataset. The official bq reference says this command does not support datasets. I replaced it with a BigQuery SQL `GRANT` example and a documented dataset JSON update alternative.
- The audit-log query used the older `protoPayload.serviceData.jobCompletedEvent` path. I updated it to filter BigQueryAuditMetadata logs and referenced routines.

## Review Notes
- Users also need permission to create BigQuery jobs, such as `bigquery.jobs.create`, in the project where they run queries. The post focuses on dataset and routine access, so this remains an operational prerequisite to document in a future revision.
- Authorized stored procedures can have DDL and DML access on the authorized dataset. The post uses a read-only aggregate example, but production procedures should be reviewed carefully before being exposed.
