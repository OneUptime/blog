# How to Configure Longhorn Volume Trim

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Kubernetes, Storage, Trim, Disk Management, Performance

Description: Learn how to enable and configure filesystem trim (UNMAP/DISCARD) for Longhorn volumes to reclaim unused space and improve storage efficiency.

## Introduction

When files are deleted inside a Longhorn volume, the storage space may not be immediately reclaimed - the blocks are marked as free in the filesystem, but Longhorn is not notified that those blocks are no longer needed. The trim (or UNMAP/DISCARD) feature tells Longhorn about unused blocks, allowing it to reclaim that space and reduce the actual disk usage of the volume.

This is particularly important for:
- Environments where volumes grow and shrink frequently
- SSDs where TRIM improves write performance
- Thin-provisioned volumes where reclaiming space saves storage

## How Trim Works in Longhorn

1. The application deletes files inside the volume
2. The filesystem marks those blocks as free
3. The trim command propagates DISCARD/UNMAP commands to Longhorn
4. Longhorn marks those blocks as empty in replicas
5. Storage space is reclaimed

## Prerequisites

- Longhorn v1.4.0 or later
- Volume filesystem that supports DISCARD (ext4, xfs, btrfs)
- The volume must be attached

## Enabling Trim via the Longhorn UI

### Per-Volume Trim

1. Open the Longhorn UI
2. Navigate to **Volume**
3. Find the target volume
4. Click the three-dot menu (⋮)
5. Select **Trim Filesystem**
6. Confirm the operation

The trim operation will run and reclaim unused space.

## Enabling Trim via kubectl

### One-Time Trim via Longhorn API

```bash
# Get the volume name

kubectl get volumes.longhorn.io -n longhorn-system

# Trigger a filesystem trim on a specific volume
curl -X POST \
  "http://longhorn-frontend.longhorn-system.svc/v1/volumes/<volume-name>?action=trimFilesystem" \
  -H "Content-Type: application/json"
```

### Trim Inside the Container (Preferred for Kubernetes)

The recommended approach is to run fstrim inside the container using the volume:

```bash
# Run fstrim on the volume mount point inside a pod
kubectl exec -it <pod-using-the-volume> -- fstrim -v /data

# Example output:
# /data: 2.5 GiB (2684354560 bytes) trimmed
```

## Automating Trim with a CronJob

Create a CronJob to periodically trim volumes:

```yaml
# trim-cronjob.yaml - Weekly filesystem trim for a volume
apiVersion: batch/v1
kind: CronJob
metadata:
  name: longhorn-volume-trim
  namespace: default
spec:
  # Run every Sunday at 3 AM
  schedule: "0 3 * * 0"
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: trimmer
              image: busybox
              command:
                - sh
                - -c
                - |
                  echo "Running fstrim on /data..."
                  fstrim -v /data
                  echo "Trim complete."
              volumeMounts:
                - name: data-volume
                  mountPath: /data
          volumes:
            - name: data-volume
              persistentVolumeClaim:
                claimName: my-app-data   # The volume to trim
```

```bash
kubectl apply -f trim-cronjob.yaml

# Test the CronJob by creating a manual Job
kubectl create job --from=cronjob/longhorn-volume-trim manual-trim-test

# Check the job logs
kubectl logs -l job-name=manual-trim-test
```

## Enabling Automatic Periodic Trim in Longhorn

Longhorn can be configured to automatically trim volumes on a schedule. There is no built-in global setting for trim cadence; automatic periodic trim is configured by creating a `RecurringJob` with the `filesystem-trim` task.

### Via Recurring Job

```yaml
# recurring-trim-job.yaml - Weekly automated trim for all labeled volumes
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: weekly-trim
  namespace: longhorn-system
spec:
  # Run every Sunday at midnight
  cron: "0 0 * * 0"
  # Filesystem trim task
  task: "filesystem-trim"
  retain: 1   # Trim does not create snapshots; minimum allowed value is 1
  concurrency: 5
  labels:
    schedule: weekly-trim
```

```bash
kubectl apply -f recurring-trim-job.yaml

# Apply to volumes
kubectl label volumes.longhorn.io my-volume \
  -n longhorn-system \
  "recurring-job.longhorn.io/weekly-trim=enabled"
```

## Mount Options for Automatic Discard

Configure volumes to automatically issue DISCARD commands on delete:

```yaml
# storageclass-with-discard.yaml - StorageClass with automatic discard enabled
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-auto-discard
provisioner: driver.longhorn.io
allowVolumeExpansion: true
parameters:
  numberOfReplicas: "3"
  fsType: "ext4"
# Mount options to enable automatic discard
mountOptions:
  - discard   # Sends DISCARD commands automatically when files are deleted
```

> **Note:** The `discard` mount option can impact write performance because it sends DISCARD commands synchronously. For better performance, use periodic `fstrim` instead.

## Measuring Space Reclaimed

```bash
# Check volume size before and after trim
# Before trim:
kubectl exec <pod> -- df -h /data

# Run fstrim
kubectl exec <pod> -- fstrim -v /data

# After trim, check Longhorn volume actual size
kubectl get volumes.longhorn.io <volume-name> -n longhorn-system \
  -o jsonpath='{.status.actualSize}'
```

## Conclusion

Filesystem trim is an important maintenance operation for Longhorn volumes, especially in environments where data is frequently created and deleted. Regular trimming prevents volumes from consuming more physical storage than necessary and improves performance on SSD-backed storage. Use the recurring trim job to automate this maintenance task, or use the `discard` mount option for automatic trimming at the cost of some write performance.
