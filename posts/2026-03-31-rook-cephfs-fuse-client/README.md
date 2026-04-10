# How to Use FUSE Client Instead of Kernel Driver for CephFS in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, Storage, Kubernetes

Description: Learn how to configure Rook to use the FUSE client instead of the kernel driver for CephFS mounts, including trade-offs and configuration steps.

---

## Why Choose FUSE Over the Kernel Driver

By default, Rook mounts CephFS volumes using the in-kernel CephFS driver (`ceph` kernel module). This works well on most modern Linux distributions, but there are scenarios where using the FUSE-based client (`ceph-fuse`) is preferable:

- Kernel driver requires a minimum kernel version matching the Ceph release. Older kernels may lack features needed by newer Ceph clusters.
- FUSE runs entirely in userspace, making it easier to update without kernel changes.
- Certain environments (locked-down nodes, restricted kernel modules) may not allow the kernel driver.
- FUSE provides better isolation at the cost of some performance overhead.

## How Rook Selects the Mount Driver

Rook delegates mounting to the Ceph CSI driver. The CSI driver supports both kernel and FUSE-based mounts. You control the preference via a ConfigMap that the CSI driver reads at startup.

The relevant setting is `CSI_FORCE_CEPHFS_KERNEL_CLIENT`. When you want FUSE, you set this to `"false"` so the CSI driver uses the FUSE client instead of the kernel client.

## Configuring FUSE Mount in the CSI ConfigMap

Edit or create the `rook-ceph-operator-config` ConfigMap in the `rook-ceph` namespace:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-ceph-operator-config
  namespace: rook-ceph
data:
  # Force FUSE client for all CephFS mounts
  CSI_FORCE_CEPHFS_KERNEL_CLIENT: "false"
```

Apply it:

```bash
kubectl apply -f rook-ceph-operator-config.yaml
```

After applying, restart the CSI provisioner and node plugin pods so they pick up the new setting:

```bash
kubectl rollout restart deployment/csi-cephfsplugin-provisioner -n rook-ceph
kubectl rollout restart daemonset/csi-cephfsplugin -n rook-ceph
```

## Verifying FUSE is Active

Once a workload mounts a CephFS PVC, you can confirm the mount type by inspecting the node:

```bash
# SSH to the node hosting the pod, then check mounts
mount | grep ceph-fuse
```

You should see entries like:

```text
ceph-fuse on /var/lib/kubelet/pods/.../volumes/kubernetes.io~csi/... type fuse.ceph-fuse (rw,nosuid,nodev,relatime,user_id=0,group_id=0,allow_other)
```

If you still see a `ceph` type without `fuse`, the kernel driver is still in use. Double-check the operator config and that the pods were restarted.

## Performance Trade-offs

FUSE adds context switching overhead compared to the kernel driver. Benchmarks typically show:

- Sequential throughput is 10-30% lower with FUSE.
- Latency per operation is slightly higher due to userspace round-trips.
- Metadata-heavy workloads are more affected than large sequential reads.

For workloads that require maximum throughput, prefer the kernel driver on a supported kernel. Use FUSE when compatibility or isolation is the priority.

## Kernel Driver Requirements

If you want to use the kernel driver instead, ensure your nodes meet the minimum kernel version for your Ceph version. For Ceph Quincy (17.x), kernel 4.17+ supports basic CephFS functionality (quotas, snapshots), but features like msgr2 protocol require kernel 5.11+. Check the Ceph release notes for exact per-feature requirements:

```bash
# Check node kernel version
kubectl get nodes -o custom-columns="NAME:.metadata.name,KERNEL:.status.nodeInfo.kernelVersion"
```

## Summary

The FUSE client for CephFS in Rook is configured through the `rook-ceph-operator-config` ConfigMap by disabling the kernel mount option. It is useful for older kernels or restricted environments. After changing the setting, restart the CSI daemonset and provisioner to apply the change. Monitor performance after switching, as FUSE has higher overhead than the kernel driver for I/O-intensive workloads.
