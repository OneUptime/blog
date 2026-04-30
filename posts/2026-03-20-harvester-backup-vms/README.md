# How to Back Up VMs in Harvester

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Harvester, Kubernetes, Virtualization, HCI, Backup, S3, NFS

Description: A complete guide to configuring and executing VM backups in Harvester using S3-compatible object storage or NFS as the backup target.

## Introduction

VM backups in Harvester store complete copies of Longhorn-backed VM disk data to an external target - either an S3-compatible object store or an NFS share. Unlike snapshots (which stay on the cluster), backups provide off-cluster data protection that survives hardware failures, data corruption, or complete cluster loss. This guide covers configuring the backup target and creating both manual and scheduled backups.

## Backup Architecture

```mermaid
graph LR
    VM["VM Disks\n(Longhorn)"] --> BackupController["Harvester\nBackup Controller"]
    BackupController --> S3["S3 Object Store\n(AWS, MinIO, etc.)"]
    BackupController --> NFS["NFS Share"]
```

Backups are incremental by default - only changed blocks are transferred after the initial full backup, making subsequent backups fast and storage-efficient.

## Step 1: Configure the Backup Target

### Using S3

Navigate to **Settings** → **Backup Target** in the Harvester UI:

```text
Type:                S3
Endpoint:            (leave blank for AWS S3; use your MinIO/Ceph endpoint if needed)
Bucket Name:         harvester-vm-backups
Region:              us-east-1
Access Key ID:       AKIAIOSFODNN7EXAMPLE
Secret Access Key:   wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
Certificate:         (leave blank for public S3; add a self-signed cert for private endpoints)
Virtual Hosted-Style: false  (set true only if your S3-compatible target requires it)
```

### Using NFS

```text
Type:     NFS
Endpoint: nfs://192.168.1.50:/exports/harvester-backups
```

### Via kubectl

```yaml
# backup-target-s3.yaml

apiVersion: harvesterhci.io/v1beta1
kind: Setting
metadata:
  name: backup-target
value: |
  {
    "type": "s3",
    "endpoint": "",
    "accessKeyId": "AKIAIOSFODNN7EXAMPLE",
    "secretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    "bucketName": "harvester-vm-backups",
    "bucketRegion": "us-east-1",
    "cert": "",
    "virtualHostedStyle": false
  }
```

```bash
kubectl apply -f backup-target-s3.yaml

# Verify the backup target is reachable
kubectl get setting backup-target \
    -o jsonpath='{.status.conditions}' | jq .
```

## Step 2: Create a Manual VM Backup

### Via the UI

1. Navigate to **Virtual Machines**
2. Find the VM you want to back up
3. Click the **⋮** menu → **Take Backup**
4. Provide a backup name
5. Click **Create**

### Via kubectl

```yaml
# vm-backup.yaml
# Create an on-demand backup of a VM

apiVersion: harvesterhci.io/v1beta1
kind: VirtualMachineBackup
metadata:
  name: ubuntu-web-01-backup-20240315
  namespace: default
spec:
  # Reference to the source VM
  source:
    apiGroup: kubevirt.io
    kind: VirtualMachine
    name: ubuntu-web-01
  # Type: backup (external) or snapshot (on-cluster)
  type: backup
```

```bash
kubectl apply -f vm-backup.yaml

# Watch backup progress
kubectl get virtualmachinebackup ubuntu-web-01-backup-20240315 -n default -w

# Check backup status details
kubectl describe virtualmachinebackup ubuntu-web-01-backup-20240315 -n default

# A successful backup eventually reports readyToUse: true
```

## Step 3: Schedule Recurring Backups

Harvester includes built-in scheduling for VM backups and snapshots as of v1.4.0:

### Via the UI

1. Navigate to **Virtual Machine Schedules**
2. Click **Create Schedule**
3. Select **Backup** as the type
4. Choose the VM namespace and VM name
5. Enter a cron expression, retention count, and max failure count
6. Click **Create**

### Via kubectl

```yaml
# vm-backup-schedule.yaml
# Daily VM backup schedule running at 1:00 AM

apiVersion: harvesterhci.io/v1beta1
kind: ScheduleVMBackup
metadata:
  name: daily-ubuntu-web-01-backup
  namespace: default
spec:
  cron: "0 1 * * *"
  retain: 7
  maxFailure: 3
  suspend: false
  vmbackup:
    source:
      apiGroup: kubevirt.io
      kind: VirtualMachine
      name: ubuntu-web-01
    type: backup
```

```bash
kubectl apply -f vm-backup-schedule.yaml

# Verify the schedule is created
kubectl get svmbackup daily-ubuntu-web-01-backup -n default

# Check schedule details and recent scheduled backups
kubectl describe svmbackup daily-ubuntu-web-01-backup -n default

# Watch VM backups created by the schedule
kubectl get virtualmachinebackup -n default -w
```

## Step 4: Verify Backup Status

```bash
# List all backups
kubectl get virtualmachinebackup -n default

# Check backup health - completed backups should show READY_TO_USE: true
kubectl get virtualmachinebackup -n default \
    -o custom-columns=\
'NAME:.metadata.name,READY_TO_USE:.status.readyToUse,PROGRESS:.status.progress,ERROR:.status.error.message'

# If you're using S3, verify backup objects exist in the bucket
aws s3 ls s3://harvester-vm-backups/ --recursive | head -30
```

## Conclusion

VM backups in Harvester provide essential protection against data loss from hardware failures, accidental deletions, and disasters for Longhorn-backed VM workloads. By configuring a reliable backup target (S3 or NFS) and scheduling regular automated backups, you create a safety net that enables recovery from virtually any failure scenario. The incremental backup mechanism keeps storage costs reasonable while the Kubernetes-native API enables integration with your existing automation and monitoring workflows. Always test your backup and restore procedures before you need them in a real emergency.
