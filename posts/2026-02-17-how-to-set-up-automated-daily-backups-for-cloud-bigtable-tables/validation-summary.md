# Validation Summary: How to Set Up Automated Daily Backups for Cloud Bigtable Tables

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Bigtable
- Bigtable backups
- Bigtable Python client library
- Cloud Functions
- Cloud Scheduler
- Cloud Logging and Cloud Monitoring
- Google Cloud CLI

## Sources Consulted
- Google Cloud Bigtable backups overview: https://cloud.google.com/bigtable/docs/backups
- Google Cloud Bigtable manage backups guide: https://cloud.google.com/bigtable/docs/managing-backups
- Google Cloud Bigtable Python client `Table.backup` and `Table.list_backups` reference: https://cloud.google.com/python/docs/reference/bigtable/latest/table
- Google Cloud Bigtable Python client `Backup` reference: https://cloud.google.com/python/docs/reference/bigtable/latest/google.cloud.bigtable.backup.Backup
- Google Cloud Bigtable Python `BigtableTableAdminClient.list_backups` and `delete_backup` reference: https://cloud.google.com/python/docs/reference/bigtable/latest/google.cloud.bigtable_admin_v2.overlay.services.bigtable_table_admin.BigtableTableAdminClient
- `gcloud functions deploy` reference: https://cloud.google.com/sdk/gcloud/reference/functions/deploy
- `gcloud functions add-invoker-policy-binding` reference: https://cloud.google.com/sdk/gcloud/reference/functions/add-invoker-policy-binding
- Cloud Scheduler authenticated HTTP targets documentation: https://cloud.google.com/scheduler/docs/http-target-auth
- `gcloud scheduler jobs create http` reference: https://cloud.google.com/sdk/gcloud/reference/scheduler/jobs/create/http
- `gcloud logging metrics create` reference: https://cloud.google.com/sdk/gcloud/reference/logging/metrics/create
- `gcloud bigtable backups list` reference: https://cloud.google.com/sdk/gcloud/reference/bigtable/backups/list
- Cloud Run functions runtime support matrix: https://cloud.google.com/functions/docs/runtime-support

## Issues Found
- The post described Bigtable replication and backups in outdated or imprecise terms. Updated the introduction and backup overview to reflect that Bigtable can replicate across clusters, Bigtable now supports managed automated backup policies, manually created backups are stored in a selected cluster in the source table's instance, and backups can be restored to new tables in existing Bigtable instances.
- The Python backup function used `cluster.backup(...)`, which is not part of the current high-level Bigtable Python client API. Replaced it with `instance.table(table_id).backup(...)` and `backup.create()`, matching the official `Table.backup` and `Backup.create` API.
- The generated backup ID could exceed Bigtable's 50-character backup ID limit for longer table IDs. Added deterministic truncation plus a short SHA-1 hash and timestamp to keep IDs within the documented limit while preserving uniqueness.
- The function caught backup exceptions, printed them, and still returned HTTP 200, so Cloud Scheduler and the log-based metric could treat failed backups as successful. Updated the code to log exceptions with error severity and return HTTP 500 if any table backup fails.
- The deployment and Scheduler authentication flow used an OIDC service account but did not grant invoker permission on the function. Added `--no-allow-unauthenticated` to the deploy command and a `gcloud functions add-invoker-policy-binding` command for the Scheduler service account.
- The cleanup function used `cluster.list_backups()`, which is not part of the current high-level client API. Replaced it with `BigtableTableAdminClient.list_backups(parent=...)` and `delete_backup(name=...)`.
- The test command used `cbt listbackups`, which is not present in the current official `cbt` reference. Replaced it with `gcloud bigtable backups list --instance=... --cluster=...`.
- The cross-region disaster recovery guidance implied a single manual backup strategy was sufficient. Updated it to recommend replication plus backup copies or automated backups on multiple clusters for cross-region recovery.

## Review Notes
Python snippets were syntax-checked locally. The local environment does not have `gcloud` or the Google Cloud Python libraries installed, so command and API validation was performed against official Google Cloud documentation rather than local execution.
