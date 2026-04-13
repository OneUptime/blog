# Validation Summary: How to Configure MongoDB Atlas Backup Policies

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- MongoDB Atlas Cloud Backup
- MongoDB Atlas CLI (`atlas` CLI)
- MongoDB Atlas Administration API v1.0
- Point-in-Time Recovery (PiTR)
- S3 snapshot export

## Sources Consulted
- MongoDB Atlas Cloud Backup documentation: https://www.mongodb.com/docs/atlas/backup/cloud-backup/overview/
- MongoDB Atlas API v1.0 — Cloud Backup Schedule: https://www.mongodb.com/docs/atlas/reference/api/cloud-backup-schedule/
- MongoDB Atlas API v1.0 — Clusters: https://www.mongodb.com/docs/atlas/reference/api/clusters/
- MongoDB Atlas CLI — `atlas backups snapshots create`: https://www.mongodb.com/docs/atlas/cli/stable/command/atlas-backups-snapshots-create/
- MongoDB Atlas CLI — `atlas backups snapshots describe`: https://www.mongodb.com/docs/atlas/cli/stable/command/atlas-backups-snapshots-describe/
- MongoDB Atlas CLI — `atlas backups restores start`: https://www.mongodb.com/docs/atlas/cli/stable/command/atlas-backups-restores-start/

## Issues Found

1. **Incorrect API field name for enabling PiTR (Step 3)**: The post used `"pitrEnabled": true` in the cluster PATCH API call. The correct field name for the Atlas API v1.0 cluster endpoint is `"pitEnabled"` (without the 'r'). Fixed to `"pitEnabled": true`.

2. **Incorrect CLI flag for snapshot retention (Step 4)**: The `atlas backups snapshots create` command used `--retention 7`, which is not a valid flag. The correct flag is `--retentionInDays 7`. Fixed accordingly.

3. **Incorrect CLI syntax for snapshot describe (Step 5)**: The command was written as `atlas backups snapshots describe myCluster --snapshotId <id>`, but the `describe` subcommand takes the snapshot ID as a positional argument and the cluster name as a `--clusterName` flag. Fixed to `atlas backups snapshots describe <snapshotId> --clusterName myCluster`.

## Review Notes
- The backup schedule API call uses `frequencyInterval: 40` for the monthly policy item. This is valid and means "last day of the month" (values 1-28 represent specific days, 40 represents the last day). However, this non-obvious convention could benefit from an inline comment in a future update.
- The post uses the Atlas API v1.0 endpoints throughout. MongoDB has released a v2 API with some structural differences. The v1.0 endpoints still work but may be deprecated in the future.
- The `--exportBucketId ""` flag in the Step 1 CLI command is unnecessary when simply configuring the backup schedule (it sets the export bucket to empty). It won't cause an error but could be removed for clarity.
- The post states the PiTR restore window (`restoreWindowDays`) supports 1-7 days. With Backup Compliance Policy enabled, the window can extend further. The stated range is correct for standard configurations but could be noted as expandable.
