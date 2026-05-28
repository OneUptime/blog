# Validation Summary: How to Create and Restore Backups for Google Cloud Filestore Instances

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Filestore
- Filestore backups and restores
- gcloud CLI
- Cloud Scheduler
- Cloud Functions / Cloud Run functions
- Pub/Sub
- Python Google Cloud client libraries
- IAM

## Sources Consulted
- Google Cloud Filestore backups overview: https://cloud.google.com/filestore/docs/backups
- Google Cloud Filestore create standard backup guide: https://cloud.google.com/filestore/docs/backups-standard
- Google Cloud Filestore restore data guide: https://cloud.google.com/filestore/docs/restore-data
- Google Cloud Filestore schedule backups with Cloud Scheduler guide: https://cloud.google.com/filestore/docs/schedule-backups-cloud-scheduler
- gcloud filestore backups create reference: https://cloud.google.com/sdk/gcloud/reference/filestore/backups/create
- gcloud filestore backups list reference: https://cloud.google.com/sdk/gcloud/reference/filestore/backups/list
- gcloud filestore instances restore reference: https://cloud.google.com/sdk/gcloud/reference/filestore/instances/restore
- Filestore Backup REST resource reference: https://cloud.google.com/filestore/docs/reference/rest/v1/projects.locations.backups
- Google Cloud IAM Filestore roles and permissions: https://cloud.google.com/iam/docs/roles-permissions/file

## Issues Found
- The first restore-to-new-instance command incorrectly used `gcloud filestore instances restore` with a composite `--file-share` value. Current Google Cloud documentation restores to a new instance with `gcloud filestore instances create` and `source-backup` / `source-backup-region` in the `--file-share` specification. Updated the command accordingly.
- The post implied that restoring to a new instance should be done by creating a blank instance first and then running `instances restore`. Current Filestore restore semantics are tier-specific: Basic HDD and Basic SSD backups can be restored to existing instances, while Zonal, Regional, and Enterprise backups restore to new instances. Updated the text and command examples to reflect this.
- The target capacity statement said the target must be at least as large as the backup's source data. Google Cloud documentation specifies that an existing restore target must have capacity greater than or equal to the original source instance capacity. Updated the wording.
- Updated the restore-to-new-instance capacity example from `1TB` to `1TiB` to match Google Cloud's documented capacity unit examples for Filestore instance creation from backup.

## Review Notes
The gcloud backup creation, describe, list, delete, and formatting examples match the current documented command shape. The backup state names and backup resource fields such as `capacityGb`, `storageBytes`, `sourceInstance`, and `sourceFileShare` are valid. The post's Cloud Scheduler automation approach is plausible, though Google's current tutorial emphasizes Cloud Scheduler invoking authenticated Cloud Run functions over HTTP; the Pub/Sub-triggered Cloud Function pattern remains a workable alternative when deployed with the appropriate trigger and IAM.
