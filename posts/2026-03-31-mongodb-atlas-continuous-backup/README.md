# How to Use MongoDB Atlas Continuous Backup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Backup, Continuous Backup, Cloud

Description: Enable and configure MongoDB Atlas Continuous Backup to protect your data with point-in-time recovery and automated snapshot scheduling.

---

## What Is Atlas Continuous Backup?

MongoDB Atlas offers two backup solutions: Cloud Backup (snapshot-based) and the legacy Continuous Backup. Modern Atlas clusters use **Continuous Cloud Backup** which combines periodic snapshots with oplog-based recovery to support point-in-time restore to any second within your retention window.

## Enabling Backup in Atlas

Navigate to your cluster in the Atlas UI and enable backups:

1. Go to your cluster and click **Edit Configuration**
2. Under **Additional Settings**, toggle **Turn on Cloud Backup**
3. Select your backup policy and retention

Or via the Atlas CLI:

```bash
atlas clusters update myCluster \
  --projectId <projectId> \
  --backup true
```

## Configuring Backup Policy via API

Use the Atlas Administration API to configure snapshot schedules:

```bash
curl -u "publicKey:privateKey" \
  --digest \
  -X PATCH \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/clusters/{clusterName}/backup/schedule" \
  -H "Content-Type: application/json" \
  -d '{
    "referenceHourOfDay": 2,
    "referenceMinuteOfHour": 30,
    "restoreWindowDays": 7,
    "policies": [{
      "id": "5c95242c87d9d636e70c28ef",
      "policyItems": [{
        "frequencyInterval": 6,
        "frequencyType": "hourly",
        "retentionUnit": "days",
        "retentionValue": 7
      }]
    }]
  }'
```

## Viewing Snapshots

List available snapshots via the API:

```bash
curl -u "publicKey:privateKey" \
  --digest \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/clusters/{clusterName}/backup/snapshots"
```

Or in the Atlas UI under **Backup** for your cluster.

## Restoring to a Point in Time

To restore to a specific time:

1. In Atlas, go to **Backup** for your cluster
2. Click **Restore**
3. Choose **Point in Time Restore**
4. Select a target time within your retention window
5. Choose restore target: same cluster, new cluster, or download

Via the Atlas API:

```bash
curl -u "publicKey:privateKey" \
  --digest \
  -X POST \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/clusters/{clusterName}/backup/restoreJobs" \
  -H "Content-Type: application/json" \
  -d '{
    "delivery": {
      "methodName": "AUTOMATED_RESTORE",
      "targetClusterName": "myRestoredCluster",
      "targetGroupId": "{groupId}"
    },
    "pointInTimeUTCSeconds": 1706745600
  }'
```

## Backup Retention Options

| Frequency | Example Retention |
|---|---|
| Hourly | 2 days |
| Daily | 7 days |
| Weekly | 4 weeks |
| Monthly | 12 months |

## Monitoring Backup Health

Check that backups are succeeding in the Atlas UI under **Alerts**. Configure alert rules for backup failures:

```bash
atlas alerts settings create \
  --event BACKUP_RESTORE_FAILED \
  --enabled true \
  --notificationType EMAIL \
  --notificationEmailAddress ops@example.com
```

## Summary

MongoDB Atlas Continuous Backup combines scheduled snapshots with oplog capture to enable point-in-time recovery. Enable it from the Atlas UI or API, configure retention policies to match your RPO requirements, and set up alerts to monitor backup health. Test your restore procedure regularly to ensure RTO objectives can be met.
