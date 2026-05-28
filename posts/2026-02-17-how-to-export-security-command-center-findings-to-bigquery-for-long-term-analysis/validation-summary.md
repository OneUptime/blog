# Validation Summary: Export Security Command Center Findings to BigQuery for Long-Term Analysis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Security Command Center
- Pub/Sub
- BigQuery
- Google Cloud CLI
- bq CLI
- Cloud Functions / Cloud Run functions
- Python BigQuery client library
- Looker Studio

## Sources Consulted
- Security Command Center: Enable finding notifications for Pub/Sub: https://cloud.google.com/security-command-center/docs/how-to-notifications
- Security Command Center: Creating and managing Notification Configs: https://cloud.google.com/security-command-center/docs/how-to-api-manage-notifications
- Security Command Center: NotificationMessage REST reference: https://cloud.google.com/security-command-center/docs/reference/rest/v2/NotificationMessage
- Pub/Sub BigQuery subscriptions overview: https://cloud.google.com/pubsub/docs/bigquery
- Pub/Sub: Create BigQuery subscriptions: https://cloud.google.com/pubsub/docs/create-bigquery-subscription
- BigQuery: Create datasets: https://cloud.google.com/bigquery/docs/datasets
- BigQuery: Specify schemas: https://cloud.google.com/bigquery/docs/schemas
- BigQuery: Create partitioned tables: https://cloud.google.com/bigquery/docs/creating-partitioned-tables
- Cloud Run functions Pub/Sub trigger Python sample: https://cloud.google.com/functions/docs/samples/functions-helloworld-pubsub
- BigQuery Python client `insert_rows_json` reference: https://cloud.google.com/python/docs/reference/bigquery/latest/google.cloud.bigquery.client.Client

## Issues Found
- The raw BigQuery table schema did not match Pub/Sub BigQuery subscription requirements. Without `use_topic_schema` or `use_table_schema`, Pub/Sub writes the message body to a `data` column, and `--write-metadata` requires metadata columns. Changed the raw table schema to `subscription_name`, `message_id`, `publish_time`, `data`, and `attributes`.
- The BigQuery subscription table identifier used BigQuery CLI colon syntax. The Pub/Sub gcloud documentation uses `PROJECT.DATASET.TABLE` for `--bigquery-table`, so the command was updated.
- The post described Pub/Sub BigQuery subscriptions as using streaming inserts. Current Pub/Sub documentation says BigQuery subscriptions use the BigQuery Storage Write API, so the wording and diagram label were corrected.
- The setup omitted the required BigQuery permission for the Pub/Sub service agent. Added the prerequisite and a `gcloud projects add-iam-policy-binding` example granting `roles/bigquery.dataEditor`.
- The Security Command Center service account name was incorrect. Current documentation uses `service-org-ORGANIZATION_ID@gcp-sa-scc-notification.iam.gserviceaccount.com`, and the service agent is created and granted the required role automatically when the notification config is created. Updated the section to grant Pub/Sub Admin to the caller instead of manually granting a publisher role to the wrong service account.
- The notification config example used `--filter=""`. Because the filter is optional, the command now omits the filter to capture all findings.
- The Cloud Function section referenced a structured table but did not create it. Added a matching `bq mk --table` command before the function code.
- The Cloud Function example attempted to read `projectDisplayName` from the finding, which is not a current SCC finding field. Changed the structured column to `project_id` and derived it from the notification resource path.
- The sample SQL queries counted every notification update as a separate finding. Updated the queries to select the latest row per `finding_name` before counting active findings.

## Review Notes
- The Python Cloud Function example uses the first-generation background function signature, which is still documented. For new deployments, a CloudEvents-style Cloud Run functions handler would also be appropriate.
- The direct Pub/Sub-to-BigQuery path stores notification JSON and is suitable for raw archival. More complex transformation or deduplication still belongs in the Cloud Function, Dataflow, or downstream BigQuery query layer.
