# How to Configure NFS Mounts on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, NFS, Network Storage, Kubernetes, Persistent Volume

Description: Configure NFS mounts on Talos Linux for shared network storage access from your Kubernetes cluster nodes and workloads.

---

NFS (Network File System) remains one of the most widely used shared storage protocols, and for good reason. It is simple, well-understood, and works across virtually every operating system. When running Talos Linux, NFS provides a way to serve persistent volumes to Kubernetes workloads and integrate with existing network storage infrastructure. This guide covers how to configure NFS mounts on Talos Linux through Kubernetes.

Unlike traditional Linux distributions, Talos does **not** expose a way to mount arbitrary NFS shares at the OS level via the machine configuration. The Talos `v1alpha1` machine config has no `machine.mounts` field, and the kernel image does not include `mount.nfs` userspace tooling. NFS on Talos is therefore consumed exclusively through Kubernetes - either via a PersistentVolume, the NFS CSI driver, or an inline `nfs` volume on a pod.

## NFS Use Cases on Talos Linux

Common reasons to use NFS with Talos Linux:

- **Persistent volumes** for applications that need shared read-write storage
- **Media storage** for serving static content
- **Backup targets** for writing backups to a central NFS server
- **Legacy integration** with existing NFS-based infrastructure
- **Home directories** for multi-tenant applications

## NFS Mount Options Reference

The mount options below are passed through to the kernel NFS client by both `PersistentVolume.mountOptions` and the NFS CSI driver. They significantly affect performance and reliability:

- `nfsvers=4.2` - NFSv4.2 provides better security and performance than v3
- `rsize=1048576` / `wsize=1048576` - larger read/write buffers (1 MiB) improve throughput for large file operations
- `hard` - NFS requests will retry forever rather than failing (use `soft` if you prefer timeout failures)
- `timeo=600` - request timeout in deciseconds (60 seconds)
- `retrans=3` - number of retries before reporting an error (only meaningful with `soft`)
- `nolock` - disable file locking (sometimes required against NFSv3 servers without `rpc.statd`)

`noatime` is accepted on most filesystems but is **a no-op on NFS** per `nfs(5)` - atime handling is governed by the server. Leaving it out keeps the mount options honest.

## Kubernetes NFS Persistent Volumes

For Kubernetes workloads, you can provide NFS storage through persistent volumes managed by the API server.

### Static NFS Persistent Volume

```yaml
# nfs-pv.yaml

apiVersion: v1
kind: PersistentVolume
metadata:
  name: nfs-data
spec:
  capacity:
    storage: 100Gi
  accessModes:
    - ReadWriteMany  # NFS supports multi-node access
  nfs:
    server: nfs-server.example.com
    path: /exports/k8s-data
  persistentVolumeReclaimPolicy: Retain
  mountOptions:
    - nfsvers=4.2
    - hard
    - rsize=1048576
    - wsize=1048576
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: nfs-data-claim
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 100Gi
  volumeName: nfs-data
```

### Using the NFS CSI Driver

For dynamic provisioning, install the NFS CSI driver:

```bash
# Install NFS CSI driver
helm repo add csi-driver-nfs https://raw.githubusercontent.com/kubernetes-csi/csi-driver-nfs/master/charts
helm repo update

helm install csi-driver-nfs csi-driver-nfs/csi-driver-nfs \
  --namespace kube-system
```

Talos uses the default kubelet directory (`/var/lib/kubelet`), so no `kubeletDir` override is required.

Create a storage class:

```yaml
# nfs-storageclass.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nfs-csi
provisioner: nfs.csi.k8s.io
parameters:
  server: nfs-server.example.com
  share: /exports/k8s-dynamic
  mountPermissions: "0755"
reclaimPolicy: Delete
volumeBindingMode: Immediate
mountOptions:
  - nfsvers=4.2
  - hard
  - rsize=1048576
  - wsize=1048576
```

Now you can create PVCs that automatically provision NFS volumes:

```yaml
# dynamic-nfs-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: dynamic-nfs-claim
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: nfs-csi
  resources:
    requests:
      storage: 10Gi
```

## NFS Kernel Modules

The Talos kernel ships with the in-tree NFS client (`nfs`, `nfsv3`, `nfsv4`) built in, and these are auto-loaded the first time an NFS mount is performed by the kubelet or a CSI node pod. No `machine.kernel.modules` entries are required for normal NFS client use. Talos does not ship the in-kernel NFS *server* (`nfsd`), so you cannot run an NFS server on a Talos node.

## Sharing One NFS Export Across Multiple Nodes

A single NFS export can be consumed simultaneously by pods running on multiple Talos nodes by using a `PersistentVolume` with `accessModes: [ReadWriteMany]` and a PVC that references it. Every node that schedules a pod for the PVC will mount the export independently through the kubelet:

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: nfs-shared-config
spec:
  capacity:
    storage: 10Gi
  accessModes:
    - ReadWriteMany
  nfs:
    server: 10.0.1.50
    path: /exports/shared-config
  persistentVolumeReclaimPolicy: Retain
  mountOptions:
    - nfsvers=4.2
    - hard
```

Because the mount happens through Kubernetes, you do not need to apply any per-node Talos config patch - scheduling a pod that uses the PVC is enough to bring the mount up on the right nodes.

## Performance Tuning

### Network Tuning for NFS

NFS performance depends heavily on network configuration:

```yaml
machine:
  sysctls:
    # Increase network buffer sizes for NFS
    net.core.rmem_max: "16777216"
    net.core.wmem_max: "16777216"
    net.ipv4.tcp_rmem: "4096 87380 16777216"
    net.ipv4.tcp_wmem: "4096 65536 16777216"
    # Enable TCP window scaling
    net.ipv4.tcp_window_scaling: "1"
```

### Choosing Between NFSv3 and NFSv4

**NFSv4.2 (recommended):**
- Server-side copy offloading
- Better security (integrated with Kerberos)
- Stateful protocol with better crash recovery
- Single port (2049) simplifies firewall rules

**NFSv3:**
- Required for some legacy NFS servers
- Multiple ports (portmapper, mountd, etc.)
- Stateless protocol

To force NFSv3 against a legacy server, set the version in `mountOptions` on the PV or StorageClass:

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: legacy-nfs
spec:
  capacity:
    storage: 50Gi
  accessModes:
    - ReadWriteMany
  nfs:
    server: legacy-server.example.com
    path: /exports/data
  mountOptions:
    - nfsvers=3
    - nolock
```

## Troubleshooting NFS on Talos

**Mount fails with "connection refused":**
- Verify the NFS server is running and accepting connections
- Check firewall rules between the Talos node and NFS server
- Verify the export path exists and is exported

```bash
# Test NFS connectivity from a debug pod
kubectl run nfs-test --rm -it --image=busybox -- sh
# Inside the pod:
# ping nfs-server.example.com
```

**Stale file handle errors:**
- The NFS server may have restarted or the export was re-created
- Delete and recreate the pod so the kubelet re-establishes the mount

**Performance issues:**
- Check network bandwidth between nodes and the NFS server
- Increase rsize/wsize mount options
- Use NFSv4.2 for better performance features
- Verify jumbo frames are enabled if the network supports them

**Pod stuck `ContainerCreating` waiting on NFS:**
- An unreachable NFS server with `hard` mounts will block the kubelet mount call indefinitely
- Use the `soft` mount option if you prefer timeout failures over indefinite retries
- Verify network reachability between the node and the NFS server (firewall rules, routing)

## Security Considerations

NFS has historically been weak on security. For Talos Linux deployments:

1. **Use NFSv4 with Kerberos** for authentication when possible
2. **Restrict NFS exports** to specific IP ranges or networks
3. **Use network segmentation** to isolate NFS traffic
4. **Avoid root squashing bypass** - configure `root_squash` on the NFS server
5. **Consider encryption** - use NFS over TLS or a VPN tunnel for sensitive data

## Summary

NFS on Talos Linux is consumed exclusively through Kubernetes - the machine config has no `mounts` field for OS-level NFS, and the kernel image does not ship `mount.nfs`. Workloads can use a static `PersistentVolume` with an `nfs` source, the NFS CSI driver for dynamic provisioning, or an inline `nfs` volume on a pod. Tune `mountOptions` for your workload pattern, ensure network reliability between nodes and the NFS server, and consider security implications when sharing data over the network.
