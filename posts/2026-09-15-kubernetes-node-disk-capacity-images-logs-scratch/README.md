# How to Plan Kubernetes Node Disk Capacity for Images, Logs, and Scratch Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Capacity Planning, Ephemeral Storage, Storage Planning, Monitoring

Description: Build a per-filesystem Kubernetes node disk budget that includes rollout images, container logs, scratch peaks, and eviction headroom.

---

A node can run out of disk while CPU and memory remain comfortable. Its next deployment needs new image layers, terminating Pods still hold scratch files, and a logging outage leaves local buffers growing. Sizing from today's `df` output misses that overlap.

Build two related budgets: one for physical filesystem occupancy and one for the `ephemeral-storage` requests used in scheduling. The worked example below describes a Linux node with one shared filesystem; repeat it separately for each observed filesystem when the runtime uses a supported split layout.

## Map where the bytes live

On a representative node, use read-only operating-system checks:

```bash
findmnt -T /var/lib/kubelet
findmnt -T /var/log
df -B1 /var/lib/kubelet /var/log
df -i /var/lib/kubelet /var/log
lsblk -o NAME,SIZE,FSTYPE,MOUNTPOINTS
```

Inspect the actual runtime storage path as well. Paths above are conventional, not a guarantee about a managed node image. Kubernetes distinguishes `nodefs`, `imagefs`, and, in supported configurations, `containerfs`; those identifiers can refer to the same underlying filesystem. Do not add their capacities together until the mounts prove they are separate. [Kubernetes filesystem and eviction signals](https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/)

Record filesystem size, usable space, inode capacity, runtime version, configured eviction thresholds, and the maximum Pod density being planned. Keep raw disk marketing capacity out of the arithmetic once formatted filesystem capacity is known.

## Construct a peak occupancy ledger

Suppose measurements from the intended workload and a deployment rehearsal produce this illustrative budget:

| Consumer on the shared filesystem | Peak GiB |
| --- | ---: |
| OS, kubelet/runtime metadata, system journals | 18 |
| Unique image layers retained during old/new release overlap | 38 |
| Writable container layers | 10 |
| Disk-backed scratch data, including terminating Pods | 46 |
| Container logs, agent buffers, and rotation overshoot | 12 |
| Additional growth and measurement allowance | 8 |
| Total planned occupancy | 132 |

Count a layer shared by ten containers once in physical image storage. Conversely, distinguish registry transfer size from expanded runtime disk usage. Measure the retained union of images for a rollback and rollout, rather than multiplying one compressed image size by the number of Pods.

Scratch usage needs a concurrency model. If a job writes 3 GiB and twenty jobs can overlap, a 10 GiB average from yesterday does not establish a 10 GiB requirement. Include abandoned-but-still-open files and the interval before termination and cleanup finish.

For an illustrative policy retaining 20% of the filesystem free at the planned peak:

```python
import math
occupancy_gib = sum([18, 38, 10, 46, 12, 8])
free_fraction = 0.20
minimum_filesystem_gib = math.ceil(occupancy_gib / (1 - free_fraction))
print(occupancy_gib, minimum_filesystem_gib)  # 132 165
```

This policy is an example, not a Kubernetes default. The free-space target must remain above the applicable eviction boundary by enough space for write bursts and reaction delay. On a 200 GiB filesystem, this ledger leaves 68 GiB free; rerun it after changing Pod density or the image set.

## Budget logs as an active workload

Kubelet rotates CRI container logs using settings including `containerLogMaxSize`, `containerLogMaxFiles`, and the monitoring interval. These controls do not rotate arbitrary application files or guarantee that a busy file never exceeds its configured size between observations. [Kubernetes log rotation](https://kubernetes.io/docs/concepts/cluster-administration/logging/)

As an initial estimate, multiply simultaneously active containers by configured file count and file size, then add observed overshoot, retained terminated-container logs, and agent spool space. Model application file logs and system journals separately. Test a telemetry-destination outage for the intended buffering duration; a logging agent may become the largest local writer.

## Connect the ledger to Pod requests

For supported local-storage accounting, Pod local use includes writable layers, container logs, and disk-backed `emptyDir`. A memory-backed `emptyDir` consumes memory instead. Local storage limits can lead to eviction; they are not a reservation of physical blocks or a universal synchronous disk-write quota. [Kubernetes local ephemeral storage](https://kubernetes.io/docs/concepts/storage/ephemeral-storage/)

Set realistic requests and limits in the workload, for example this container fragment:

```yaml
resources:
  requests:
    ephemeral-storage: 3Gi
  limits:
    ephemeral-storage: 7Gi
```

Compare total effective Pod requests with the Node's reported allocatable resource. Keep image storage and host-level occupancy in the physical ledger rather than pretending every image is an independent container request. Do not subtract host reservations twice when starting from allocatable.

## Validate lifecycle peaks

Rehearse a representative rollout, rollback image pull, burst of scratch-heavy jobs, and logging outage in a disposable node pool. Observe peak bytes and free inodes, image pull failures, evictions, and cleanup delay. Record which consumers shared one filesystem and whether a new release changed that relationship.

Kubelet reclaims unused images according to its image garbage-collection policy. Images that remain in use are not a dependable source of reclaimed space, and external cleanup tools can interfere with kubelet ownership. [Kubernetes image garbage collection](https://kubernetes.io/docs/concepts/architecture/garbage-collection/)

Accept the node size only when both the request-based placement plan and measured lifecycle occupancy fit. If either fails, reduce simultaneous work, adjust retention, separate suitable data onto supported storage, or enlarge the correct filesystem. A low CPU graph does not offset a full runtime disk.
