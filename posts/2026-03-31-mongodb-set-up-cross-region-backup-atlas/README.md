# How to Set Up Cross-Region Backup for MongoDB Atlas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Backup, Disaster Recovery, Cross-Region

Description: Learn how to configure cross-region backup snapshot copies in MongoDB Atlas for geographic redundancy and disaster recovery compliance.

---

## Why Cross-Region Backups Matter

Storing backup snapshots only in the primary region means a regional outage or data center disaster could affect both your cluster and its backups. Cross-region snapshot copies ensure backup availability from a geographically separate location, satisfying disaster recovery requirements and meeting RTO/RPO objectives.

## Step 1: Understand Cross-Region Copy Architecture

Atlas copies snapshots to secondary regions asynchronously after they are created in the primary region. Key considerations:

```text
Primary Region:  us-east-1 (cluster + primary snapshots)
Secondary Region: us-west-2 (snapshot copies)
Copy Lag:        15-60 minutes after primary snapshot completes
Storage Cost:    Additional charges for cross-region snapshot storage
```

## Step 2: Get the Replication Spec ID

Cross-region copies are configured per replication spec. Retrieve your cluster's replication spec ID:

```bash
curl -u "PUBLIC_KEY:PRIVATE_KEY" \
  --digest \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/clusters/{clusterName}" \
  | python3 -c "
import json, sys
data = json.load(sys.stdin)
for spec in data.get('replicationSpecs', []):
    print(f'Spec ID: {spec[\"id\"]}')
    for region_config in spec.get('regionsConfig', {}).items():
        print(f'  Region: {region_config}')
"
```

## Step 3: Configure Cross-Region Snapshot Copies

Update the backup schedule to include cross-region copy settings:

```bash
curl -u "PUBLIC_KEY:PRIVATE_KEY" \
  --digest \
  -X PATCH \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/clusters/{clusterName}/backup/schedule" \
  -H "Content-Type: application/json" \
  -d '{
    "copySettings": [
      {
        "cloudProvider": "AWS",
        "regionName": "US_WEST_2",
        "replicationSpecId": "{replicationSpecId}",
        "shouldCopyOplogs": true,
        "frequencies": ["HOURLY", "DAILY", "WEEKLY", "MONTHLY"]
      }
    ]
  }'
```

The `shouldCopyOplogs` field enables point-in-time restore from the secondary region.

## Step 4: Configure Multiple Secondary Regions

For maximum geographic redundancy, copy to multiple regions:

```bash
curl -u "PUBLIC_KEY:PRIVATE_KEY" \
  --digest \
  -X PATCH \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/clusters/{clusterName}/backup/schedule" \
  -H "Content-Type: application/json" \
  -d '{
    "copySettings": [
      {
        "cloudProvider": "AWS",
        "regionName": "US_WEST_2",
        "replicationSpecId": "{replicationSpecId}",
        "shouldCopyOplogs": true,
        "frequencies": ["DAILY", "WEEKLY", "MONTHLY"]
      },
      {
        "cloudProvider": "AWS",
        "regionName": "EU_WEST_1",
        "replicationSpecId": "{replicationSpecId}",
        "shouldCopyOplogs": false,
        "frequencies": ["WEEKLY", "MONTHLY"]
      }
    ]
  }'
```

## Step 5: Verify Cross-Region Copies Exist

List snapshots and check which regions they have been copied to:

```bash
curl -u "PUBLIC_KEY:PRIVATE_KEY" \
  --digest \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/clusters/{clusterName}/backup/snapshots?itemsPerPage=5" \
  | python3 -c "
import json, sys
data = json.load(sys.stdin)
for s in data['results']:
    print(f'Snapshot: {s[\"id\"]} | {s[\"createdAt\"]}')
    for region in s.get('copyRegions', []):
        print(f'  Copy in: {region}')
"
```

## Step 6: Restore from a Secondary Region Snapshot

To restore from the secondary region copy (e.g., during a primary region outage):

```bash
# Create a new cluster in the secondary region first, then restore
curl -u "PUBLIC_KEY:PRIVATE_KEY" \
  --digest \
  -X POST \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/clusters/{clusterName}/backup/restoreJobs" \
  -H "Content-Type: application/json" \
  -d '{
    "delivery": {
      "methodName": "AUTOMATED_RESTORE",
      "targetClusterName": "cluster-dr-restore",
      "targetGroupId": "{groupId}"
    },
    "snapshotId": "{snapshotId}"
  }'
```

## Step 7: Test Your Cross-Region Recovery

Test the recovery procedure regularly:

```bash
#!/bin/bash
echo "=== DR Test: $(date) ==="
echo "1. Listing latest cross-region snapshots..."
# List snapshots with copies

echo "2. Creating test restore cluster..."
# Create temporary cluster

echo "3. Restoring from secondary region snapshot..."
# Initiate restore job

echo "4. Verifying data integrity..."
# Connect and validate

echo "5. Cleaning up test cluster..."
# Delete temporary cluster
```

## Summary

Cross-region backup copies in MongoDB Atlas are configured via the Admin API by specifying target cloud provider regions, replication spec IDs, and which snapshot frequencies to copy. Enable `shouldCopyOplogs` on at least one secondary region to maintain point-in-time restore capability from that region. Test the cross-region recovery process quarterly to validate your actual RTO and RPO.
