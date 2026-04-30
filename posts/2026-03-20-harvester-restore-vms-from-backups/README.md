# How to Restore VMs from Backups in Harvester

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Harvester, Kubernetes, Virtualization, HCI, Backup, Restore, Disaster Recovery

Description: Learn how to restore virtual machines from backups in Harvester, including restoring to the same cluster, a new VM, or a different Harvester cluster.

## Introduction

Restoring VMs from backups is a critical disaster recovery capability. Harvester supports restoring VMs from backups stored in S3-compatible object storage or NFS. You can restore a VM in-place (overwriting the existing VM), to a new VM on the same cluster, or import a backup into a completely different Harvester cluster - enabling cross-cluster migration and disaster recovery.

## Restore Scenarios

| Scenario | Description | Requirement |
|---|---|---|
| In-place restore | Overwrite existing VM with backup state | VM must be stopped |
| New VM restore | Create a new VM from a backup | Any state |
| Cross-cluster restore | Import backup into a different cluster | Same backup target configured; VM images must be available on the target cluster |

## Prerequisites

- Harvester cluster with the backup target configured
- An existing `VirtualMachineBackup` with `status.readyToUse: true` (shown as `Ready` in the UI)
- For cross-cluster restore: the same backup target configured on the target cluster
- For cross-cluster restore: on Harvester v1.4.0 and later, VM images are synced automatically unless the target cluster already has an image with the same name or display name; on earlier versions, upload identical VM images manually first

## Step 1: List Available Backups

### Via the UI

Navigate to **VM Backups** (under the **Backup & Snapshot** section) to see all backups with their status and sizes.

### Via kubectl

```bash
# List all VM backups

kubectl get virtualmachinebackup -n default

# Get details about a specific backup
kubectl describe virtualmachinebackup ubuntu-web-01-backup-20240315 -n default

# Check the backup is ready for restore
kubectl get virtualmachinebackup ubuntu-web-01-backup-20240315 -n default \
    -o jsonpath='{.status.readyToUse}'
# Expected: true
```

## Step 2: Restore to the Same VM (In-Place Restore)

This replaces the VM's current disks with the backup data:

### Via the UI

1. Navigate to **VM Backups**
2. Select the backup you want to restore
3. Click **Restore Backup**
4. Click **Replace Existing**
5. Select the existing VM you want to replace
6. Confirm the restore operation

### Via kubectl

```yaml
# vm-restore-inplace.yaml
# Restore a VM to its backup state

apiVersion: harvesterhci.io/v1beta1
kind: VirtualMachineRestore
metadata:
  name: ubuntu-web-01-restore-20240315
  namespace: default
spec:
  # Source backup to restore from
  virtualMachineBackupName: ubuntu-web-01-backup-20240315
  virtualMachineBackupNamespace: default
  # Target VM to restore (must be stopped)
  target:
    apiGroup: kubevirt.io
    kind: VirtualMachine
    name: ubuntu-web-01
  # Do not keep the original volumes (delete replaced volumes)
  deletionPolicy: delete
```

```bash
# First, stop the VM
virtctl stop ubuntu-web-01 -n default

# Wait for VM to stop
echo "Waiting for VM to stop..."
kubectl wait vmi/ubuntu-web-01 -n default \
    --for=delete --timeout=120s

echo "VM stopped. Initiating restore..."

# Apply the restore
kubectl apply -f vm-restore-inplace.yaml

# Watch the restore progress
kubectl get virtualmachinerestore ubuntu-web-01-restore-20240315 -n default -w

# Check restore status
kubectl describe virtualmachinerestore ubuntu-web-01-restore-20240315 -n default
```

## Step 3: Restore to a New VM

Create a new VM from a backup without affecting the original:

```yaml
# vm-restore-new.yaml
# Create a new VM from an existing backup

apiVersion: harvesterhci.io/v1beta1
kind: VirtualMachineRestore
metadata:
  name: ubuntu-web-01-dr-restore
  namespace: default
spec:
  virtualMachineBackupName: ubuntu-web-01-backup-20240315
  virtualMachineBackupNamespace: default
  # Create a new VM instead of replacing an existing one
  newVM: true
  target:
    apiGroup: kubevirt.io
    kind: VirtualMachine
    # NEW name - VM will be created fresh
    name: ubuntu-web-01-restored
```

```bash
kubectl apply -f vm-restore-new.yaml

# Monitor the restore
kubectl get virtualmachinerestore ubuntu-web-01-dr-restore -n default -w

# Wait for the restore to complete
kubectl wait virtualmachinerestore/ubuntu-web-01-dr-restore -n default \
    --for=condition=Ready=True --timeout=600s

# Verify the new VM started
kubectl get vmi ubuntu-web-01-restored -n default
```

## Step 4: Cross-Cluster Restore

To restore a VM on a different Harvester cluster:

### On the Target Cluster

Configure the same backup target as the source cluster:

On Harvester v1.4.0 and later, VM images are synced automatically unless the target cluster already contains an image with the same name or display name. On earlier versions, upload identical VM images to the target cluster before restoring.

```yaml
# backup-target-config.yaml
# Configure the same S3 bucket on the target cluster

apiVersion: harvesterhci.io/v1beta1
kind: Setting
metadata:
  name: backup-target
value: |
  {
    "type": "s3",
    "endpoint": "https://s3.amazonaws.com",
    "accessKeyId": "YOUR_ACCESS_KEY_ID",
    "secretAccessKey": "YOUR_SECRET_ACCESS_KEY",
    "bucketName": "harvester-vm-backups",
    "bucketRegion": "us-east-1",
    "cert": "",
    "virtualHostedStyle": false
  }
```

```bash
# On the target cluster, apply the backup target configuration
kubectl apply -f backup-target-config.yaml

# Wait for the backup controller to scan and discover backups from the source cluster
# This may take a few minutes
kubectl get virtualmachinebackup -n default

# Once the backups appear, create the restore
kubectl apply -f - <<EOF
apiVersion: harvesterhci.io/v1beta1
kind: VirtualMachineRestore
metadata:
  name: cross-cluster-restore
  namespace: default
spec:
  virtualMachineBackupName: ubuntu-web-01-backup-20240315
  virtualMachineBackupNamespace: default
  newVM: true
  target:
    apiGroup: kubevirt.io
    kind: VirtualMachine
    name: ubuntu-web-01-imported
EOF
```

## Step 5: Validate the Restored VM

After restore, always verify the VM is functioning correctly:

```bash
# Wait for the restore to complete
kubectl wait virtualmachinerestore/ubuntu-web-01-dr-restore -n default \
    --for=condition=Ready=True \
    --timeout=600s

# Wait for the VMI to be created
kubectl wait --for=create vmi/ubuntu-web-01-restored -n default \
    --timeout=300s

# Wait for the VMI to be running
kubectl wait vmi/ubuntu-web-01-restored -n default \
    --for=condition=Ready=True \
    --timeout=300s

# Access the VM console to verify
virtctl console ubuntu-web-01-restored -n default

# Inside the VM, check:
# 1. Hostname and network configuration
hostname
ip addr show

# 2. Application services are running
systemctl status nginx
systemctl status postgresql

# 3. Data integrity
ls /var/www/html/
ls /var/lib/postgresql/data/
```

## Automate Disaster Recovery Testing

Regularly test restores with an automated DR test:

```bash
#!/bin/bash
# dr-test.sh - Automated restore test

BACKUP_NAME="ubuntu-web-01-backup-latest"
TEST_VM_NAME="ubuntu-web-01-dr-test"
NAMESPACE="default"

echo "=== DR Test Started at $(date) ==="

# Create test restore
kubectl apply -f - <<EOF
apiVersion: harvesterhci.io/v1beta1
kind: VirtualMachineRestore
metadata:
  name: dr-test-restore
  namespace: ${NAMESPACE}
spec:
  virtualMachineBackupName: ${BACKUP_NAME}
  virtualMachineBackupNamespace: ${NAMESPACE}
  newVM: true
  target:
    apiGroup: kubevirt.io
    kind: VirtualMachine
    name: ${TEST_VM_NAME}
EOF

# Wait for restore
kubectl wait virtualmachinerestore/dr-test-restore \
    -n ${NAMESPACE} \
    --for=condition=Ready=True \
    --timeout=600s

# Wait for VM
kubectl wait vmi/${TEST_VM_NAME} -n ${NAMESPACE} \
    --for=condition=Ready=True \
    --timeout=300s

echo "=== DR Test VM is running. Validating... ==="

# Run validation
VM_IP=$(kubectl get vmi ${TEST_VM_NAME} -n ${NAMESPACE} \
    -o jsonpath='{.status.interfaces[0].ipAddress}')

if curl -sf "http://${VM_IP}/healthz" > /dev/null; then
    echo "=== PASS: Application health check succeeded ==="
else
    echo "=== FAIL: Application health check failed ==="
fi

# Cleanup test VM
echo "Cleaning up test VM..."
virtctl stop ${TEST_VM_NAME} -n ${NAMESPACE}
kubectl wait vmi/${TEST_VM_NAME} -n ${NAMESPACE} \
    --for=delete \
    --timeout=120s
kubectl delete vm ${TEST_VM_NAME} -n ${NAMESPACE}
kubectl delete virtualmachinerestore dr-test-restore -n ${NAMESPACE}

echo "=== DR Test Complete ==="
```

## Conclusion

Restoring VMs from backups in Harvester is a straightforward process that supports multiple recovery scenarios from simple in-place restores to full cross-cluster disaster recovery. The Kubernetes-native API makes it easy to automate restore testing, which is a critical practice often overlooked in disaster recovery planning. Test your restore procedures regularly - ideally monthly - to ensure your backup strategy actually works when you need it most.
