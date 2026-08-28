# emptyDir sizeLimit vs ephemeral-storage Limit: Which Limit Evicts the Pod First?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, emptyDir, Ephemeral Storage, Kubelet, Eviction, Resource Limit

Description: Model the volume, container, and Pod thresholds separately and predict which observed overage can make kubelet evict the workload first.

---

For a disk-backed `emptyDir`, `sizeLimit` limits that one volume. A container's `limits.ephemeral-storage` covers its writable layer and container logs, while kubelet derives the Pod-level local ephemeral-storage limit from the Pod's effective aggregate of container limits and charges disk-backed `emptyDir` usage against it. These thresholds overlap, but they are not the same counter.

There is no API-level precedence rule based only on the numeric values that makes `emptyDir.sizeLimit` or `ephemeral-storage` universally win. Across different statistics samples, whichever applicable overage becomes actionable first can cause eviction. If one Kubernetes v1.37 kubelet synchronization sees multiple local-storage violations, however, the current implementation checks `emptyDir` limits first, then the Pod aggregate limit, then container limits; successful local-limit evictions are also handled before node-pressure eviction. Treat that ordering as an implementation detail, not an API guarantee. Usage elsewhere in the Pod, measurement intervals, deleted-open files, and node-level `DiskPressure` can change which violations are present when kubelet evaluates them.

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

At container scope, the documented behavior compares the container's writable layer and logs with its limit. Kubernetes v1.37.0 has an accepted kubelet bug on nodes with a dedicated image filesystem that can omit writable-layer bytes from the per-container check; the Pod aggregate remains a backstop once total usage exceeds its aggregate limit. Shared `emptyDir` is handled at Pod scope rather than charged to an arbitrary mounting container.

### Pod local-storage limit

Kubernetes derives the overall Pod limit from the effective aggregate of its container `ephemeral-storage` limits; for a Pod with only ordinary app containers, this is their sum. It compares that limit with the containers' writable layers and logs, disk-backed `emptyDir` volumes, and other accounted Pod-local files such as `/etc/hosts`.

Node filesystem pressure is a fourth path. Even when the Pod is under its declared limits, kubelet can evict Pods when `nodefs`, `imagefs`, or, when supported, `containerfs` availability or free-inode signals cross node eviction thresholds.

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

- If `/scratch` grows past 5 GiB while logs and writable layers remain small, the `emptyDir.sizeLimit` overage can trigger eviction before the Pod aggregate is reached.
- If `/scratch` uses 4 GiB and logs plus writable layers use more than 4 GiB, the Pod's 8 GiB aggregate can be crossed before the volume reaches 5 GiB.
- If the builder's own logs and writable layer exceed 6 GiB while neither the volume nor the Pod aggregate is over its limit, its container limit can trigger eviction.
- If the node runs short of space or inodes first, `DiskPressure` eviction can occur while every declared limit is still below threshold.

The outcome depends on the sampled counters and kubelet's check order, not on whether `volumes` appears before `containers` in YAML.

## Understand Measurement Delay

Kubelet normally scans `emptyDir`, container log directories, and writable layers periodically. Enforcement is therefore asynchronous. A fast writer can exceed a declared value before kubelet observes and evicts it.

For Pods running in user namespaces, Kubernetes can use filesystem project quotas to monitor `emptyDir` usage more accurately on suitably configured XFS or ext4 filesystems. In Kubernetes v1.37 this requires enabling the beta, disabled-by-default `LocalStorageCapacityIsolationFSQuotaMonitoring` feature and meeting the documented kernel, CRI, OCI runtime, and filesystem quota prerequisites. Kubernetes uses these project quotas to monitor usage; they do not enforce the limit as a hard filesystem quota.

Directory scanning also misses blocks belonging to files that have been deleted but remain open. Project-quota monitoring accounts for those blocks in a quota-monitored `emptyDir`. The node can still exhaust real space even when a directory scan reports less Pod usage.

## Verify That Kubelet Tracks the Filesystem

Local ephemeral-storage enforcement depends on a supported node filesystem layout. Kubernetes v1.37 documents single-filesystem, split-disk, and, with the required `containerfs` feature and runtime support, split-image layouts. Extra mounts under kubelet, log, or container-runtime storage paths outside those layouts can prevent correct accounting.

Check node capacity and allocation:

```bash
kubectl describe node NODE_NAME
kubectl get node NODE_NAME \
  -o jsonpath='{.status.capacity.ephemeral-storage}{"\n"}{.status.allocatable.ephemeral-storage}{"\n"}'
```

If kubelet is not measuring local ephemeral storage, a Pod that exceeds a local storage resource limit will not be evicted for that breach. Node filesystem pressure can still evict workloads.

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
+ other kubelet-accounted Pod-local files
+ measurement and burst headroom
= Pod local ephemeral-storage limit
```

Set each container request to the amount needed for scheduling. Set container limits so their effective Pod aggregate can accommodate shared `emptyDir` plus logs, writable layers, and other accounted Pod-local files. Set `emptyDir.sizeLimit` to cap the one scratch volume below that aggregate when scratch is the controlled consumer.

For example, a 5 GiB scratch volume should not be paired with a derived 4 GiB Pod limit when the workload also writes logs and writable-layer data. The aggregate limit would make the nominal volume capacity unreachable.

## Treat Memory-Backed emptyDir Differently

For this volume:

```yaml
emptyDir:
  medium: Memory
  sizeLimit: 1Gi
```

Kubernetes mounts tmpfs. Its `sizeLimit` constrains the volume's maximum usage, and Kubernetes charges its pages as container memory, not local ephemeral storage. Memory requests, limits, OOM behavior, tmpfs capacity, and the writer's memory accounting determine the risk. Do not add a tmpfs `emptyDir` to a disk ephemeral-storage budget.

## Official Documentation

- [Kubernetes: local ephemeral storage accounting and eviction](https://kubernetes.io/docs/concepts/storage/ephemeral-storage/)
- [Kubernetes: resource requests and limits for local ephemeral storage](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/#local-ephemeral-storage)
- [Kubernetes: emptyDir volume behavior and sizeLimit](https://kubernetes.io/docs/concepts/storage/volumes/#emptydir)
- [Kubernetes: node-pressure eviction signals and selection](https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/)
- [Kubernetes: local storage capacity isolation reached GA](https://kubernetes.io/blog/2022/09/19/local-storage-capacity-isolation-ga/)
- [Kubernetes v1.37.0: kubelet local-storage eviction implementation](https://github.com/kubernetes/kubernetes/blob/v1.37.0/pkg/kubelet/eviction/eviction_manager.go)
- [Kubernetes issue: per-container limit accounting with a dedicated image filesystem](https://github.com/kubernetes/kubernetes/issues/139205)

## Conclusion

Neither numeric limit has universal priority across statistics samples. `emptyDir.sizeLimit` watches one disk-backed volume; container-limit checks are scoped to each container's logs and writable layer; the derived Pod limit adds those consumers to disk-backed `emptyDir` usage and other accounted Pod-local files; and node pressure is independent. Calculate all counters, leave burst headroom, and use eviction evidence-not `df`-to identify the path kubelet recorded.
