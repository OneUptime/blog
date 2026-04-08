# Validation Summary: How to Configure Cloud Backup Snapshots in MongoDB Atlas

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas
- MongoDB Atlas Admin API (v1.0)
- Cloud Backup Snapshots (incremental, cloud-provider-native)
- curl with HTTP Digest authentication
- Python 3 (for JSON parsing in CLI examples)

## Sources Consulted
- MongoDB Atlas Admin API documentation for Cloud Backup Schedule: https://www.mongodb.com/docs/atlas/reference/api-resources-spec/v1/#tag/Cloud-Backups/operation/updateBackupSchedule
- MongoDB Atlas Admin API documentation for On-Demand Snapshots: https://www.mongodb.com/docs/atlas/reference/api-resources-spec/v1/#tag/Cloud-Backups/operation/takeSnapshot
- MongoDB Atlas Cloud Backup overview: https://www.mongodb.com/docs/atlas/backup/cloud-backup/overview/
- MongoDB Atlas Backup Schedule configuration: https://www.mongodb.com/docs/atlas/backup/cloud-backup/schedule/

## Issues Found
- **Invalid policy `id` value in Step 2**: The `id` field in the policies array was set to `"hourly"`, which is not a valid Atlas policy ID. Atlas auto-generates ObjectId-style IDs for backup policies. When PATCHing the schedule, users must first GET the current schedule to retrieve the actual policy ID. Changed `"id": "hourly"` to `"id": "{policyId}"` to make it a clear placeholder consistent with the other placeholders in the API URLs (`{groupId}`, `{clusterName}`).

## Review Notes
- The API uses v1.0 endpoints. MongoDB Atlas also offers a v2 API, but v1.0 remains functional and documented.
- The `frequencyInterval: 40` for monthly snapshots is valid — it represents the last day of the month in the Atlas API.
- The `frequencyInterval: 6` for weekly snapshots represents Saturday (1=Monday through 7=Sunday).
- Valid hourly `frequencyInterval` values are 1, 2, 4, 6, 8, and 12. The value 6 (every 6 hours) is correct.
- The cross-region copy settings use `shouldCopyOplogs: true` which enables point-in-time restore capability for the copied snapshots — this is correct but worth noting as it increases storage costs.
- The Python inline scripts for parsing JSON output use f-strings and would require Python 3.6+.
