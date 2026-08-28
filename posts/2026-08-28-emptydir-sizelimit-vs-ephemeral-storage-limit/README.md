# emptyDir sizeLimit vs ephemeral-storage Limit: Which Limit Evicts the Pod First?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, emptyDir, Ephemeral Storage, Kubelet, Eviction, Resource Limits

Description: Model the volume, container, and Pod thresholds separately and predict which observed overage can make kubelet evict the workload first.

---

For a disk-backed `emptyDir`, `sizeLimit` limits that one volume. A container's `limits.ephemeral-storage` covers its writable layer and container logs, while the Pod-level local ephemeral-storage limit is derived from the container limits and also accounts for disk-backed `emptyDir` usage. These thresholds overlap, but they are not the same counter.

There is no fixed Kubernetes ordering that says `emptyDir.sizeLimit` or `ephemeral-storage` always wins. Whichever applicable threshold kubelet observes first can mark the Pod for eviction. Usage elsewhere in the Pod, measurement intervals, deleted-open files, and node-level `DiskPressure` can change the result.

## Separate the Three Eviction Paths

### Volume size limit

```yaml
volumes:
  - name: scratch
    emptyDir:
      sizeLimit: 5Gi
```

This threshold is scoped to `scratch`. It does not reserve 5 GiB during scheduling, and for normal disk-backed `emptyDir` it is not a filesystem quota that makes the next `write(2)` fail exactly at 5 GiB. Kubelet measures usage and can evict after detecting an overage.

### Container local-storage limit

```yaml
resources:
  limits:
    ephemeral-storage: 4Gi
```

At container scope, kubelet compares the container's writable layer and logs with its limit. Shared `emptyDir` is handled at Pod scope rather than charged to an arbitrary mounting container.

### Pod local-storage limit

Kubernetes derives the overall Pod limit from the sum of its container `ephemeral-storage` limits. It compares that with the containers' writable layers and logs plus disk-backed `emptyDir` volumes used by the Pod.

Node filesystem pressure is a fourth path. Even when the Pod is under its declared limits, kubelet can evict Pods when nodefs or imagefs availability or inode signals cross node eviction thresholds.

## Work Through a Concrete Example

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: report-builder
spec:
  containers:
    - name: builder
      image: registry.example.com/report-builder:3.1.0
      resources:
        requests:
          ephemeral-storage: 2Gi
        limits:
          ephemeral-storage: 6Gi
      volumeMounts:
        - name: scratch
          mountPath: /scratch
    - name: log-shipper
      image: registry.example.com/log-shipper:1.9.0
      resources:
        requests:
          ephemeral-storage: 256Mi
        limits:
          ephemeral-storage: 2Gi
      volumeMounts:
        - name: scratch
          mountPath: /scratch
          readOnly: true
  volumes:
    - name: scratch
      emptyDir:
        sizeLimit: 5Gi
```

The scheduler uses a Pod request of `2Gi + 256Mi`. The derived Pod limit is `6Gi + 2Gi = 8Gi`.

- If `/scratch` grows past 5 GiB while logs and writable layers remain small, the `emptyDir.sizeLimit` overage is likely detected first.
- If `/scratch` uses 4 GiB and logs plus writable layers use more than 4 GiB, the Pod's 8 GiB aggregate can be crossed before the volume reaches 5 GiB.
- If the builder's own logs and writable layer exceed 6 GiB, its container limit can trigger eviction regardless of the shared volume size.
- If the node runs short of space or inodes first, `DiskPressure` eviction can occur while every declared limit is still below threshold.

The outcome depends on counters, not YAML field order.

## Understand Measurement Delay

Kubelet normally scans `emptyDir`, container log directories, and writable layers periodically. Enforcement is therefore asynchronous. A fast writer can exceed a declared value before kubelet observes and evicts it.

Kubernetes can use filesystem project quotas for more accurate monitoring on supported XFS or ext4 filesystems when the relevant feature is configured. The official documentation is explicit that Kubernetes uses those project quotas to monitor usage; they do not enforce the limit as a hard filesystem quota.

Directory scanning also misses blocks belonging to files that have been deleted but remain open. Project-quota monitoring can account for those blocks. The node can still exhaust real space even when a directory scan reports less Pod usage.

## Verify That Kubelet Tracks the Filesystem

Local ephemeral-storage enforcement depends on a supported node filesystem layout. Kubernetes documents the root filesystem and an optional image filesystem model; arbitrary separate mounts for kubelet or container-runtime data can prevent correct accounting.

Check node capacity and allocation:

```bash
kubectl describe node NODE_NAME
kubectl get node NODE_NAME \
  -o jsonpath='{.status.capacity.ephemeral-storage}{"\n"}{.status.allocatable.ephemeral-storage}{"\n"}'
```

If kubelet is not measuring local ephemeral storage, exceeding a Pod or container resource limit may not cause the expected limit-based eviction. Node filesystem pressure can still evict workloads.

## Diagnose the Actual Eviction

Inspect the terminated Pod before a controller replaces or a TTL policy deletes it:

```bash
kubectl get pod report-builder -o yaml
kubectl describe pod report-builder
kubectl get events --sort-by=.metadata.creationTimestamp
```

Capture:

- `.status.reason` and `.status.message`;
- container termination reasons and exit codes;
- events that name `emptyDir`, local ephemeral-storage usage, or node pressure;
- the node's `DiskPressure` condition and eviction events;
- kubelet logs for the same timestamp.

Do not infer the winning threshold from `df -h` inside the container. A disk-backed `emptyDir` usually reports the capacity of its backing filesystem, not its `sizeLimit` or the Pod's resource limit.

## Choose Limits That Express the Intended Budget

Start with a complete Pod budget:

```text
scratch volume
+ every container writable layer
+ every container log stream retained on node
+ measurement and burst headroom
= Pod local ephemeral-storage limit
```

Set each container request to the amount needed for scheduling. Set container limits so their sum can accommodate shared `emptyDir` plus logs and writable layers. Set `emptyDir.sizeLimit` to cap the one scratch volume below that aggregate when scratch is the controlled consumer.

For example, a 5 GiB scratch volume should not be paired with a single 4 GiB Pod limit when the workload also writes logs and image-layer data. The aggregate limit would make the nominal volume capacity unreachable.

## Treat Memory-Backed emptyDir Differently

For this volume:

```yaml
emptyDir:
  medium: Memory
  sizeLimit: 1Gi
```

Kubernetes mounts tmpfs and charges its pages as container memory, not local ephemeral storage. Memory requests, limits, OOM behavior, and the writer's memory accounting determine the risk. Do not add a tmpfs `emptyDir` to a disk ephemeral-storage budget.

## Official Documentation

- [Kubernetes: local ephemeral storage accounting and eviction](https://kubernetes.io/docs/concepts/storage/ephemeral-storage/)
- [Kubernetes: resource requests and limits for local ephemeral storage](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/#local-ephemeral-storage)
- [Kubernetes: emptyDir volume behavior and sizeLimit](https://kubernetes.io/docs/concepts/storage/volumes/#emptydir)
- [Kubernetes: node-pressure eviction signals and selection](https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/)
- [Kubernetes: local storage capacity isolation reached GA](https://kubernetes.io/blog/2022/09/19/local-storage-capacity-isolation-ga/)

## Conclusion

Neither limit has universal priority. `emptyDir.sizeLimit` watches one disk-backed volume; container limits watch each container's logs and writable layer; the derived Pod limit adds those consumers to all disk-backed `emptyDir` usage; and node pressure is independent. Calculate all counters, leave burst headroom, and use eviction evidence—not `df`—to identify which threshold kubelet observed first.
