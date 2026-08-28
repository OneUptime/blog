# Why Local Ephemeral Storage Shows Less Allocatable Space Than Node Disk Capacity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Local Ephemeral Storage, Node Allocatable, Kubelet, DiskPressure, Scheduling, Capacity Planning

Description: Reconcile raw node disks, kubelet-observed filesystem capacity, Node Allocatable reservations, Pod requests, and live disk-pressure thresholds.

---

A node with a “100 GB disk” should not be expected to advertise 100 GB of allocatable `ephemeral-storage`. Those numbers describe different layers:

```text
raw device -> partition/LVM -> formatted filesystem -> Node capacity -> Node allocatable -> current free space
```

The kubelet reports capacity for the local filesystem layout it recognizes. Node Allocatable then reserves headroom for the operating system, Kubernetes daemons, and applicable hard eviction thresholds. Current free bytes change with logs, images, writable container layers, and disk-backed `emptyDir` data; they are not the same as either API value.

This guide targets current Linux Kubernetes nodes. Managed services can own the kubelet and filesystem configuration, so use their supported node-image or node-pool mechanism for changes.

## Read Capacity and Allocatable from the Node API

Query the values without converting them prematurely:

```bash
node=worker-07

kubectl get node "$node" \
  -o go-template='capacity={{index .status.capacity "ephemeral-storage"}} allocatable={{index .status.allocatable "ephemeral-storage"}}{{"\n"}}'

kubectl describe node "$node"
```

`status.capacity` is the total local ephemeral-storage resource reported by the kubelet. `status.allocatable` is the portion available for scheduling ordinary Pods. The scheduler compares Pod requests with allocatable; it does not treat the raw disk label or current `df` free space as the scheduling budget.

In `kubectl describe node`, also review **Allocated resources**. That section totals Pod requests and limits, not actual bytes currently written. A node can have low requested storage but high real usage, or high requests while applications currently use little.

## Identify the Filesystem the Kubelet Observes

Kubernetes describes up to three logical filesystem identifiers:

- `nodefs`: the node's main filesystem for kubelet data, non-memory `emptyDir`, and logs;
- `imagefs`: an optional runtime filesystem for read-only container images and, when no separate `containerfs` exists, writable layers;
- `containerfs`: an optional runtime filesystem for writable container layers in supported split-image layouts.

These names do not always represent separate mounts. In a common single-filesystem node, they refer to the same underlying filesystem.

On the node, map the real mounts and compare bytes and inodes:

```bash
findmnt -T /var/lib/kubelet
findmnt -T /var/log
df -h /var/lib/kubelet /var/log
df -i /var/lib/kubelet /var/log
lsblk -o NAME,SIZE,FSTYPE,MOUNTPOINTS
```

Inspect the container runtime's storage location through the distribution's supported tooling as well. Do not assume it is `/var/lib/containerd` or `/var/lib/containers`; that is runtime and node-image specific.

The kubelet only measures supported layouts that it observes through its runtime integration. Attaching a second disk or mounting an arbitrary filesystem somewhere under kubelet or runtime directories does not automatically increase the advertised resource. An unsupported split can produce missing or inaccurate local-storage accounting and prevent Pod limits from being applied correctly.

## Account for Space Lost Before Kubernetes Sees It

Raw device capacity can exceed filesystem capacity for ordinary infrastructure reasons:

- disk vendors advertise decimal GB while Kubernetes quantities commonly use binary `Gi` or `Ki`;
- EFI, boot, recovery, swap, RAID metadata, LVM, and other partitions consume device space;
- filesystem metadata and reserved blocks reduce usable bytes;
- the Kubernetes data filesystem may be only one logical volume on a larger device;
- cloud node images may divide OS, runtime, and data storage deliberately.

Compare the block-device and filesystem views before blaming Node Allocatable. If Node `capacity` already matches the smaller filesystem rather than the raw disk, the missing space is below the Kubernetes reservation layer.

## Reconcile Node Allocatable Reservations

The kubelet can reserve `ephemeral-storage` for two daemon categories:

- `kubeReserved` for Kubernetes system daemons;
- `systemReserved` for operating-system daemons.

It also keeps eviction headroom so the node can reclaim resources before the filesystem is completely full. Conceptually, the Pod budget is capacity minus those reservations and the applicable hard-eviction reserve.

The official Node Allocatable example starts with 100 Gi of storage, reserves 1 Gi for Kubernetes daemons and 1 Gi for system daemons, and configures `nodefs.available: 10%`. It reports 88 Gi allocatable:

```text
100 Gi - 1 Gi - 1 Gi - 10 Gi = 88 Gi
```

Inspect the effective `KubeletConfiguration` used by the node image or cluster manager, especially:

```yaml
kubeReserved:
  ephemeral-storage: ...
systemReserved:
  ephemeral-storage: ...
evictionHard:
  nodefs.available: ...
  nodefs.inodesFree: ...
  imagefs.available: ...
  imagefs.inodesFree: ...
enforceNodeAllocatable:
  - pods
```

Do not infer these settings from one node's arithmetic alone. Percent eviction thresholds are calculated against the relevant filesystem capacity, and separate `imagefs` or `containerfs` layouts change which signal protects which data.

When overriding eviction thresholds, review the version-specific kubelet behavior carefully. Kubernetes documentation warns that partial custom `evictionHard` configuration can zero unspecified defaults rather than merging them, depending on configuration. Specify and validate the complete intended set.

## Separate the Scheduling Budget from Live Disk Pressure

The scheduler and kubelet answer different questions:

- The scheduler checks whether the sum of Pod `ephemeral-storage` requests fits within Node Allocatable.
- The kubelet measures live filesystem signals such as `nodefs.available`, `imagefs.available`, `containerfs.available`, and their free-inode equivalents.
- When a filesystem eviction threshold is met, the kubelet reports the node's `DiskPressure` condition and first attempts node-level reclamation; if reclamation does not clear the threshold, it can then evict Pods.

Check the condition and recent Node events:

```bash
kubectl get node "$node" \
  -o jsonpath='{range .status.conditions[?(@.type=="DiskPressure")]}{.type}{"="}{.status}{" reason="}{.reason}{" message="}{.message}{"\n"}{end}'

kubectl events -A --for "node/$node"
```

A Pod can fit the scheduler's request accounting and later be evicted because actual writes, system logs, image growth, or another unrequested consumer exhausts a monitored filesystem. Conversely, low `df` usage does not increase the fixed allocatable value until kubelet configuration or filesystem capacity changes.

## Know What Counts as Pod Local Ephemeral Storage

For supported layouts, kubelet measures these Pod-related consumers:

- disk-backed `emptyDir` volumes;
- container logs;
- writable container layers.

An `emptyDir` with `medium: Memory` counts as container memory use instead of local ephemeral storage. A generic ephemeral volume is backed by an automatically created PVC and uses that PVC's `requests.storage` and StorageClass policy; it does not add to the container's local `ephemeral-storage` request, although the container's logs and writable layer still count as local ephemeral-storage usage.

Define realistic requests and limits:

```yaml
resources:
  requests:
    ephemeral-storage: 2Gi
  limits:
    ephemeral-storage: 6Gi
```

If a container's writable layer and logs exceed its limit, or the aggregate local ephemeral-storage usage of all containers plus disk-backed `emptyDir` usage exceeds the sum of the containers' limits, the kubelet can mark the Pod for eviction. Namespace quota for local ephemeral storage is enforced only under the documented conditions, including Pods specifying appropriate limits.

## Check Measurement Accuracy

The kubelet normally measures usage with periodic directory scans. Directory scanning does not account for a deleted file that remains open by a process: the filesystem still consumes its blocks, while the scan no longer sees the pathname. Compare `df` with file-level usage and investigate open deleted files using the node operating system's approved diagnostics.

Kubernetes also supports project-quota-based monitoring of eligible disk-backed `emptyDir` volumes on suitable XFS or ext4 filesystems. Current documentation marks this capability beta and disabled by default, with feature-gate, user-namespace, kernel, runtime, and mount requirements. Project quotas improve measurement accuracy for those volumes; Kubernetes uses them for monitoring rather than direct quota enforcement.

Inodes are an independent constraint. A filesystem with many free GiB can still enter `DiskPressure` when `nodefs.inodesFree`, `imagefs.inodesFree`, or `containerfs.inodesFree` crosses its threshold.

## Fix the Right Layer

Choose remediation based on the first layer where values diverge:

- If the raw disk is larger than the Kubernetes filesystem, resize the correct partition, logical volume, and filesystem through the node-image or provider procedure.
- If kubelet observes the wrong layout, correct the runtime and kubelet storage design to a supported layout; do not add an arbitrary bind mount.
- If reservations are excessive, tune them from measured daemon and eviction needs, not merely to advertise a larger number.
- If live usage is high, fix log rotation, image lifecycle, runaway writable layers, or oversized `emptyDir` consumers.
- If Pod requests are inaccurate, measure representative workloads and adjust requests and limits so scheduling reflects realistic peaks.
- If inodes are scarce, find the small-file producer and choose an appropriate filesystem design rather than focusing only on bytes.

Do not lower eviction headroom to zero or advertise raw capacity just to make a Pending Pod schedule. A full node filesystem can disrupt kubelet, logging, image pulls, and container creation for every workload on the node.

## Verify a Configuration Change

Roll node-image or kubelet changes through a canary node pool. Drain and replace nodes using the cluster provider's supported workflow, then compare:

```bash
kubectl get node "$node" \
  -o go-template='capacity={{index .status.capacity "ephemeral-storage"}} allocatable={{index .status.allocatable "ephemeral-storage"}}{{"\n"}}'

kubectl describe node "$node"
```

Confirm filesystem mounts, byte and inode thresholds, `DiskPressure`, Pod scheduling, runtime image garbage collection, log writing, and `emptyDir` enforcement. Observe under realistic load before applying the change to every node.

## Rollback and Recovery Cautions

Filesystem migration and kubelet reservation changes can make a node temporarily unavailable or alter eviction behavior. Keep sufficient spare capacity, change one node pool or canary at a time, and retain the previous node image or configuration for provider-supported rollback.

Moving runtime or kubelet directories by copying live files is unsafe. Stop and use the distribution's documented node replacement or offline migration process instead of improvising with symlinks or bind mounts.

## Limitations and Version Scope

Filesystem discovery and `containerfs` support have evolved across Kubernetes and container-runtime releases. Current documentation describes `containerfs` as a feature with specific gates and runtime support; older clusters may expose only `nodefs` and optional `imagefs`. Windows storage accounting and managed-service node layouts differ. Always use documentation matching the server, kubelet, and CRI versions actually deployed.

## Official Documentation

- [Local ephemeral-storage layouts, accounting, limits, and measurement](https://kubernetes.io/docs/concepts/storage/ephemeral-storage/)
- [Reserve resources and calculate Node Allocatable](https://kubernetes.io/docs/tasks/administer-cluster/reserve-compute-resources/)
- [Node-pressure eviction signals and filesystem layouts](https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/)
- [Node status capacity and allocatable fields](https://kubernetes.io/docs/reference/node/node-status/#capacity)
- [Resource requests and limits for local ephemeral storage](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/#local-ephemeral-storage)
- [Resource quotas for local ephemeral storage](https://kubernetes.io/docs/concepts/policy/resource-quotas/#quota-for-local-ephemeral-storage)
- [Node resource capacity tracking](https://kubernetes.io/docs/concepts/architecture/nodes/#node-capacity)

## Conclusion

Start with the Node API, identify the filesystem kubelet actually observes, and then reconcile partitions, filesystem overhead, daemon reservations, and eviction headroom. Allocatable storage is a protected scheduling budget-not the disk's marketing capacity and not its current free space. Preserve that distinction when sizing nodes or tuning kubelet policy.
