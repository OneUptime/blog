# How to Configure Backup Compliance Policies in MongoDB Atlas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Backup, Compliance, Security

Description: Learn how to configure backup compliance policies in MongoDB Atlas to enforce immutable backup retention for regulatory requirements like HIPAA and SOC 2.

---

## What Is a Backup Compliance Policy

A Backup Compliance Policy in MongoDB Atlas enforces minimum backup retention requirements that cannot be weakened or deleted, even by project owners. Once enabled, the policy protects backups from accidental or malicious deletion, which is required by compliance frameworks like HIPAA, SOC 2, and PCI DSS.

## Key Concepts

- **Immutable snapshots** - once enabled, backups meeting retention minimums cannot be deleted until they age out
- **Locked policy** - the compliance policy itself requires email verification to modify
- **Minimum retention** - you set a floor that all cluster backup policies must meet or exceed

## Step 1: Enable the Backup Compliance Policy via API

Enable the policy with an authorized user email:

```bash
curl -u "PUBLIC_KEY:PRIVATE_KEY" \
  --digest \
  -X PUT \
  "https://cloud.mongodb.com/api/atlas/v2/groups/{groupId}/backupCompliancePolicy" \
  -H "Content-Type: application/json" \
  -H "Accept: application/vnd.atlas.2023-10-01+json" \
  -d '{
    "authorizedEmail": "security-admin@example.com",
    "authorizedUserFirstName": "Security",
    "authorizedUserLastName": "Admin",
    "copyProtectionEnabled": true,
    "encryptionAtRestEnabled": true,
    "onDemandPolicyItem": {
      "frequencyType": "ondemand",
      "retentionUnit": "days",
      "retentionValue": 14
    },
    "pitEnabled": true,
    "restoreWindowDays": 7,
    "scheduledPolicyItems": [
      {
        "frequencyType": "daily",
        "frequencyInterval": 1,
        "retentionUnit": "days",
        "retentionValue": 14
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
  }'
```

## Step 2: Verify the Policy Was Applied

Check current compliance policy state:

```bash
curl -u "PUBLIC_KEY:PRIVATE_KEY" \
  --digest \
  "https://cloud.mongodb.com/api/atlas/v2/groups/{groupId}/backupCompliancePolicy" \
  | python3 -m json.tool
```

Check the `state` field in the response - it should show `ACTIVE`.

## Step 3: Enable Copy Protection

Copy protection prevents authorized users from deleting snapshots that are within the retention window:

```json
{
  "copyProtectionEnabled": true
}
```

With copy protection enabled, attempts to delete a protected snapshot return an error:

```text
Error: Cannot delete snapshot because the Backup Compliance Policy prevents deletion
of snapshots that are within the compliance retention window.
```

## Step 4: Enable Encryption at Rest Enforcement

The compliance policy can require all clusters to use encryption at rest:

```json
{
  "encryptionAtRestEnabled": true
}
```

After enabling this, any cluster in the project without encryption at rest enabled will fail backup compliance checks.

## Step 5: Configure Per-Cluster Backup Policies

Individual cluster policies must meet or exceed the compliance minimums:

```bash
# Update cluster backup schedule to meet compliance requirements
curl -u "PUBLIC_KEY:PRIVATE_KEY" \
  --digest \
  -X PATCH \
  "https://cloud.mongodb.com/api/atlas/v2/groups/{groupId}/clusters/{clusterName}/backup/schedule" \
  -H "Content-Type: application/json" \
  -d '{
    "policies": [{
      "policyItems": [
        {
          "frequencyType": "daily",
          "frequencyInterval": 1,
          "retentionUnit": "days",
          "retentionValue": 14
        },
        {
          "frequencyType": "monthly",
          "frequencyInterval": 40,
          "retentionUnit": "months",
          "retentionValue": 12
        }
      ]
    }]
  }'
```

## Step 6: Verify Compliance Across All Clusters

Use the Atlas Admin API to check that all clusters comply:

```bash
#!/bin/bash
# Check all clusters in the project for backup compliance

curl -u "PUBLIC_KEY:PRIVATE_KEY" --digest \
  "https://cloud.mongodb.com/api/atlas/v2/groups/{groupId}/clusters" \
  | python3 -c "
import json, sys
data = json.load(sys.stdin)
for cluster in data.get('results', []):
    backup = cluster.get('backupEnabled', False)
    name = cluster.get('name', 'unknown')
    print(f'{name}: backup_enabled={backup}')
"
```

## Modifying the Compliance Policy

Weakening the policy requires email verification from the authorized user. Atlas sends a verification email before applying any changes that reduce retention requirements. This prevents accidental or unauthorized weakening of compliance protections.

## Summary

Backup compliance policies in MongoDB Atlas enforce immutable backup retention by setting minimum retention floors, enabling copy protection, and optionally requiring encryption at rest. Once configured, these policies cannot be weakened without email verification from a designated security contact. This satisfies backup immutability requirements for HIPAA, SOC 2, PCI DSS, and similar frameworks.
