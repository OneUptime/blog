# How to Restore from Atlas Backup Snapshots

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Backup, Restore, Disaster Recovery

Description: Learn how to restore MongoDB Atlas clusters from backup snapshots using the Atlas UI and Admin API, including automated and cross-cluster restores.

---

## Restore Options in MongoDB Atlas

Atlas provides three restore methods from cloud backup snapshots:
- **Automated restore** - restores directly to the same or a different Atlas cluster
- **Download restore** - downloads the snapshot as a compressed archive to restore manually
- **Point-in-time restore** - uses oplogs to restore to a specific timestamp

This guide focuses on automated snapshot restores.

## Step 1: Find the Snapshot ID to Restore

List available snapshots via the Admin API:

```bash
curl -u "PUBLIC_KEY:PRIVATE_KEY" \
  --digest \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/clusters/{clusterName}/backup/snapshots?itemsPerPage=20" \
  -H "Accept: application/json" \
  | python3 -c "
import json, sys
data = json.load(sys.stdin)
for s in data['results']:
    status = s.get('status', 'unknown')
    created = s.get('createdAt', 'unknown')
    sid = s.get('id', 'unknown')
    print(f'{created} | {sid} | {status}')
"
```

Note the snapshot ID from the output for the restore.

## Step 2: Restore to the Same Cluster

Initiate an automated restore to the originating cluster:

```bash
curl -u "PUBLIC_KEY:PRIVATE_KEY" \
  --digest \
  -X POST \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/clusters/{clusterName}/backup/restoreJobs" \
  -H "Content-Type: application/json" \
  -d '{
    "deliveryType": "automated",
    "targetClusterName": "myCluster",
    "targetGroupId": "{groupId}",
    "snapshotId": "{snapshotId}"
  }'
```

Note: Restoring to the same cluster overwrites all existing data. This is irreversible.

## Step 3: Restore to a Different Cluster

For safer restores, target a separate cluster to validate data before cutover:

```bash
curl -u "PUBLIC_KEY:PRIVATE_KEY" \
  --digest \
  -X POST \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/clusters/{clusterName}/backup/restoreJobs" \
  -H "Content-Type: application/json" \
  -d '{
    "deliveryType": "automated",
    "targetClusterName": "myCluster-restore-test",
    "targetGroupId": "{groupId}",
    "snapshotId": "{snapshotId}"
  }'
```

The target cluster must exist and be the same tier as the source cluster.

## Step 4: Monitor the Restore Job

Track the restore job status:

```bash
# Get the restore job ID from the previous response
RESTORE_JOB_ID="{restoreJobId}"

curl -u "PUBLIC_KEY:PRIVATE_KEY" \
  --digest \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/clusters/{clusterName}/backup/restoreJobs/${RESTORE_JOB_ID}" \
  | python3 -c "
import json, sys
data = json.load(sys.stdin)
finished = data.get('finishedAt')
failed = data.get('failed', False)
cancelled = data.get('cancelled', False)
if failed:
    print('Status: FAILED')
elif cancelled:
    print('Status: CANCELLED')
elif finished:
    print(f'Status: COMPLETED at {finished}')
else:
    print('Status: IN_PROGRESS')
print(f'Timestamp: {data.get(\"timestamp\")}')
"
```

Poll until the status shows `COMPLETED`.

## Step 5: Verify the Restored Data

After restore completes, connect to the target cluster and validate:

```javascript
// Check document counts
const collections = db.getCollectionNames();
collections.forEach(coll => {
  const count = db[coll].countDocuments({});
  print(`${coll}: ${count} documents`);
});

// Spot-check recent data
db.orders.find({}).sort({ createdAt: -1 }).limit(1);

// Verify indexes
db.getCollectionNames().forEach(coll => {
  const indexes = db[coll].getIndexes();
  print(`${coll}: ${indexes.length} indexes`);
});
```

## Step 6: Restore via Atlas UI

For one-off restores, the UI is simpler:

1. Navigate to your cluster in Atlas
2. Click the **Backup** tab
3. Find the snapshot in the list
4. Click **Restore**
5. Choose **Restore to Atlas Cluster**
6. Select target project and cluster
7. Confirm the restore

## Step 7: Set Up a Restore Runbook

Document your restore procedure for incident response:

```text
MongoDB Atlas Restore Runbook
=============================
1. Identify data loss window (check application logs for last known good state)
2. List snapshots: GET /groups/{gid}/clusters/{name}/backup/snapshots
3. Choose snapshot created before the incident
4. Create restore cluster if restoring to separate target
5. POST restore job to target cluster
6. Monitor job status until COMPLETED
7. Validate data on restored cluster
8. Update application connection string to point to restored cluster
9. Verify application functionality
10. Terminate original cluster or archive it
```

## Summary

Restoring from MongoDB Atlas backup snapshots uses the Admin API to list available snapshots, initiate automated restores to the same or a different cluster, and monitor job completion. Always restore to a separate cluster first to validate data before cutting over production traffic. Maintain a documented runbook to minimize recovery time during incidents.
