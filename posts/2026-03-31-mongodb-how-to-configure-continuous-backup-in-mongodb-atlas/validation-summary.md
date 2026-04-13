# Validation Summary: How to Configure Continuous Backup in MongoDB Atlas

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Atlas
- MongoDB Atlas Admin API v1.0
- Continuous Cloud Backup
- Point-in-Time (PIT) Restore
- Cloud Backup Scheduling

## Sources Consulted
- MongoDB Atlas Admin API v1.0 — Update One Cluster: https://www.mongodb.com/docs/api/doc/atlas-admin-api-v1/operation/operation-updatecluster
- MongoDB Atlas Admin API v2 — Cloud Backups endpoints: https://www.mongodb.com/docs/api/doc/atlas-admin-api-v2/group/endpoint-cloud-backups
- MongoDB Atlas — Configure Backup Policy: https://www.mongodb.com/docs/atlas/backup/cloud-backup/configure-backup-policy/
- MongoDB Atlas — Recover a Point In Time with Continuous Cloud Backup: https://www.mongodb.com/docs/atlas/recover-pit-continuous-cloud-backup/
- MongoDB Atlas — Dedicated Cluster Backups: https://www.mongodb.com/docs/atlas/backup/cloud-backup/dedicated-cluster-backup/
- MongoDB Atlas — Fix Oplog Issues: https://www.mongodb.com/docs/atlas/reference/alert-resolutions/replication-oplog/
- MongoDB Atlas Kubernetes Operator — AtlasBackupPolicy Custom Resource: https://www.mongodb.com/docs/atlas/operator/v2.11/atlasbackuppolicy-custom-resource/

## Issues Found

1. **`backupEnabled` should be `providerBackupEnabled`** (line 31): The field `backupEnabled` refers to the deprecated Legacy Backup system in the Atlas API v1.0. The correct field for enabling Cloud Backup (cloud provider snapshots) is `providerBackupEnabled`. Changed `"backupEnabled": true` to `"providerBackupEnabled": true`.

2. **Backup schedule API method was `PUT`, should be `PATCH`** (line 41): The Atlas Admin API uses `PATCH` (not `PUT`) for the `/groups/{groupId}/clusters/{clusterName}/backup/schedule` endpoint. Changed `curl -X PUT` to `curl -X PATCH`.

3. **Inaccurate oplog window size claim by cluster tier** (line 93): The original text stated "M10 clusters provide at least 1 hour of oplog; M30 and above provide up to 24 hours." This is incorrect — the PIT restore oplog window is determined by write volume and configured oplog size, not hard-limited by cluster tier. Rewrote the paragraph to accurately reflect that all M10+ clusters support PIT restore and that the window is configurable.

## Review Notes
- The post uses the Atlas Admin API v1.0 (`/api/atlas/v1.0/`). MongoDB has released API v2.0 (`/api/atlas/v2/`). While v1.0 still works, a future update could mention the newer API version.
- The "Oplog Retention for PIT Restore" section's API call (`PATCH` with `pitEnabled: true`) is functionally redundant with the first "Enabling Continuous Backups" API call. It could be improved by showing how to configure `oplogMinRetentionHours` or `restoreWindowDays` instead, but this is a content improvement rather than a technical error.
- The `frequencyInterval: 40` for monthly snapshots is valid — it represents "last day of the month" per Atlas documentation.
- The `frequencyInterval: 6` for weekly snapshots is valid — it represents Saturday (1=Monday through 7=Sunday).
