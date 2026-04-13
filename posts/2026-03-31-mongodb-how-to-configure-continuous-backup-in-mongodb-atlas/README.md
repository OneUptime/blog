# How to Configure Continuous Backup in MongoDB Atlas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Backup, Continuous Backup, Disaster Recovery

Description: Learn how to configure Continuous Cloud Backups in MongoDB Atlas to enable point-in-time restore and protect your data from accidental deletion or corruption.

---

## What Is Continuous Cloud Backup

MongoDB Atlas Continuous Cloud Backup captures incremental snapshots and stores the oplog, enabling point-in-time restore to any second within your configured retention window.

## Enabling Continuous Backups

In the Atlas UI:
1. Navigate to your cluster
2. Click "Backup" in the left menu
3. Click "Edit Backup Policy"
4. Enable "Continuous Cloud Backup"

Via Atlas API:

```bash
curl -X PATCH \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/clusters/{clusterName}" \
  --digest -u "{publicKey}:{privateKey}" \
  -H "Content-Type: application/json" \
  -d '{
    "providerBackupEnabled": true,
    "pitEnabled": true
  }'
```

## Configuring Backup Policy

Set snapshot frequency and retention periods:

```bash
curl -X PATCH \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/clusters/{clusterName}/backup/schedule" \
  --digest -u "{publicKey}:{privateKey}" \
  -H "Content-Type: application/json" \
  -d '{
    "referenceHourOfDay": 2,
    "referenceMinuteOfHour": 0,
    "policies": [
      {
        "policyItems": [
          {
            "frequencyType": "hourly",
            "frequencyInterval": 6,
            "retentionValue": 2,
            "retentionUnit": "days"
          },
          {
            "frequencyType": "daily",
            "frequencyInterval": 1,
            "retentionValue": 7,
            "retentionUnit": "days"
          },
          {
            "frequencyType": "weekly",
            "frequencyInterval": 6,
            "retentionValue": 4,
            "retentionUnit": "weeks"
          },
          {
            "frequencyType": "monthly",
            "frequencyInterval": 40,
            "retentionValue": 12,
            "retentionUnit": "months"
          }
        ]
      }
    ]
  }'
```

## Oplog Retention for PIT Restore

For point-in-time restore, Atlas stores the oplog. Configure oplog window size:

```bash
curl -X PATCH \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/clusters/{clusterName}" \
  --digest -u "{publicKey}:{privateKey}" \
  -H "Content-Type: application/json" \
  -d '{ "pitEnabled": true }'
```

The oplog window size depends on your cluster's write volume and the configured oplog size, not the cluster tier. All dedicated clusters (M10+) support PIT restore when Continuous Cloud Backup is enabled. You can adjust the restore window and oplog minimum retention hours to meet your recovery requirements.

## Listing Available Snapshots

```bash
curl -X GET \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/clusters/{clusterName}/backup/snapshots" \
  --digest -u "{publicKey}:{privateKey}"
```

## Backup Storage Costs

Backup storage is billed separately from cluster storage. Continuous backup with oplog retention uses more storage than periodic snapshots alone. Review the Atlas pricing page for current rates.

## Monitoring Backup Status

In the Atlas UI, the Backup tab shows:
- Last successful snapshot time
- Next scheduled snapshot
- Oplog window size
- Snapshot list with status

## Summary

MongoDB Atlas Continuous Cloud Backup combines periodic snapshots with oplog retention to enable point-in-time restore. Enable it via the Atlas UI or API, configure your snapshot retention policy based on RTO and RPO requirements, and verify the oplog window covers your acceptable recovery time window.
