# How to Back Up and Restore Harvester Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Harvester, Backup, Configuration, Kubernetes, etcd, Disaster Recovery, SUSE Rancher

Description: Learn how to back up Harvester cluster configuration including etcd snapshots, VM configurations, network settings, and Longhorn storage data for comprehensive disaster recovery coverage.

---

Backing up Harvester requires capturing both the Kubernetes control plane state (etcd) and the Longhorn storage data. This guide covers both layers for complete disaster recovery coverage.

---

## What to Back Up

| Component | Method | Frequency |
|---|---|---|
| etcd (cluster state) | RKE2 etcd snapshot | Daily |
| VM configurations | kubectl get -o yaml + git | On change |
| Longhorn volume data | Longhorn backups to S3 | Hourly/Daily |
| Harvester settings | kubectl get settings.harvesterhci.io -o yaml | Weekly |
| Network configs | kubectl get -o yaml | On change |

---

## Step 1: Back Up etcd (RKE2)

Harvester runs on RKE2. Use RKE2's built-in etcd snapshot feature:

```bash
# On a Harvester control plane node

# Take an on-demand etcd snapshot
rke2 etcd-snapshot save \
  --name harvester-config-$(date +%Y%m%d%H%M%S)

# Configure automatic etcd snapshots to S3
# /etc/rancher/rke2/config.yaml
etcd-snapshot-schedule-cron: "0 2 * * *"   # Daily at 2 AM
etcd-snapshot-retention: 7
etcd-s3: true
etcd-s3-retention: 7
etcd-s3-bucket: my-harvester-backups
etcd-s3-region: us-east-1
etcd-s3-access-key: <key>
etcd-s3-secret-key: <secret>

# List available snapshots
rke2 etcd-snapshot ls
```

---

## Step 2: Export VM Configurations

```bash
# Export all VM definitions
kubectl get vm -A -o yaml > vm-configs-$(date +%Y%m%d).yaml

# Export network attachment definitions
kubectl get nad -A -o yaml > network-configs-$(date +%Y%m%d).yaml

# Export VM images list
kubectl get vmimages -A -o yaml > vm-images-$(date +%Y%m%d).yaml

# Export storage classes
kubectl get storageclass -o yaml > storageclasses-$(date +%Y%m%d).yaml

# Export Harvester settings
kubectl get settings.harvesterhci.io -o yaml > harvester-settings-$(date +%Y%m%d).yaml
```

---

## Step 3: Configure Harvester Backup Target

```bash
# Configure Harvester's backup target setting for VM backups
kubectl patch settings.harvesterhci.io backup-target --type merge -p \
  '{"value":"{\"type\":\"s3\",\"endpoint\":\"\",\"accessKeyId\":\"<key>\",\"secretAccessKey\":\"<secret>\",\"bucketName\":\"harvester-vm-backups\",\"bucketRegion\":\"us-east-1\",\"cert\":\"\",\"virtualHostedStyle\":false}"}'

# Verify the configured backup target
kubectl get settings.harvesterhci.io backup-target -o yaml
```

---

## Step 4: Configure VM Backup Schedule

In Harvester UI, go to **Virtual Machine Schedules** and click **Create Schedule**. Harvester's built-in scheduler is the supported way to automate VM backups and snapshots; Longhorn recurring jobs are not integrated into Harvester.

---

## Step 5: Automate Backup Verification

```bash
#!/bin/bash
# backup-verify.sh - run weekly to verify backup status
set -e

# List recent VM backups
kubectl get vmbackups -A \
  --sort-by=.metadata.creationTimestamp \
  | tail -10

# Check backup status - all should show READY_TO_USE=true
FAILED=$(kubectl get vmbackups -A \
  -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name}{"\t"}{.status.readyToUse}{"\n"}{end}' \
  | awk '$2 != "true" {print $1}')

if [ -n "$FAILED" ]; then
  echo "FAILED OR NOT READY VM BACKUPS:"
  echo "$FAILED"
  exit 1
fi
echo "All VM backups are ready"
```

---

## Best Practices

- Test disaster recovery quarterly by restoring to a test Harvester cluster.
- Store etcd snapshots in a different location from the Harvester cluster (for example, S3 or another off-cluster location).
- Keep VM configuration YAML files in Git so you have a version history of VM changes.
- Document your recovery procedure - the person performing recovery may not be the person who set up the backup.
