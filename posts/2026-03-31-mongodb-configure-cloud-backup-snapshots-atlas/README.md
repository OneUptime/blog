# How to Configure Cloud Backup Snapshots in MongoDB Atlas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Backup, Snapshot, Data Protection

Description: Learn how to configure cloud backup snapshots in MongoDB Atlas including snapshot frequency, retention policies, and cross-region snapshot copies.

---

## What Are Cloud Backup Snapshots in Atlas

MongoDB Atlas Cloud Backups use incremental, cloud-provider-native snapshots. Unlike legacy backup methods, they capture the storage volume state without impacting cluster performance. Snapshots are stored in your cluster's cloud region and can be copied to additional regions.

## Step 1: Enable Cloud Backups via Atlas UI

Navigate to your cluster in the Atlas UI:

1. Click your cluster name
2. Click the **Backup** tab
3. Toggle **Turn on Cloud Backup** to enabled
4. Atlas immediately takes an initial snapshot

## Step 2: Configure Snapshot Schedule via API

Use the Atlas Admin API to set a custom snapshot schedule:

```bash
# Set snapshot schedule for a cluster
curl -u "PUBLIC_KEY:PRIVATE_KEY" \
  --digest \
  -X PATCH \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/clusters/{clusterName}/backup/schedule" \
  -H "Content-Type: application/json" \
  -d '{
    "referenceHourOfDay": 2,
    "referenceMinuteOfHour": 30,
    "policies": [
      {
        "id": "{policyId}",
        "policyItems": [
          {
            "frequencyType": "hourly",
            "frequencyInterval": 6,
            "retentionUnit": "days",
            "retentionValue": 7
          },
          {
            "frequencyType": "daily",
            "frequencyInterval": 1,
            "retentionUnit": "days",
            "retentionValue": 30
          },
          {
            "frequencyType": "weekly",
            "frequencyInterval": 6,
            "retentionUnit": "weeks",
            "retentionValue": 12
          },
          {
            "frequencyType": "monthly",
            "frequencyInterval": 40,
            "retentionUnit": "months",
            "retentionValue": 12
          }
        ]
      }
    ]
  }'
```

## Step 3: Verify Current Backup Policy

Check the current backup schedule:

```bash
curl -u "PUBLIC_KEY:PRIVATE_KEY" \
  --digest \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/clusters/{clusterName}/backup/schedule" \
  | python3 -m json.tool
```

Expected response structure:

```json
{
  "referenceHourOfDay": 2,
  "referenceMinuteOfHour": 30,
  "policies": [
    {
      "policyItems": [
        {
          "frequencyType": "hourly",
          "frequencyInterval": 6,
          "retentionUnit": "days",
          "retentionValue": 7,
          "id": "abc123"
        }
      ]
    }
  ]
}
```

## Step 4: Take an On-Demand Snapshot

Take a manual snapshot before a risky operation:

```bash
curl -u "PUBLIC_KEY:PRIVATE_KEY" \
  --digest \
  -X POST \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/clusters/{clusterName}/backup/snapshots" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "pre-migration-snapshot",
    "retentionInDays": 7
  }'
```

## Step 5: List Available Snapshots

View all available snapshots:

```bash
curl -u "PUBLIC_KEY:PRIVATE_KEY" \
  --digest \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/clusters/{clusterName}/backup/snapshots" \
  | python3 -c "
import json, sys
data = json.load(sys.stdin)
for s in data['results']:
    print(f\"{s['id']} | {s['createdAt']} | {s['status']} | {s['storageSizeBytes']//1024//1024} MB\")
"
```

## Step 6: Configure Cross-Region Snapshot Copies

Enable cross-region copies for disaster recovery:

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
        "frequencies": ["WEEKLY", "MONTHLY"]
      }
    ]
  }'
```

## Step 7: Monitor Snapshot Storage Costs

Track snapshot storage via the Atlas UI under Billing, or use the API:

```bash
curl -u "PUBLIC_KEY:PRIVATE_KEY" \
  --digest \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/clusters/{clusterName}/backup/snapshots?itemsPerPage=10" \
  | python3 -c "
import json, sys
data = json.load(sys.stdin)
total = sum(s['storageSizeBytes'] for s in data['results'] if 'storageSizeBytes' in s)
print(f'Total snapshot storage: {total/1024/1024/1024:.2f} GB')
"
```

## Summary

Configuring cloud backup snapshots in MongoDB Atlas involves enabling backups at the cluster level, setting snapshot frequency and retention policies via the Admin API, taking on-demand snapshots before risky operations, and optionally configuring cross-region copies for disaster recovery. The scheduled approach with hourly, daily, weekly, and monthly tiers balances recovery point objectives with storage costs.
