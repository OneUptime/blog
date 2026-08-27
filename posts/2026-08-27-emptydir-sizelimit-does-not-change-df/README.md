# Why emptyDir sizeLimit Does Not Change df -h - and How Kubernetes Enforces It

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, emptyDir, Ephemeral Storage, Kubelet, Storage Limits, Troubleshooting

Description: Explain why disk-backed emptyDir shows its backing filesystem in df and how kubelet measurement and eviction enforce sizeLimit.

---

For a default, disk-backed `emptyDir`, Kubernetes creates a directory on the node storage used by kubelet and mounts it into the container. It does not normally create a new filesystem whose superblock has the requested `sizeLimit`. As a result, `df -h /scratch` reports the capacity and free space of the backing node filesystem, not the limit on that one directory.

The limit still matters. When local storage capacity isolation and volume statistics collection are active on a supported node layout, kubelet measures the volume's use and evicts the Pod after the disk-backed `emptyDir` exceeds its configured size. This is asynchronous accounting and eviction, not a synchronous block quota that must make `write(2)` return `ENOSPC` at the exact byte boundary.

## `df` and `du` Answer Different Questions

Inside this Pod, `/scratch` is backed by an `emptyDir` with a 256 MiB limit:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: emptydir-limit-demo
spec:
  restartPolicy: Never
  containers:
    - name: writer
      image: registry.k8s.io/e2e-test-images/busybox:1.36.1-1
      command: ["sh", "-c"]
      args:
        - |
          df -h /scratch
          du -sh /scratch
          dd if=/dev/zero of=/scratch/blob bs=1M count=320
          sleep 3600
      resources:
        requests:
          ephemeral-storage: 384Mi
        limits:
          ephemeral-storage: 1Gi
      volumeMounts:
        - name: scratch
          mountPath: /scratch
  volumes:
    - name: scratch
      emptyDir:
        sizeLimit: 256Mi
```

`df` asks the mounted filesystem how large that filesystem is. `du` walks the directory tree and estimates the blocks used by files under it. Neither command reads the Pod specification, so neither alone proves that kubelet accepted or will enforce `sizeLimit`.

Run this only in a disposable cluster. Watch the control-plane view while the writer runs:

```bash
kubectl get pod emptydir-limit-demo --watch
kubectl describe pod emptydir-limit-demo
kubectl get events \
  --field-selector involvedObject.name=emptydir-limit-demo \
  --sort-by=.lastTimestamp
```

Kubelet's local storage capacity isolation code treats an over-limit `emptyDir` as a reason to evict the Pod. There can be a delay because the normal measurement path performs periodic directory scans.

## Know the Conditions for Enforcement

Kubernetes can apply local ephemeral-storage isolation only when kubelet can measure the filesystems used for kubelet data, logs, and container layers through a supported layout. If node directories are moved onto filesystems outside the layouts kubelet observes, usage can be reported incorrectly and a Pod can escape limit-based eviction.

The current kubelet configuration retains the `LocalStorageCapacityIsolation` control. If an environment disables that capability because its filesystem usage cannot be detected correctly, users should not rely on container `ephemeral-storage` limits or disk-backed `emptyDir.sizeLimit`.

Even with correct measurement, another workload can fill the shared node filesystem first. Kubernetes documents that an `emptyDir` may run out of available space before reaching its own `sizeLimit` because other users of the same backing filesystem, such as logs or image overlays, can consume the available space.

## Project Quotas Improve Measurement, Not Enforcement

Kubernetes also has project-quota-based local storage monitoring. In current Kubernetes documentation the `LocalStorageCapacityIsolationFSQuotaMonitoring` feature is beta and disabled by default. Using it requires enabling that feature gate, enabling project quotas on a suitable backing filesystem such as XFS or ext4, and running Pods in a user namespace, normally with `spec.hostUsers: false`. It is faster and accounts for deleted-but-still-open files more accurately than directory scans.

The crucial caveat is explicit: Kubernetes uses project quotas to monitor storage use, not to enforce limits. Kubelet still acts on the measured usage through its eviction path. Enabling quota monitoring does not turn disk-backed `emptyDir.sizeLimit` into a guaranteed hard filesystem quota.

Directory scans have their own blind spot. If a process keeps a deleted file open, its blocks remain allocated but the scan cannot find the pathname. Project quota monitoring can account for that space.

## Memory-Backed emptyDir Is Different

With `medium: Memory`, kubelet mounts a tmpfs. A tmpfs has an actual mount size, so `df` can show that filesystem's capacity. Files written there count as memory use of the writing container, not local ephemeral-storage use. Memory limits and OOM behavior are therefore part of enforcement.

Do not use tmpfs merely to make `df` display a smaller number. It changes the consumed resource from disk to memory and can cause OOM kills.

If an application requires a provisioned scratch filesystem with a fixed capacity and hard capacity semantics, use a generic ephemeral volume backed by an appropriate StorageClass. The `volumeClaimTemplate` causes Kubernetes to create a PVC-backed volume, and `volumeClaimTemplate.spec.resources.requests.storage` requests the capacity. That capacity is distinct from the Pod's local `ephemeral-storage` accounting.

## Validate the Intended Limit

Use the API object to verify configuration and kubelet statistics to verify use:

```bash
kubectl get pod emptydir-limit-demo \
  -o jsonpath='{.spec.volumes[?(@.name=="scratch")].emptyDir.sizeLimit}{"\n"}'

NODE=$(kubectl get pod emptydir-limit-demo -o jsonpath='{.spec.nodeName}')
kubectl get --raw "/api/v1/nodes/${NODE}/proxy/stats/summary" \
  | jq '.pods[] | select(.podRef.name=="emptydir-limit-demo") | .volume'
```

Access to `nodes/proxy` is privileged. Grant it only to trusted operators or collectors.

## Official Documentation

- [Kubernetes emptyDir volume semantics](https://kubernetes.io/docs/concepts/storage/volumes/#emptydir)
- [Kubernetes local ephemeral storage accounting and measurement](https://kubernetes.io/docs/concepts/storage/ephemeral-storage/#ephemeral-storage-consumption-management)
- [Kubernetes Pod API: EmptyDirVolumeSource](https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/pod-v1/#EmptyDirVolumeSource)
- [Kubernetes kubelet configuration source for local storage isolation](https://github.com/kubernetes/kubernetes/blob/master/pkg/kubelet/apis/config/types.go)
- [Kubernetes node metrics data](https://kubernetes.io/docs/reference/instrumentation/node-metrics/)

## Conclusion

`df -h` shows the shared backing filesystem because disk-backed `emptyDir` is a directory, not a dedicated limited filesystem. Kubelet enforces `sizeLimit` by measuring volume use and evicting the Pod, subject to supported filesystem layout, enabled volume statistics collection, and measurement delay. Use generic ephemeral storage when an application needs fixed provisioned capacity.
