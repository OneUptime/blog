# How to Take VM Snapshots in Harvester

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Harvester, Kubernetes, Virtualization, HCI, Snapshot, Backup

Description: Learn how to take, manage, and restore virtual machine snapshots in Harvester for point-in-time recovery and safe change management.

## Introduction

VM snapshots in Harvester capture the state of a VM and its snapshot-capable disks at a specific point in time. Snapshots are useful before applying OS updates, configuration changes, or software upgrades - if something goes wrong, you can quickly revert to the pre-change state. Harvester uses KubeVirt VM snapshots backed by Kubernetes `VolumeSnapshot` objects on Longhorn storage, so snapshots remain space-efficient and stay on the same cluster storage. To snapshot VM disks, the backing `StorageClass` must have a matching `VolumeSnapshotClass`. For running VMs, install the QEMU Guest Agent if you want filesystem-consistent snapshots; otherwise the snapshot is best-effort.

## Snapshot vs. Backup

| Feature | Snapshot | Backup |
|---|---|---|
| Location | Same cluster (Longhorn) | External (S3/NFS) |
| Speed | Fast (seconds) | Slower (minutes) |
| Data protection | Limited (same hardware) | Full (off-cluster) |
| Retention | Short-term | Long-term |
| Use case | Pre-change safety net | Disaster recovery |

## Step 1: Take a Snapshot via the UI

1. Navigate to **Virtual Machines**
2. Find the VM you want to snapshot
3. Click the **⋮** (Actions) menu → **Take VM Snapshot**
4. Provide a snapshot name and optional description
5. Click **Create**

The snapshot appears in the **VM Snapshots** section of the VM details.

## Step 2: Take a Snapshot via kubectl

```yaml
# vm-snapshot.yaml

# Take a snapshot of a VM

apiVersion: snapshot.kubevirt.io/v1beta1
kind: VirtualMachineSnapshot
metadata:
  name: ubuntu-web-01-before-upgrade
  namespace: default
spec:
  # Reference to the VM to snapshot
  source:
    apiGroup: kubevirt.io
    kind: VirtualMachine
    name: ubuntu-web-01
```

```bash
kubectl apply -f vm-snapshot.yaml

# Watch the snapshot creation progress
kubectl get vmsnapshot ubuntu-web-01-before-upgrade -n default -w

# A snapshot is ready when the Ready condition is true
kubectl wait vmsnapshot/ubuntu-web-01-before-upgrade -n default \
    --for=condition=Ready --timeout=300s

kubectl get vmsnapshot ubuntu-web-01-before-upgrade -n default \
    -o jsonpath='{.status.phase}{"\n"}'
```

## Step 3: List Snapshots

```bash
# List all VM snapshots
kubectl get virtualmachinesnapshot -n default

# List snapshots for a specific VM
kubectl get vmsnapshot -n default -o json | jq -r \
    '.items[] | select(.spec.source.name=="ubuntu-web-01") | .metadata.name'

# Get detailed snapshot information
kubectl describe virtualmachinesnapshot ubuntu-web-01-before-upgrade -n default

# Check snapshot status and included volumes
kubectl get virtualmachinesnapshot ubuntu-web-01-before-upgrade -n default \
    -o json | jq '.status'
```

## Step 4: Restore a VM from a Snapshot

### Restore to the Same VM (In-Place Restore)

```yaml
# vm-restore-inplace.yaml
# Restore a VM to a snapshot state

apiVersion: snapshot.kubevirt.io/v1beta1
kind: VirtualMachineRestore
metadata:
  name: ubuntu-web-01-restore
  namespace: default
spec:
  # Target VM to restore
  target:
    apiGroup: kubevirt.io
    kind: VirtualMachine
    name: ubuntu-web-01
  # Source snapshot to restore from
  virtualMachineSnapshotName: ubuntu-web-01-before-upgrade
  # Stop the target VM automatically if it is still running
  targetReadinessPolicy: StopTarget
  # Keep restored volume names aligned with the original VM
  volumeRestorePolicy: InPlace
```

```bash
# Apply the restore
kubectl apply -f vm-restore-inplace.yaml

# Wait for the restore to complete
kubectl wait vmrestore/ubuntu-web-01-restore -n default \
    --for=condition=Ready --timeout=300s

# If the VM is not running after the restore, start it
virtctl start ubuntu-web-01
```

### Restore to a New VM

```yaml
# vm-restore-new.yaml
# Create a new VM from a snapshot

apiVersion: snapshot.kubevirt.io/v1beta1
kind: VirtualMachineRestore
metadata:
  name: ubuntu-web-01-clone
  namespace: default
spec:
  target:
    apiGroup: kubevirt.io
    kind: VirtualMachine
    # Name of the NEW VM to create
    name: ubuntu-web-01-clone
  virtualMachineSnapshotName: ubuntu-web-01-before-upgrade
```

```bash
kubectl apply -f vm-restore-new.yaml

# Wait for the new VM to be created from the snapshot
kubectl wait vmrestore/ubuntu-web-01-clone -n default \
    --for=condition=Ready --timeout=300s

kubectl get vm ubuntu-web-01-clone -n default

# If the restored VM is not running, start it
virtctl start ubuntu-web-01-clone
```

## Step 5: Automate Snapshots with Recurring Jobs

For regular automatic snapshots of the Longhorn volumes backing a VM, use Longhorn recurring jobs. These create Longhorn volume snapshots, not Harvester VM snapshots.

```yaml
# recurring-snapshot-job.yaml
# Take daily snapshots with retention of 7

apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: daily-vm-snapshot
  namespace: longhorn-system
spec:
  # Cron expression: daily at 2:00 AM
  cron: "0 2 * * *"
  task: snapshot
  retain: 7     # Keep 7 snapshots
  concurrency: 2
  labels:
    origin: scheduled
```

```bash
kubectl apply -f recurring-snapshot-job.yaml

# Assign the recurring job to a specific Longhorn volume
kubectl label volume/<LONGHORN_VOLUME_NAME> -n longhorn-system \
    recurring-job.longhorn.io/daily-vm-snapshot=enabled
```

By default, Longhorn recurring jobs run only while the volume is attached. If you also need snapshots while a VM is powered off and its volume is detached, enable the Longhorn setting `allow-recurring-job-while-volume-detached`.

## Step 6: Snapshot Before OS Updates (Best Practice Workflow)

Here's an automated workflow for safe OS updates:

```bash
#!/bin/bash
# safe-update.sh - Take snapshot, update VM, verify, or rollback

VM_NAME="ubuntu-web-01"
NAMESPACE="default"
SNAPSHOT_NAME="${VM_NAME}-pre-update-$(date +%Y%m%d%H%M%S)"

echo "Step 1: Taking pre-update snapshot..."
kubectl apply -f - <<EOF
apiVersion: snapshot.kubevirt.io/v1beta1
kind: VirtualMachineSnapshot
metadata:
  name: ${SNAPSHOT_NAME}
  namespace: ${NAMESPACE}
spec:
  source:
    apiGroup: kubevirt.io
    kind: VirtualMachine
    name: ${VM_NAME}
EOF

# Wait for snapshot to complete
kubectl wait virtualmachinesnapshot/${SNAPSHOT_NAME} \
    -n ${NAMESPACE} \
    --for=condition=Ready=True \
    --timeout=300s

echo "Snapshot ${SNAPSHOT_NAME} is ready"
echo "Now apply your updates to the VM"
echo "If updates succeed: kubectl delete vmsnapshot ${SNAPSHOT_NAME} -n ${NAMESPACE}"
echo "If updates fail: restore from ${SNAPSHOT_NAME}"
```

## Deleting Snapshots

If you use Harvester v1.7.x with Longhorn V2 volumes, avoid deleting the latest VM snapshot because of a known Longhorn issue that can block later operations on the related volumes.

```bash
# Delete a specific snapshot
kubectl delete vmsnapshot ubuntu-web-01-before-upgrade -n default

# Delete snapshots older than a specific cutoff date
CUTOFF="2026-01-01T00:00:00Z"
kubectl get vmsnapshot -n default -o json | jq -r \
    --arg cutoff "$CUTOFF" \
    '.items[] | select(.metadata.creationTimestamp < $cutoff) | .metadata.name' | \
    while read -r name; do
      kubectl delete vmsnapshot "$name" -n default
    done
```

## Conclusion

VM snapshots in Harvester provide a fast and reliable safety net for change management. The ability to take a snapshot before any risky operation - OS upgrades, configuration changes, or application deployments - means you can make changes with confidence, knowing that rollback is just minutes away. For production environments, combine on-cluster snapshots with off-cluster backups to achieve comprehensive data protection: snapshots for short-term recovery and backups for long-term disaster recovery.
