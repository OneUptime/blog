# Validation Summary: How to Create and Restore Bigtable Backups

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Bigtable
- Bigtable backups and restore operations
- Google Cloud CLI (`gcloud`)
- Cloud Scheduler / scheduled Cloud Functions for Firebase
- Node.js Bigtable admin client
- Python Bigtable client library

## Sources Consulted
- Google Cloud Bigtable backups overview: https://cloud.google.com/bigtable/docs/backups
- Google Cloud Bigtable manage backups guide: https://cloud.google.com/bigtable/docs/managing-backups
- `gcloud bigtable backups create` reference: https://cloud.google.com/sdk/gcloud/reference/bigtable/backups/create
- `gcloud bigtable tables restore` reference: https://cloud.google.com/sdk/gcloud/reference/bigtable/tables/restore
- Node.js `v2.BigtableTableAdminClient` reference: https://cloud.google.com/nodejs/docs/reference/bigtable/latest/bigtable/v2.bigtabletableadminclient
- Python `google.cloud.bigtable.table.Table` reference: https://cloud.google.com/python/docs/reference/bigtable/latest/google.cloud.bigtable.table.Table
- Python `google.cloud.bigtable.backup.Backup` reference: https://cloud.google.com/python/docs/reference/bigtable/latest/google.cloud.bigtable.backup.Backup
- Cloud Functions for Firebase scheduled functions documentation: https://firebase.google.com/docs/functions/schedule-functions

## Issues Found
- The restore command used `gcloud bigtable backups restore`, which is not the documented command. Changed both restore examples to use `gcloud bigtable tables restore` with the documented `--source`, `--source-instance`, `--source-cluster`, `--destination`, and `--destination-instance` flags.
- The post stated that cross-instance restore must stay in the same project. Current Bigtable documentation allows restore to any existing instance, including across projects when fully qualified resource names are used. Updated the wording and example.
- The post described backup creation as simply asynchronous. The API is a long-running operation, but the `gcloud` command waits by default unless `--async` is used. Updated the explanation.
- The Python sample used non-existent high-level methods such as `cluster.backup()` and `cluster.list_backups()`. Updated it to use documented `table.backup()`, `table.list_backups()`, and `backup_module.Backup(...).restore()` APIs, and to wait on the restore operation.
- The post said regular backup retention is limited to 30 days. Current documentation says regular backups can be retained for up to 90 days, while backup copies can be retained for up to 30 days. Updated the limitation text.
- The post described backups as point-in-time snapshots. Bigtable documentation notes that backups do not represent a fully consistent state. Updated the wording to describe backups as recoverable copies and clarified the consistency caveat.

## Review Notes
The Node.js admin client example uses a documented current Bigtable admin client. The scheduled function style shown is compatible with Firebase scheduled functions, though future revisions could modernize it to the current Cloud Functions v2 scheduler API if the blog wants to prefer newer examples.
