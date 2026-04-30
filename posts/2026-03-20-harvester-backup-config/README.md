# How to Export and Restore Harvester Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Harvester, Backup, Configuration, Disaster Recovery, Kubernetes, SUSE Rancher, HCI

Description: Learn how to back up Harvester cluster configuration including VM settings, network configurations, storage policies, and etcd snapshots for disaster recovery.

---

Backing up Harvester configuration protects your cluster settings, VM definitions, network configurations, and storage policies. A complete backup strategy combines etcd snapshots (cluster state), VM disk backups, and exported configuration manifests.

---

## What to Back Up

| Component | Method | Frequency |
|---|---|---|
| Cluster state (etcd) | RKE2 etcd snapshots | Every 6 hours |
| VM disk data | Longhorn volume backups | Daily |
| VM definitions | kubectl get -o yaml | Before changes |
| Network config | kubectl get -o yaml | Before changes |
| Harvester settings | kubectl get -o yaml | Weekly |

---

## Step 1: Configure etcd Snapshots

Harvester management nodes use RKE2, so etcd snapshots are managed with the same `rke2 etcd-snapshot` tooling. If you change the RKE2 config directly on a Harvester node, make sure the change is persisted using Harvester's post-install configuration workflow so it survives reboot:

```yaml
# /etc/rancher/rke2/config.yaml (example RKE2 server config on a Harvester management node)

etcd-snapshot-schedule-cron: "0 */6 * * *"
etcd-snapshot-retention: 10
etcd-s3: true
etcd-s3-bucket: harvester-etcd-backups
etcd-s3-region: us-west-2
etcd-s3-access-key: YOUR_ACCESS_KEY
etcd-s3-secret-key: YOUR_SECRET_KEY
```

```bash
# Verify snapshots are being created
rke2 etcd-snapshot ls

# Create a manual snapshot before making changes
rke2 etcd-snapshot save --name pre-upgrade-$(date +%Y%m%d)
```

---

## Step 2: Configure Backup Target for VM Backups

```bash
# Set the Harvester backup target used by VM backups
# Via Harvester UI: Settings → backup-target

# Or via kubectl (Harvester setting)
kubectl patch settings.harvesterhci.io \
  backup-target \
  --type merge \
  -p '{"value":"{\"type\":\"s3\",\"endpoint\":\"https://s3.amazonaws.com\",\"accessKeyId\":\"YOUR_ACCESS_KEY\",\"secretAccessKey\":\"YOUR_SECRET_KEY\",\"bucketName\":\"harvester-vm-backups\",\"bucketRegion\":\"us-west-2\",\"cert\":\"\",\"virtualHostedStyle\":false}"}'
```

---

## Step 3: Create VM Backup Policies

In Harvester, VM backups are taken at the Harvester level (not just the disk):

```bash
# Take a VM backup via Harvester UI:
# Virtual Machines → select VM → Take Backup

# Or via kubectl (Harvester-specific CRD)
kubectl apply -f - <<EOF
apiVersion: harvesterhci.io/v1beta1
kind: VirtualMachineBackup
metadata:
  name: my-vm-backup-$(date +%Y%m%d)
  namespace: default
spec:
  source:
    apiGroup: kubevirt.io
    kind: VirtualMachine
    name: my-vm
EOF
```

---

## Step 4: Export VM Configuration Manifests

When you save live objects with `kubectl get -o yaml`, remove `status` and other cluster-generated metadata before reapplying them to another cluster.

```bash
# Export all VM definitions
kubectl get virtualmachine.kubevirt.io -A -o yaml > vm-definitions-$(date +%Y%m%d).yaml

# Export network configurations
kubectl get network-attachment-definitions.k8s.cni.cncf.io -A -o yaml > networks-$(date +%Y%m%d).yaml

# Export storage configurations
kubectl get storageclasses.storage.k8s.io -o yaml > storageclasses-$(date +%Y%m%d).yaml
kubectl get persistentvolumeclaims -A -o yaml > pvcs-$(date +%Y%m%d).yaml

# Export Harvester-specific settings
kubectl get settings.harvesterhci.io -o yaml > harvester-settings-$(date +%Y%m%d).yaml

# Export VM images
kubectl get virtualmachineimages.harvesterhci.io -A -o yaml > vm-images-$(date +%Y%m%d).yaml
```

---

## Step 5: Automate Configuration Backups

```bash
#!/bin/bash
# backup-harvester-config.sh
# Run this on an admin workstation or automation host with kubectl access to Harvester

BACKUP_DIR="/backup/harvester/$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

# Export all Harvester resources
namespaced_resources=(
  "virtualmachine.kubevirt.io"
  "virtualmachineimages.harvesterhci.io"
  "network-attachment-definitions.k8s.cni.cncf.io"
  "persistentvolumeclaims"
)

cluster_resources=(
  "storageclasses.storage.k8s.io"
  "settings.harvesterhci.io"
  "clusternetworks.network.harvesterhci.io"
  "vlanconfigs.network.harvesterhci.io"
)

for resource in "${namespaced_resources[@]}"; do
  kubectl get "$resource" -A -o yaml > "$BACKUP_DIR/${resource//./-}.yaml" 2>/dev/null
  echo "Backed up: $resource"
done

for resource in "${cluster_resources[@]}"; do
  kubectl get "$resource" -o yaml > "$BACKUP_DIR/${resource//./-}.yaml" 2>/dev/null
  echo "Backed up: $resource"
done

# Compress the backup
tar -czf "/backup/harvester-config-$(date +%Y%m%d).tar.gz" -C "$BACKUP_DIR" .
echo "Backup complete: /backup/harvester-config-$(date +%Y%m%d).tar.gz"
```

Schedule this script on the external host that stores the backups:

```bash
# /etc/cron.d/harvester-backup
0 1 * * * root /usr/local/bin/backup-harvester-config.sh
```

---

## Step 6: Test Restore Procedure

Regularly test your backup by restoring to a staging Harvester instance:

Make sure the required VM images exist on the target cluster with the same names before restoring backed-up VMs.

```bash
# Restore sanitized VM definitions to a new Harvester cluster
kubectl apply -f vm-definitions-20260320.yaml

# Restore VM from Longhorn backup
kubectl apply -f - <<EOF
apiVersion: harvesterhci.io/v1beta1
kind: VirtualMachineRestore
metadata:
  name: restore-my-vm
  namespace: default
spec:
  target:
    apiGroup: kubevirt.io
    kind: VirtualMachine
    name: my-vm-restored
  virtualMachineBackupName: my-vm-backup-20260320
  virtualMachineBackupNamespace: default
  newVM: true
EOF
```

---

## Best Practices

- Store all three backup types (etcd, Longhorn volumes, config manifests) in separate S3 buckets or locations - a corrupted backup location should not affect all backups.
- Test your full restore process quarterly - a backup is only valuable if the restore succeeds.
- Back up before every Harvester upgrade - the upgrade process modifies cluster state and a rollback requires a working etcd snapshot.
