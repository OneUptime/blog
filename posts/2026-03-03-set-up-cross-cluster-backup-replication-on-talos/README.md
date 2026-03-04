# How to Set Up Cross-Cluster Backup Replication on Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Backups, Replication, Disaster Recovery, Kubernetes

Description: Set up cross-cluster backup replication on Talos Linux to protect your workloads against complete cluster failures and regional outages.

---

Running a single Kubernetes cluster is fine until it is not. Hardware failures, network outages, and human error can take down an entire cluster. If your backups live on the same infrastructure as your workloads, you are not really protected. Cross-cluster backup replication ensures that your data and configuration are copied to a separate location, giving you a real disaster recovery capability.

This guide walks through setting up backup replication between two Talos Linux clusters using Velero and object storage.

## Architecture Overview

The setup involves two Talos Linux clusters and a shared (or replicated) object storage backend. The primary cluster runs your workloads and takes regular backups. Those backups are stored in object storage, and the secondary cluster has read access to the same storage location. If the primary fails, you can restore everything on the secondary.

For even stronger protection, you can replicate the object storage bucket itself across regions. This way, even if the storage in one region goes down, your backups survive.

## Prerequisites

Before starting, you need both clusters running and accessible:

```bash
# Verify both clusters are healthy
talosctl --talosconfig talos-primary.yaml health
talosctl --talosconfig talos-secondary.yaml health

# Check Kubernetes API on both
kubectl --context primary get nodes
kubectl --context secondary get nodes
```

You also need an S3-compatible object storage bucket. This can be AWS S3, MinIO, or any compatible service.

## Setting Up Velero on the Primary Cluster

Install Velero on your primary Talos cluster with the appropriate storage plugin:

```bash
# Create credentials file for S3
cat > credentials-velero <<EOF
[default]
aws_access_key_id=YOUR_ACCESS_KEY
aws_secret_access_key=YOUR_SECRET_KEY
EOF

# Install Velero on the primary cluster
kubectl config use-context primary

velero install \
    --provider aws \
    --plugins velero/velero-plugin-for-aws:v1.8.0 \
    --bucket talos-backups-primary \
    --secret-file ./credentials-velero \
    --backup-storage-location-config \
        region=us-east-1,s3ForcePathStyle=true \
    --use-node-agent \
    --default-volumes-to-fs-backup
```

Verify the installation:

```bash
# Check that Velero is running
kubectl get pods -n velero

# Verify the backup storage location is available
velero backup-storage-location get
```

## Configuring Backup Schedules on Primary

Set up automated backup schedules that capture your critical namespaces:

```bash
# Back up all application namespaces every 6 hours
velero schedule create apps-backup \
    --schedule="0 */6 * * *" \
    --include-namespaces production,staging \
    --snapshot-move-data \
    --ttl 168h

# Back up cluster-wide resources daily
velero schedule create cluster-resources \
    --schedule="0 1 * * *" \
    --include-cluster-scoped-resources \
    --ttl 720h

# Back up everything weekly for long-term retention
velero schedule create full-backup \
    --schedule="0 3 * * 0" \
    --ttl 2160h
```

## Setting Up Storage Replication

The next piece is making sure backups from the primary are accessible to the secondary cluster. There are two main approaches.

### Option A: Shared Bucket

The simplest option is to have both clusters point to the same S3 bucket. The primary writes backups, and the secondary reads them.

```bash
# Both clusters use the same bucket
# Primary: read-write access
# Secondary: read-only access is sufficient for restore
```

### Option B: S3 Cross-Region Replication

For stronger protection, use S3's built-in replication to copy backups to a different region:

```json
{
    "Role": "arn:aws:iam::role/s3-replication-role",
    "Rules": [
        {
            "Status": "Enabled",
            "Priority": 1,
            "Filter": {
                "Prefix": "backups/"
            },
            "Destination": {
                "Bucket": "arn:aws:s3:::talos-backups-secondary",
                "StorageClass": "STANDARD_IA"
            },
            "DeleteMarkerReplication": {
                "Status": "Disabled"
            }
        }
    ]
}
```

### Option C: MinIO Bucket Replication

If you are running MinIO as your object storage, configure bucket replication between sites:

```bash
# Add both MinIO aliases
mc alias set primary https://minio-primary.example.com ACCESS_KEY SECRET_KEY
mc alias set secondary https://minio-secondary.example.com ACCESS_KEY SECRET_KEY

# Set up replication from primary to secondary
mc replicate add primary/talos-backups \
    --remote-bucket "https://ACCESS_KEY:SECRET_KEY@minio-secondary.example.com/talos-backups" \
    --replicate "delete,delete-marker,existing-objects"

# Verify replication status
mc replicate status primary/talos-backups
```

## Installing Velero on the Secondary Cluster

Now install Velero on the secondary cluster, pointing it at the same (or replicated) storage:

```bash
kubectl config use-context secondary

velero install \
    --provider aws \
    --plugins velero/velero-plugin-for-aws:v1.8.0 \
    --bucket talos-backups-primary \
    --secret-file ./credentials-velero \
    --backup-storage-location-config \
        region=us-east-1,s3ForcePathStyle=true \
    --use-node-agent
```

If using replicated storage with a different bucket:

```bash
velero install \
    --provider aws \
    --plugins velero/velero-plugin-for-aws:v1.8.0 \
    --bucket talos-backups-secondary \
    --secret-file ./credentials-velero-secondary \
    --backup-storage-location-config \
        region=us-west-2,s3ForcePathStyle=true \
    --use-node-agent
```

Verify that the secondary can see the primary's backups:

```bash
# On the secondary cluster, list available backups
velero backup get

# You should see backups created by the primary cluster
```

## Testing the Restore Process

Do not wait for a real disaster to test your restore. Run a test restore on the secondary cluster regularly:

```bash
# Restore a specific backup to the secondary
velero restore create test-restore \
    --from-backup apps-backup-20260303060000 \
    --namespace-mappings production:production-test \
    --wait

# Check the restored resources
kubectl get all -n production-test

# Verify data integrity
kubectl exec -n production-test deploy/my-app -- /app/health-check.sh

# Clean up the test restore
kubectl delete namespace production-test
```

## Monitoring Replication Health

Set up monitoring to make sure backups and replication are working:

```yaml
# prometheus-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: velero-backup-alerts
  namespace: monitoring
spec:
  groups:
  - name: velero
    rules:
    - alert: VeleroBackupFailed
      expr: |
        increase(velero_backup_failure_total[24h]) > 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Velero backup has failed"
    - alert: VeleroBackupNotRun
      expr: |
        time() - velero_backup_last_successful_timestamp > 43200
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "No successful backup in the last 12 hours"
```

You should also monitor the storage replication lag:

```bash
#!/bin/bash
# check-replication-lag.sh
# Compares backup lists between primary and secondary

PRIMARY_BACKUPS=$(velero --kubeconfig primary.kubeconfig backup get -o json | jq -r '.items | length')
SECONDARY_BACKUPS=$(velero --kubeconfig secondary.kubeconfig backup get -o json | jq -r '.items | length')

DIFF=$((PRIMARY_BACKUPS - SECONDARY_BACKUPS))

if [ "$DIFF" -gt 2 ]; then
    echo "WARNING: Replication lag detected. Primary has $DIFF more backups than secondary."
    # Send alert to your monitoring system
fi
```

## Automated Failover Script

For faster recovery during an actual disaster, prepare a failover script:

```bash
#!/bin/bash
# failover.sh
# Restores the most recent backup on the secondary cluster

CONTEXT="secondary"
kubectl config use-context "$CONTEXT"

# Get the latest successful backup
LATEST_BACKUP=$(velero backup get -o json | \
    jq -r '[.items[] | select(.status.phase=="Completed")] | sort_by(.status.completionTimestamp) | last | .metadata.name')

echo "Restoring from backup: $LATEST_BACKUP"

# Perform the restore
velero restore create disaster-recovery \
    --from-backup "$LATEST_BACKUP" \
    --wait

# Check restore status
velero restore describe disaster-recovery

# Verify critical workloads
kubectl get deployments --all-namespaces | grep -v Running
```

## Wrapping Up

Cross-cluster backup replication gives you genuine protection against the worst-case scenarios. The combination of Velero for backup management and object storage replication for data durability creates a solid foundation. The most important thing you can do after setting this up is test it regularly. Schedule quarterly disaster recovery drills where you actually restore to the secondary cluster and verify everything works. The time you invest in testing will pay off enormously when you actually need it.
