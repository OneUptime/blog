# How to Set Up Disaster Recovery for Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Disaster Recovery, Backup, Restore

Description: Learn how to design and implement a comprehensive disaster recovery plan for your Rancher management server and managed clusters.

A well-designed disaster recovery (DR) plan for Rancher ensures you can recover from catastrophic failures with minimal downtime and data loss. This guide covers building a complete DR strategy including backup automation, recovery procedures, and regular testing.

## Prerequisites

- Rancher v2.5 or later in production
- The Rancher Backup Operator installed
- External storage (S3 or equivalent) in a different region or data center
- A secondary environment for DR testing
- kubectl and Helm 3 access

## Step 1: Define Recovery Objectives

Before configuring DR, establish your objectives:

- **Recovery Point Objective (RPO)**: Maximum acceptable data loss measured in time. For example, an RPO of 1 hour means you need backups at least every hour.
- **Recovery Time Objective (RTO)**: Maximum acceptable downtime. For example, an RTO of 30 minutes means you must be able to restore within half an hour.

These objectives drive your backup frequency and recovery procedures.

## Step 2: Configure Multi-Tier Backup Schedule

Create a layered backup strategy that balances storage costs with recovery granularity. Save the following as `dr-backups.yaml`:

```yaml
apiVersion: resources.cattle.io/v1
kind: Backup
metadata:
  name: dr-hourly-backup
spec:
  resourceSetName: rancher-resource-set-full
  retentionCount: 24
  schedule: "0 * * * *"
  encryptionConfigSecretName: backup-encryption
  storageLocation:
    s3:
      bucketName: rancher-dr-backups
      folder: hourly
      endpoint: s3.us-west-2.amazonaws.com
      region: us-west-2
      credentialSecretName: dr-s3-creds
      credentialSecretNamespace: cattle-resources-system
---
apiVersion: resources.cattle.io/v1
kind: Backup
metadata:
  name: dr-daily-backup
spec:
  resourceSetName: rancher-resource-set-full
  retentionCount: 30
  schedule: "0 1 * * *"
  encryptionConfigSecretName: backup-encryption
  storageLocation:
    s3:
      bucketName: rancher-dr-backups
      folder: daily
      endpoint: s3.us-west-2.amazonaws.com
      region: us-west-2
      credentialSecretName: dr-s3-creds
      credentialSecretNamespace: cattle-resources-system
---
apiVersion: resources.cattle.io/v1
kind: Backup
metadata:
  name: dr-weekly-backup
spec:
  resourceSetName: rancher-resource-set-full
  retentionCount: 12
  schedule: "0 2 * * 0"
  encryptionConfigSecretName: backup-encryption
  storageLocation:
    s3:
      bucketName: rancher-dr-backups
      folder: weekly
      endpoint: s3.us-west-2.amazonaws.com
      region: us-west-2
      credentialSecretName: dr-s3-creds
      credentialSecretNamespace: cattle-resources-system
```

Apply all backup schedules:

```bash
kubectl apply -f dr-backups.yaml
```

## Step 3: Set Up Cross-Region Backup Replication

Enable versioning on both the source and destination buckets, then configure S3 cross-region replication to ensure backups survive a regional outage:

```bash
aws s3api put-bucket-replication \
  --bucket rancher-dr-backups \
  --replication-configuration '{
    "Role": "arn:aws:iam::ACCOUNT_ID:role/s3-replication-role",
    "Rules": [
      {
        "Status": "Enabled",
        "Priority": 1,
        "Filter": {"Prefix": ""},
        "Destination": {
          "Bucket": "arn:aws:s3:::rancher-dr-backups-replica",
          "StorageClass": "STANDARD_IA"
        },
        "DeleteMarkerReplication": {"Status": "Enabled"}
      }
    ]
  }'
```

## Step 4: Document the Recovery Procedure

Create a runbook that your team can follow during a disaster. The key steps are:

1. Provision a new Kubernetes cluster in the DR region.
2. Install a Rancher Backup Operator chart version compatible with your Rancher version.
3. Create storage credentials and recreate the encryption config secret if the backup was encrypted.
4. Restore from the latest backup with `prune: false`.
5. Install cert-manager.
6. Install Rancher with the same Rancher version and hostname as the original server.
7. Update DNS or your load balancer to point that hostname at the DR cluster.
8. Scale down the original Rancher instance if it is still reachable.
9. Verify downstream clusters reconnect.

Save this as a script for rapid execution. Here is an example `dr-recover.sh`:

```bash
#!/bin/bash
set -euo pipefail

BACKUP_FILE=$1
CHART_VERSION=$2
RANCHER_VERSION=$3
HOSTNAME=$4
CERT_MANAGER_VERSION=$5

S3_BUCKET=${S3_BUCKET:-rancher-dr-backups}
S3_REGION=${S3_REGION:-us-west-2}
S3_ENDPOINT=${S3_ENDPOINT:-s3.${S3_REGION}.amazonaws.com}
S3_FOLDER=${S3_FOLDER:-}
S3_SECRET_NAME=${S3_SECRET_NAME:-dr-s3-creds}
S3_SECRET_NAMESPACE=${S3_SECRET_NAMESPACE:-cattle-resources-system}
ENCRYPTION_SECRET_NAME=${ENCRYPTION_SECRET_NAME:-}

echo "Starting Rancher DR recovery..."

# Install a rancher-backup chart version compatible with your Rancher version.
helm repo add rancher-charts https://charts.rancher.io
helm repo add rancher-latest https://releases.rancher.com/server-charts/latest
helm repo add rancher-stable https://releases.rancher.com/server-charts/stable
helm repo update
helm install --wait rancher-backup-crd rancher-charts/rancher-backup-crd \
  -n cattle-resources-system --create-namespace \
  --version="${CHART_VERSION}"
helm install --wait rancher-backup rancher-charts/rancher-backup \
  -n cattle-resources-system \
  --version="${CHART_VERSION}"

# Assumes the S3 credential secret already exists in ${S3_SECRET_NAMESPACE}.
# Set S3_FOLDER if BACKUP_FILE is stored under a folder such as hourly, daily, or weekly.
cat >/tmp/restore-migration.yaml <<EOF
apiVersion: resources.cattle.io/v1
kind: Restore
metadata:
  name: restore-migration
spec:
  backupFilename: ${BACKUP_FILE}
  prune: false
  storageLocation:
    s3:
      bucketName: ${S3_BUCKET}
      folder: ${S3_FOLDER}
      endpoint: ${S3_ENDPOINT}
      region: ${S3_REGION}
      credentialSecretName: ${S3_SECRET_NAME}
      credentialSecretNamespace: ${S3_SECRET_NAMESPACE}
EOF

if [ -n "${ENCRYPTION_SECRET_NAME}" ]; then
  printf '  encryptionConfigSecretName: %s\n' "${ENCRYPTION_SECRET_NAME}" >> /tmp/restore-migration.yaml
fi

kubectl apply -f /tmp/restore-migration.yaml
kubectl wait --for=condition=Ready restore/restore-migration --timeout=30m

# Install a cert-manager version supported by your Rancher release.
kubectl apply -f "https://github.com/cert-manager/cert-manager/releases/download/${CERT_MANAGER_VERSION}/cert-manager.yaml"
kubectl wait --for=condition=Available -n cert-manager deployment --all --timeout=180s

RANCHER_CHART_REPO=${RANCHER_CHART_REPO:-rancher-stable}

helm install rancher "${RANCHER_CHART_REPO}/rancher" \
  -n cattle-system --create-namespace \
  --set hostname="${HOSTNAME}" \
  --version="${RANCHER_VERSION}" \
  --wait

echo "Update DNS or your load balancer so ${HOSTNAME} resolves to the DR cluster."
```

## Step 5: Set Up Monitoring and Alerts

Enable the backup operator metrics (`monitoring.metrics.enabled=true` and `monitoring.serviceMonitor.enabled=true`) when you install or upgrade the chart, then alert on those metrics:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: dr-backup-alerts
  namespace: cattle-resources-system
spec:
  groups:
  - name: disaster-recovery
    rules:
    - alert: BackupMissed
      expr: |
        time() - max(rancher_backup_last_processed_timestamp_seconds) > 7200
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "No Rancher backup has been processed in the last 2 hours"
    - alert: BackupFailed
      expr: |
        sum by (name) (
          increase(rancher_backups_failed_total[5m])
        ) > 0
      for: 1m
      labels:
        severity: critical
      annotations:
        summary: "Rancher backup {{ $labels.name }} has failed"
```

## Step 6: Test Recovery Regularly

Schedule regular DR tests, ideally quarterly. A DR test involves:

1. Provisioning a test cluster.
2. Running the recovery procedure against the latest backup.
3. Verifying all Rancher resources are restored correctly.
4. Measuring actual RTO and comparing it to your target.
5. Documenting any issues found and updating the runbook.
6. Tearing down the test cluster.

## Step 7: Protect Downstream Clusters

Rancher backups protect the management plane, but downstream cluster workloads need their own backup strategy:

- Enable etcd snapshots on self-managed downstream clusters where you control etcd (covered in the etcd backup guide).
- Use Velero or similar tools for workload-level backups.
- Store downstream backups in the same cross-region storage for consistency.

## Step 8: Secure DR Credentials

Store DR credentials in a separate secure location:

- Use a secrets manager (HashiCorp Vault, AWS Secrets Manager) for encryption keys and storage credentials.
- Ensure the DR team has access to credentials even if the primary infrastructure is unavailable.
- Rotate credentials regularly and update both primary and DR configurations.

## Conclusion

Disaster recovery for Rancher requires a layered approach combining automated backups with documented recovery procedures and regular testing. By establishing clear RPO and RTO targets, configuring multi-tier backup schedules with cross-region replication, and testing your recovery process regularly, you can ensure your Rancher management server can be recovered quickly and reliably from any failure scenario.
