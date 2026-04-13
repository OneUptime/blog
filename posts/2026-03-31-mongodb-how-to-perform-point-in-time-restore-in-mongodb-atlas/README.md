# How to Perform Point-in-Time Restore in MongoDB Atlas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Point-in-Time Restore, Backup, Disaster Recovery

Description: Learn how to perform a point-in-time restore in MongoDB Atlas to recover your data to any second within the backup retention window.

---

## When to Use Point-in-Time Restore

Use point-in-time restore (PITR) when you need to recover from:
- Accidental bulk delete or drop operations
- Data corruption from a bad application deployment
- Logical errors applied to production data

## Prerequisites

- Continuous Cloud Backup must be enabled on the cluster
- `pitEnabled: true` in the cluster configuration
- The target restore time must fall within the oplog window

## Performing PITR via Atlas UI

1. Go to your cluster in Atlas
2. Click the "Backup" tab
3. Click "Restore" next to your backup policy
4. Select "Point in Time" as the restore type
5. Choose the target date and time
6. Select the restore destination (same cluster, new cluster, or download)
7. Confirm and initiate the restore

## Performing PITR via Atlas API

```bash
# Step 1: Identify the target timestamp
TARGET_TIMESTAMP="2026-03-30T14:30:00Z"

# Step 2: Initiate restore
curl -X POST \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/clusters/{clusterName}/backup/restoreJobs" \
  --digest -u "{publicKey}:{privateKey}" \
  -H "Content-Type: application/json" \
  -d '{
    "deliveryType": "pointInTime",
    "targetClusterName": "myRestoredCluster",
    "targetGroupId": "{groupId}",
    "oplogTs": 1774881000,
    "oplogInc": 1
  }'
```

## Converting Timestamp to Oplog Format

The oplog timestamp is a UNIX epoch value. Convert from ISO 8601:

```javascript
const targetDate = new Date("2026-03-30T14:30:00Z");
const oplogTs = Math.floor(targetDate.getTime() / 1000);
console.log("Oplog timestamp:", oplogTs);
```

## Restore Destination Options

**Automated restore to new cluster:**
- Atlas provisions a new cluster and restores to it
- No impact on existing cluster

**Automated restore to existing cluster:**
- Overwrites existing data - use with extreme caution
- Only choose this if recovering the same cluster is intended

**Download as archive:**
- Atlas creates a downloadable compressed archive
- You restore manually using `mongorestore`

## Monitoring the Restore Job

```bash
curl -X GET \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/clusters/{clusterName}/backup/restoreJobs/{jobId}" \
  --digest -u "{publicKey}:{privateKey}"
```

Check the response for boolean flags: `failed`, `cancelled`, and `expired`. The `finishedAt` field indicates when the restore completed.

## After the Restore

1. Verify data integrity on the restored cluster
2. Run application smoke tests
3. If satisfied, update your connection string to point to the restored cluster
4. Remove the old cluster or keep for comparison

## Summary

MongoDB Atlas point-in-time restore uses the oplog to replay changes to any second within the retention window. Initiate it via the UI or API, choosing a new cluster as the target to avoid data loss on the source. Always verify the restored data before updating application connection strings.
