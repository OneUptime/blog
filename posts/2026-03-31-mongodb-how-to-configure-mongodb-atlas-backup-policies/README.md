# How to Configure MongoDB Atlas Backup Policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Backup, Disaster Recovery, Data Protection

Description: Configure MongoDB Atlas cloud backup policies including snapshot frequency, retention periods, and point-in-time recovery to protect your data.

---

## Atlas Backup Options

Atlas provides two backup methods:

- **Cloud Backup (recommended)**: Incremental snapshots using cloud storage with point-in-time recovery. Available on M10+.
- **Shared Cluster Backup**: Available on M2/M5, provides daily snapshots with 1-week retention only.

This guide covers Cloud Backup on dedicated tiers.

## How Cloud Backup Works

Atlas takes block-level snapshots of your cluster's data volumes. Snapshots are incremental after the first full snapshot, minimizing storage costs. For replica sets, snapshots are taken from the secondary. For sharded clusters, snapshots are coordinated across all shards.

## Step 1: Enable Cloud Backup

Cloud Backup is enabled by default on new M10+ clusters. Verify via the Atlas UI:

1. Click your cluster
2. Go to the **Backup** tab
3. Check that **Cloud Backup** is ON

Enable via CLI:

```bash
atlas backups schedule update \
  --clusterName myCluster \
  --exportBucketId "" \
  --referenceHourOfDay 4 \
  --referenceMinuteOfHour 0 \
  --restoreWindowDays 7
```

## Step 2: Configure Snapshot Policies

Define how often snapshots are taken and how long they're retained. Navigate to **Backup > Edit Backup Policy**:

### Example Policy

```text
Frequency    | Retention
-------------|----------
Hourly       | 2 days
Daily        | 7 days
Weekly       | 4 weeks
Monthly      | 12 months
```

Via the Atlas Administration API:

```bash
curl --user "publicKey:privateKey" --digest \
  --request PATCH \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/clusters/{clusterName}/backup/schedule" \
  --header "Content-Type: application/json" \
  --data '{
    "policies": [
      {
        "id": "policy1",
        "policyItems": [
          {
            "frequencyType": "hourly",
            "frequencyInterval": 6,
            "retentionUnit": "days",
            "retentionValue": 2
          },
          {
            "frequencyType": "daily",
            "frequencyInterval": 1,
            "retentionUnit": "days",
            "retentionValue": 7
          },
          {
            "frequencyType": "weekly",
            "frequencyInterval": 6,
            "retentionUnit": "weeks",
            "retentionValue": 4
          },
          {
            "frequencyType": "monthly",
            "frequencyInterval": 40,
            "retentionUnit": "months",
            "retentionValue": 12
          }
        ]
      }
    ],
    "referenceHourOfDay": 4,
    "referenceMinuteOfHour": 0,
    "restoreWindowDays": 7
  }'
```

## Step 3: Configure Point-in-Time Recovery

Point-in-time recovery (PiTR) allows restoring to any second within a recovery window using the oplog. Enable it:

```bash
curl --user "publicKey:privateKey" --digest \
  --request PATCH \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/clusters/{clusterName}" \
  --header "Content-Type: application/json" \
  --data '{
    "pitEnabled": true
  }'
```

Set the `restoreWindowDays` to control how far back PiTR can go (1-7 days). PiTR requires:
- Cloud Backup enabled
- Oplog retained for the window period

## Step 4: Take an On-Demand Snapshot

Create a snapshot outside the scheduled policy:

```bash
atlas backups snapshots create myCluster \
  --desc "Pre-migration snapshot" \
  --retentionInDays 7
```

Or via API:

```bash
curl --user "publicKey:privateKey" --digest \
  --request POST \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/clusters/{clusterName}/backup/snapshots" \
  --header "Content-Type: application/json" \
  --data '{
    "description": "Pre-migration snapshot",
    "retentionInDays": 7
  }'
```

## Step 5: List and View Snapshots

```bash
# List all snapshots
atlas backups snapshots list myCluster

# Describe a specific snapshot
atlas backups snapshots describe 5f4015d7b1234567890abcde \
  --clusterName myCluster
```

## Step 6: Restore from Snapshot

Restore options:
- **Automated Restore**: Restore to the same or a different Atlas cluster
- **Point-in-Time Restore**: Restore to a specific timestamp
- **Download**: Download the snapshot files

```bash
# Restore to a target cluster
atlas backups restores start automated \
  --clusterName myCluster \
  --snapshotId 5f4015d7b1234567890abcde \
  --targetClusterName myRestoredCluster \
  --targetProjectId targetProjectId
```

Point-in-time restore:

```bash
atlas backups restores start pointInTime \
  --clusterName myCluster \
  --pointInTimeUTCSeconds 1704067200 \
  --targetClusterName myRestoredCluster \
  --targetProjectId targetProjectId
```

## Step 7: Export Snapshots to Your Own S3

For compliance or long-term retention, export snapshots to your S3 bucket:

```bash
curl --user "publicKey:privateKey" --digest \
  --request POST \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/clusters/{clusterName}/backup/exports" \
  --header "Content-Type: application/json" \
  --data '{
    "snapshotId": "5f4015d7b1234567890abcde",
    "exportBucketId": "your-export-bucket-id"
  }'
```

## Summary

Atlas Cloud Backup provides automated incremental snapshots with configurable frequency and retention at hourly, daily, weekly, and monthly intervals. Enable point-in-time recovery for granular restore capability, take on-demand snapshots before risky operations, and restore to the same or new cluster from any retained snapshot. Export snapshots to your own S3 for long-term compliance retention beyond Atlas's native retention limits.
