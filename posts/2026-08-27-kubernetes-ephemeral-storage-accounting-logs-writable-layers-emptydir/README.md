# How Kubernetes Accounts for Ephemeral Storage Across Logs, Writable Layers, and emptyDir

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Ephemeral Storage, emptyDir, Container Logs, Kubelet, Eviction

Description: Map local ephemeral-storage requests and limits to container logs, writable layers, disk-backed emptyDir, scheduling, and eviction.

---

Kubernetes local `ephemeral-storage` is a schedulable resource measured in bytes. Its per-Pod accounting combines several storage consumers that appear unrelated inside a container: writable image layers, container logs, and disk-backed `emptyDir` volumes.

It does not include every temporary-looking volume. Memory-backed `emptyDir` is charged to memory, and PVC-backed generic ephemeral volumes use storage capacity and PVC quota instead.

## What Kubelet Measures

When local storage capacity isolation is active on a supported filesystem layout, kubelet measures:

- each container's writable layer;
- each container's node-level log directory;
- disk-backed `emptyDir` volumes used by the Pod;
- other Pod-managed local files that Kubernetes maps into the Pod, such as `/etc/hosts`.

Kubelet can measure by periodic directory scans or, when the required feature and filesystem support are enabled, project-quota monitoring. Directory scans miss the allocated blocks of a file that was deleted while a process still holds it open. Project quotas track that case accurately but are a measurement feature, not hard-quota enforcement.

Read-only container image layers also consume node storage and can drive `imagefs` pressure and image garbage collection. They are not added to the Pod-level sum used to compare writable layers, logs, and disk `emptyDir` usage with the Pod's container `ephemeral-storage` limits.

## Container and Pod Limits Are Evaluated Differently

A container-level limit covers that container's writable layer and logs. If those exceed its limit, kubelet marks the Pod for eviction.

A Pod-level limit is the sum of the `ephemeral-storage` limits of all its containers. Kubelet compares that total with:

```text
all container writable layers
+ all container logs
+ all disk-backed emptyDir usage in the Pod
```

If the sum exceeds the Pod limit, kubelet marks the Pod for eviction. A shared `emptyDir` is not assigned to one container's storage limit based on which container wrote each file; it contributes to the overall Pod comparison.

The `emptyDir.sizeLimit` is an additional volume-specific cap. Crossing either that cap or the overall Pod limit can lead to eviction. Neither behaves like a CPU throttle.

## Requests Drive Scheduling

The scheduler adds the containers' `ephemeral-storage` requests and compares the Pod request with the node's allocatable local ephemeral storage. An `emptyDir.sizeLimit` does not automatically become a scheduler request. Declare the expected consumption in container requests:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: report-worker
spec:
  containers:
    - name: worker
      image: registry.example.com/report-worker:4.2.0
      resources:
        requests:
          ephemeral-storage: 1Gi
        limits:
          ephemeral-storage: 3Gi
      volumeMounts:
        - name: work
          mountPath: /work
    - name: log-helper
      image: registry.example.com/log-helper:2.1.0
      resources:
        requests:
          ephemeral-storage: 256Mi
        limits:
          ephemeral-storage: 512Mi
      volumeMounts:
        - name: work
          mountPath: /work
  volumes:
    - name: work
      emptyDir:
        sizeLimit: 2Gi
```

This Pod requests 1.25 GiB and has an aggregate local storage limit of 3.5 GiB. The shared `emptyDir` may use at most 2 GiB before its own limit is violated, but its real usage also competes with both containers' logs and writable layers under the 3.5 GiB Pod limit.

Use uppercase suffixes carefully. Kubernetes documents that `400m` means 0.4 bytes, not 400 MiB. Use `400Mi` or `400M`.

## Understand Common Sources of Growth

Container stdout and stderr are written to node-level log files. Log rotation policy affects how much of that data remains. An application that writes a log file inside its root filesystem consumes writable-layer space instead. An application writing into disk-backed `emptyDir` consumes that volume's space and the Pod total.

Moving a path to a PVC changes the accounting boundary. A normal PVC or generic ephemeral PVC is governed by provisioned volume capacity and storage policy; it does not become local `ephemeral-storage` merely because the application calls the data temporary. Continue to budget rootfs and container logs separately.

Memory-backed `emptyDir` is another boundary. Kubelet tracks tmpfs pages as memory use of the container that wrote them. They do not count toward the local storage total shown above.

## Measurement Depends on Node Layout

Kubelet supports specific layouts involving `nodefs`, optional `imagefs`, and optional `containerfs`. It discovers these through the container runtime. Mounting kubelet, log, or runtime directories onto additional filesystems outside supported layouts can make local storage reporting and limit enforcement incorrect.

This means a manifest can be correct while a node configuration prevents expected eviction. Check the cluster distribution's kubelet and container-runtime storage layout when measured use disagrees with actual disk consumption.

## Inspect Use and Eviction Evidence

Start with the declared budget:

```bash
kubectl get pod report-worker -o yaml
kubectl describe node "$(kubectl get pod report-worker -o jsonpath='{.spec.nodeName}')"
```

Fetch the kubelet Summary API through the Kubernetes API server for detailed Pod and volume statistics:

```bash
NODE=$(kubectl get pod report-worker -o jsonpath='{.spec.nodeName}')
kubectl get --raw "/api/v1/nodes/${NODE}/proxy/stats/summary" \
  | jq '.pods[] | select(.podRef.name=="report-worker")'
```

If a Pod was evicted, `kubectl describe pod` and Events distinguish a Pod limit or `emptyDir` violation from node-wide `DiskPressure`. Node pressure is based on filesystem availability and inode signals, even when each individual Pod remains below its declared limit.

## Official Documentation

- [Kubernetes local ephemeral storage](https://kubernetes.io/docs/concepts/storage/ephemeral-storage/)
- [Kubernetes resource management for local ephemeral storage](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/#local-ephemeral-storage)
- [Kubernetes emptyDir volumes](https://kubernetes.io/docs/concepts/storage/volumes/#emptydir)
- [Kubernetes node-pressure eviction filesystems](https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/#filesystem-signals)
- [Kubernetes node metrics data](https://kubernetes.io/docs/reference/instrumentation/node-metrics/)

## Conclusion

Budget local ephemeral storage as one Pod-wide system: container logs and writable layers plus disk-backed `emptyDir`. Requests affect scheduling, summed container limits define the Pod ceiling, and kubelet evicts rather than throttles. Keep tmpfs and PVC-backed ephemeral capacity in their separate memory and storage accounting domains.
