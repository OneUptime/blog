# How to Size a Memory-Backed emptyDir Without Triggering a Pod OOM

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, emptyDir, Memory, tmpfs, OOMKilled, Resource Limits

Description: Budget tmpfs emptyDir together with application memory, writer-specific charges, requests, limits, cleanup, and OOM failure modes.

---

On Linux nodes, an `emptyDir` with `medium: Memory` is a tmpfs. Its file pages consume memory and are initially charged to the memory use of the container that wrote them. Kubernetes tracks those pages as memory rather than local `ephemeral-storage`.

The safe size is therefore not simply "the Pod memory limit." Reserve memory for application heap, native allocations, stacks, runtime overhead, and a margin for bursts before assigning the remainder to tmpfs.

## Use Two Independent Ceilings

Set both:

1. `emptyDir.sizeLimit`, which caps the tmpfs volume; and
2. container memory limits, which cap the writers' total memory use.

The kubelet bounds a memory-backed `emptyDir` by node allocatable memory and, when set, by the lower of its `sizeLimit` and the effective Pod memory limit. When every container has a memory limit, the per-container model used below derives that Pod limit from their aggregate. When an explicit Pod-level memory limit is configured, that becomes the relevant Pod ceiling. This aggregate rule does not protect one small writer container. Because memory is initially charged to the writer, a container can be OOM-killed before the volume reaches the aggregate cap.

For one writer, use a budget like:

```text
writer memory limit
  >= peak application working set
   + peak tmpfs bytes written by that container
   + safety margin
```

Memory requests should represent expected, not merely idle, use. The scheduler uses requests when placing the Pod; setting a high limit with a low request can pack too many memory-hungry Pods onto one node.

## A Concrete Sizing Example

Assume profiling shows:

- 420 MiB peak application memory without tmpfs;
- 220 MiB peak scratch data;
- roughly 130 MiB reserved for runtime variation and measurement uncertainty.

A 256 MiB volume cap and a 1 GiB container limit leave useful headroom:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: renderer
spec:
  containers:
    - name: renderer
      image: registry.example.com/renderer:7.1.0
      resources:
        requests:
          memory: 768Mi
        limits:
          memory: 1Gi
      volumeMounts:
        - name: render-cache
          mountPath: /var/cache/render
  volumes:
    - name: render-cache
      emptyDir:
        medium: Memory
        sizeLimit: 256Mi
```

The request includes the expected tmpfs footprint because tmpfs is memory consumption. The limit is not a reservation, and `sizeLimit` does not add anything automatically to the scheduler's memory calculation.

Measure the real workload before copying these numbers. File-system metadata and application behavior add overhead, and memory working-set metrics can include some file-backed cache but are not identical to the total memory accounted against a cgroup limit.

## Multiple Writers Need Per-Container Headroom

If an application container and a sidecar both mount the same tmpfs, the pages are initially charged according to which container wrote them. On cgroup v2, attribution for shared tmpfs pages can later migrate or split between container cgroups as another container accesses those pages under memory pressure; the pages still count against the parent Pod cgroup. A large Pod-wide volume cap can hide a sidecar whose memory limit is too small.

Document ownership of files and set separate budgets. For example, if the sidecar writes up to 128 MiB, its memory limit must include those 128 MiB in addition to its own process memory. Do not assume the main container's unused limit can satisfy the sidecar's cgroup limit.

Prefer one clear writer where practical. A reader can map and access the files, but on cgroup v2 those access patterns can affect attribution, making diagnosis more complex than a simple volume-size calculation.

## Recognize the Two Failure Modes

Hitting the tmpfs capacity and hitting a cgroup memory limit are different:

- At the tmpfs size limit, writes can fail because the filesystem has no space.
- At a container memory limit, the kernel can OOM-kill the container. Kubernetes reports `reason: OOMKilled` in its container status.
- Under node-wide memory pressure, kubelet can evict Pods even when no individual container limit has been crossed.

An `emptyDir` survives a container restart within the same Pod. That is normally helpful, but it can create an OOM loop: the restarted writer sees a volume that still contains the files, whose pages continue to consume Pod-level memory headroom. Add startup cleanup, bounded cache eviction, or a deliberate recovery policy instead of assuming restart empties tmpfs.

```bash
kubectl get pod renderer \
  -o jsonpath='{range .status.containerStatuses[*]}{.name}{" restarts="}{.restartCount}{" lastReason="}{.lastState.terminated.reason}{"\n"}{end}'
kubectl describe pod renderer
```

## Monitor Both Process Memory and Volume Use

Total cgroup memory-usage metrics show whether a container cgroup is near its limit; a working-set series is not equivalent to total limit-accounted usage. The kubelet Summary API can expose per-Pod volume statistics, which help identify how much the named volume uses. Neither replaces the other.

Alert before the planned scratch budget is full and before total container memory approaches its limit. Also track restarts with `OOMKilled` reasons. A volume at 50 percent can still be unsafe if the writer's heap grew, and a container at 90 percent can be safe only if both heap and tmpfs behavior are bounded.

Do not switch from disk to memory solely for speed without load testing. Kubernetes warns that memory is smaller and more expensive than disk, and files in a memory-backed volume are application-managed data that garbage collectors do not automatically release.

Kubernetes v1.37 introduces in-place resizing of an existing memory-backed `emptyDir.sizeLimit` as an alpha feature behind `InPlacePodVerticalScalingMemoryBackedVolumes`, disabled by default. The gate must be enabled on the control plane and relevant kubelets, and the nodes must use cgroup v2. Unless the cluster deliberately enables and supports it, update the workload's Pod template and replace its Pods to alter the volume size.

## Official Documentation

- [Kubernetes resource management: memory-backed emptyDir considerations](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/#memory-backed-emptydir)
- [Kubernetes emptyDir volumes](https://kubernetes.io/docs/concepts/storage/volumes/#emptydir)
- [Kubernetes Pod API: EmptyDirVolumeSource](https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/#EmptyDirVolumeSource)
- [Kubernetes node out-of-memory behavior](https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/#node-out-of-memory-behavior)
- [Kubernetes in-place memory-backed volume resize](https://kubernetes.io/docs/tasks/configure-pod-container/resize-container-resources/#resizing-memory-backed-emptydir-volumes)

## Conclusion

Treat memory-backed `emptyDir` as part of each writer's memory budget, and allow monitored headroom for readers of a shared volume on cgroup v2. Cap the volume, include expected tmpfs use in memory requests, leave headroom inside every writer's limit, monitor both dimensions, and plan cleanup because a container restart does not empty the volume.
