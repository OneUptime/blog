# Validation Summary: How to Restore from Atlas Backup Snapshots

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Atlas (Cloud Backup)
- MongoDB Atlas Admin API v1.0
- mongosh (MongoDB Shell)
- curl with digest authentication

## Sources Consulted
- MongoDB Atlas Cloud Backup Restore documentation: https://www.mongodb.com/docs/atlas/backup/cloud-backup/restore-overview/
- Atlas Admin API v1.0 — Cloud Backup Restore Jobs: https://www.mongodb.com/docs/atlas/reference/api/cloud-backup/restore/restoreJobs/
- Atlas Admin API v1.0 — Cloud Backup Snapshots: https://www.mongodb.com/docs/atlas/reference/api/cloud-backup/schedule/get-all-schedules/
- MongoDB Shell (`mongosh`) findOne documentation: https://www.mongodb.com/docs/mongodb-shell/reference/methods/
- MongoDB Legacy Backup vs Cloud Backup API differences: https://www.mongodb.com/docs/atlas/reference/api/cloud-backup/restore/create-one-restore-job/

## Issues Found

1. **Incorrect request body format for restore jobs (Steps 2 and 3):** The post used a nested `delivery` object with `methodName: "AUTOMATED_RESTORE"`, which is the Legacy Backup API format. Since the post is about Atlas Cloud Backup snapshots, the correct format uses flat top-level fields: `deliveryType: "automated"`, `targetClusterName`, `targetGroupId`, and `snapshotId`. Fixed both restore examples to use the Cloud Backup request body format.

2. **Incorrect `findOne` usage with sort (Step 5):** `db.orders.findOne({}, { sort: { createdAt: -1 } })` passes `{ sort: { createdAt: -1 } }` as the projection parameter, not as a sort option. This would project a field called `sort` rather than sorting results. Changed to `db.orders.find({}).sort({ createdAt: -1 }).limit(1)` which correctly sorts and limits to one document.

3. **Monitoring script references non-existent `status` field (Step 4):** The Cloud Backup restore job API response does not include a `status` field. Instead, it uses boolean fields (`failed`, `cancelled`, `expired`) and `finishedAt` to indicate job state. Rewrote the monitoring script to check these documented fields and derive the status accordingly.

## Review Notes
- The post uses Atlas Admin API v1.0. MongoDB has introduced API v2 (`/api/atlas/v2/`) with updated endpoints and response schemas. While v1.0 is still supported, a future update could migrate the examples to v2.
- The digest authentication method (`curl -u ... --digest`) shown is correct for Atlas programmatic API keys but could note that Atlas also supports Bearer token auth with service accounts in newer setups.
- The runbook in Step 7 is a good operational reference. Step 10 ("Terminate original cluster") should be approached with caution in practice — archiving is generally safer until the restored cluster is fully validated in production.
