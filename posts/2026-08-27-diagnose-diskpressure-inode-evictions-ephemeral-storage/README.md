# How to Diagnose DiskPressure and Inode Evictions Caused by Pod Ephemeral Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DiskPressure, Eviction, Inodes, Ephemeral Storage, Kubelet

Description: Separate Pod storage-limit eviction from node DiskPressure, identify the pressured filesystem and signal, and remove the real consumer.

---

Kubernetes can evict a Pod for two related but distinct storage reasons:

- the Pod exceeds its own local `ephemeral-storage` or disk-backed `emptyDir` limit; or
- the node crosses a disk-space or inode eviction threshold and reports `DiskPressure`.

A Pod can remain below every declared limit and still be evicted during node-wide pressure. Conversely, one Pod can violate its own limit while the node has plenty of free space. Diagnose the reason, signal, and filesystem before deleting files or changing thresholds.

## Start with the Evicted Pod

Capture the terminated Pod before its controller or retention policy removes it:

```bash
kubectl get pod worker-abcde -n batch -o yaml
kubectl describe pod worker-abcde -n batch
kubectl get events -n batch \
  --field-selector involvedObject.name=worker-abcde \
  --sort-by=.metadata.creationTimestamp
```

Inspect `.status.reason`, `.status.message`, container states, the assigned node, declared `ephemeral-storage` requests and limits, and every `emptyDir.sizeLimit`.

Messages that identify a container exceeding its local `ephemeral-storage` limit, the Pod's aggregate local storage exceeding summed limits, or one `emptyDir` exceeding its size limit point to Pod-level isolation. A message that the node was low on `ephemeral-storage` or `inodes` points to node-pressure eviction; it does not by itself identify whether `nodefs`, `imagefs`, or `containerfs` crossed the threshold.

## Read the Node's DiskPressure Condition

Get the node from the Pod and inspect its condition transition:

```bash
NODE=$(kubectl get pod worker-abcde -n batch -o jsonpath='{.spec.nodeName}')

kubectl get node "$NODE" -o json \
  | jq '.status.conditions[] | select(.type == "DiskPressure")'

kubectl describe node "$NODE"
kubectl get events --all-namespaces --sort-by=.metadata.creationTimestamp \
  | grep -E "$NODE|DiskPressure|Evicted"
```

Kubelet maps any of these signals meeting an eviction threshold to `DiskPressure`:

```text
nodefs.available
nodefs.inodesFree
imagefs.available
imagefs.inodesFree
containerfs.available
containerfs.inodesFree
```

The inode signals apply to Linux nodes. `containerfs` is available only with a supported split-image filesystem configuration and runtime. In current Kubernetes documentation, split image filesystem support is beta, requires the `KubeletSeparateDiskGC` feature, and Kubernetes 1.37 lists CRI-O 1.29 or newer as the runtime supporting `containerfs`.

## Identify Which Filesystem Is Pressured

Kubelet uses these logical filesystem identifiers:

- `nodefs`: the main filesystem used for kubelet data, non-memory `emptyDir`, logs, and other node data;
- `imagefs`: an optional filesystem for read-only container image layers and, when there is no separate `containerfs`, writable layers;
- `containerfs`: an optional filesystem for writable container layers.

They do not always mean three mount points. Two or all identifiers can refer to one filesystem. On the affected node, check both bytes and inodes for the actual kubelet, log, and runtime paths:

```bash
df -h / /var/lib/kubelet /var/log
df -i / /var/lib/kubelet /var/log
```

Include the container runtime's storage path for that distribution. `df -h` can look healthy while `df -i` shows no free inodes. Millions of tiny cache, log, or scratch files create that pattern.

Then correlate the filesystem with Pod statistics:

```bash
kubectl get --raw "/api/v1/nodes/${NODE}/proxy/stats/summary" \
  | jq '.pods[] | {
      pod: (.podRef.namespace + "/" + .podRef.name),
      ephemeral: .["ephemeral-storage"],
      volumes: .volume
    }'
```

Summary data is measured periodically. Directory-scan mode can miss deleted files that remain open. Use node process and filesystem inspection to find that case. For eligible `emptyDir` volumes, supported project-quota monitoring provides more accurate kubelet accounting.

## Understand Kubelet Reclamation and Ranking

Kubelet tries node-level reclamation before evicting application Pods. On a single `nodefs`, it garbage-collects dead Pods and containers, then deletes unused images. With separate filesystems, it directs dead-container cleanup or image cleanup at the pressured filesystem.

If pressure remains, kubelet ranks Pods using whether usage exceeds requests, Pod Priority, and usage relative to requests. Kubernetes QoS classes are based on CPU and memory and do not protect a Pod from DiskPressure. For inode exhaustion, there is no inode request resource, so relative Pod Priority determines eviction order.

An `ephemeral-storage` request is still important for scheduling and byte-pressure ranking. It cannot reserve inodes or guarantee that a high-priority Pod is never evicted when the node must protect itself.

## Fix the Consumer, Not Only the Symptom

Match remediation to the evidence:

- Rotate and bound container logs.
- Bound application caches and disk-backed `emptyDir` with cleanup plus realistic limits.
- Stop creating unbounded tiny files, and compact or batch them when inode pressure is the problem.
- Close file descriptors for deleted files so the filesystem can reclaim their blocks and inodes.
- Remove unused images through kubelet's supported image garbage collection path rather than deleting runtime files manually.
- Reserve sufficient node storage for system and Kubernetes daemons.
- Increase or separate storage only after confirming which filesystem is exhausted.
- Set realistic `ephemeral-storage` requests so the scheduler does not overpack expected disk users.

Do not manually delete files under `/var/lib/kubelet` or the container runtime database. Those directories contain managed state, and ad hoc deletion can corrupt running workloads.

Adding a disk-pressure toleration does not create capacity. Kubelet can still evict Pods to recover the node. Likewise, weakening eviction thresholds can let the filesystem reach a more dangerous failure point.

## Keep PVC-Backed Scratch Separate

Disk-backed `emptyDir`, logs, and writable layers contribute to Pod local ephemeral-storage accounting. A generic ephemeral volume is PVC-backed and uses provisioned volume capacity instead. It does not join the Pod's `ephemeral-storage` sum, although a local storage driver can still consume physical disks on the same node and needs its own capacity monitoring.

This distinction matters during diagnosis: an application path named `/scratch` does not reveal which accounting system owns it. Inspect the Pod volume source.

## Official Documentation

- [Kubernetes node-pressure eviction](https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/)
- [Kubernetes local ephemeral storage](https://kubernetes.io/docs/concepts/storage/ephemeral-storage/)
- [Kubernetes node conditions](https://kubernetes.io/docs/reference/node/node-status/#condition)
- [Kubernetes node metrics Summary API](https://kubernetes.io/docs/reference/instrumentation/node-metrics/)
- [Kubernetes resource requests and limits](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)

## Conclusion

First prove whether the Pod crossed its own limit or the node crossed a byte or inode threshold. Map `DiskPressure` to `nodefs`, `imagefs`, or `containerfs`, inspect both `df -h` and `df -i`, correlate kubelet statistics, and remove the actual log, layer, cache, image, or open-file consumer.
