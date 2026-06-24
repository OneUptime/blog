# How to Configure Longhorn Volume Trim - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Volume Trim, Trim, Storage Optimization, Kubernetes, Disk Space, SUSE Rancher

Description: Learn how to configure and use Longhorn volume trim to reclaim unused disk space by discard trimming file system blocks that have been freed, reducing storage costs.

---

When you delete files from a Longhorn volume, the underlying disk space is not immediately reclaimed. Longhorn's filesystem trim feature lets Longhorn reclaim space from discarded blocks once the volume is attached and mounted.

---

## How Volume Trim Works

When a file is deleted inside a Longhorn volume, the filesystem marks those blocks as free. Without TRIM, Longhorn continues to count those blocks in the volume's actual size. With TRIM, Longhorn can unmap discarded blocks from the volume head and from continuous chains of removed or system snapshots, reducing actual storage usage. Valid snapshots remain immutable, so trim alone does not reclaim space from them.

---

## Step 1: Verify Filesystem Trim Prerequisites

Longhorn `v1.4.0` or later is required. The volume must contain a trimmable filesystem such as `ext4` or `xfs`, and it must already be attached and mounted on a mount point before trimming.

---

## Step 2: Trigger Volume Trim via Longhorn UI

In the Longhorn UI:

1. Navigate to **Volumes**
2. Select the attached volume you want to trim
3. Click **Trim Filesystem**

---

## Step 3: Trigger Volume Trim via Shell Command

For RWO volumes, the mount point is either inside the workload pod or on the node where the volume is attached. For RWX volumes, use the share-manager pod for that volume.

```bash
# RWO volume: run fstrim at the mount point used by the workload
kubectl exec -n <workload-namespace> <workload-pod> -- fstrim -v /data

# RWX volume: run fstrim in the share-manager pod
kubectl -n longhorn-system exec -it share-manager-<volume-name> -- bash
mount | grep <volume-name>
fstrim -v /export/<volume-name>
```

---

## Step 4: Enable Automatic Trim via StorageClass

Longhorn automatic trim is typically done with a `RecurringJob` whose task is `filesystem-trim`. By default, recurring jobs run while the volume is attached, and you can assign that recurring job to new volumes via `recurringJobSelector` in a StorageClass. The `unmapMarkSnapChainRemoved` parameter controls whether snapshots are automatically marked as removed during trim; it does not enable trim by itself.

```yaml
# recurringjob-filesystem-trim.yaml
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: trim-daily
  namespace: longhorn-system
spec:
  cron: "0 3 * * *"
  task: "filesystem-trim"
  retain: 1
  concurrency: 1
```

```yaml
# storageclass-with-trim.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-trimmed
provisioner: driver.longhorn.io
parameters:
  numberOfReplicas: "3"
  recurringJobSelector: '[{"name":"trim-daily","isGroup":false}]'
  unmapMarkSnapChainRemoved: "enabled"
```

---

## Step 5: Monitor Space Reclaimed

```bash
# List Longhorn volumes
kubectl -n longhorn-system get volumes.longhorn.io

# Compare the volume's actual size before and after trim
kubectl -n longhorn-system get volumes.longhorn.io <volume-name> \
  -o jsonpath='{.status.actualSize}{"\n"}'

# If you use Prometheus, compare:
# longhorn_volume_actual_size_bytes{volume="<volume-name>"}
```

---

## Best Practices

- Run `fstrim` on a schedule (daily or weekly) rather than relying on continuous `discard`. If automatic snapshot removal during trim is enabled, use `discard` with caution because it can interrupt operations such as backup creation.
- Trim is most impactful for volumes with high file churn (log volumes, cache directories).
- If most of a volume's actual size is tied up in valid snapshots, trim alone will not reclaim much space.
