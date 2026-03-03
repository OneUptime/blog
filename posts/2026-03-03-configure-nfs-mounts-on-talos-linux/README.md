# How to Configure NFS Mounts on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, NFS, Network Storage, Kubernetes, Persistent Volume

Description: Configure NFS mounts on Talos Linux for shared network storage access from your Kubernetes cluster nodes and workloads.

---

NFS (Network File System) remains one of the most widely used shared storage protocols, and for good reason. It is simple, well-understood, and works across virtually every operating system. When running Talos Linux, NFS provides a way to share data between nodes, serve persistent volumes to Kubernetes workloads, and integrate with existing network storage infrastructure. This guide covers how to configure NFS mounts on Talos Linux, both at the system level and through Kubernetes.

## NFS Use Cases on Talos Linux

Common reasons to use NFS with Talos Linux:

- **Shared configuration files** across multiple nodes
- **Persistent volumes** for applications that need shared read-write storage
- **Media storage** for serving static content
- **Backup targets** for writing backups to a central NFS server
- **Legacy integration** with existing NFS-based infrastructure
- **Home directories** for multi-tenant applications

## System-Level NFS Mounts

Talos Linux supports NFS mounts through the machine configuration. These are mounted by the OS before Kubernetes starts, making them available to all workloads on the node.

### Basic NFS Mount Configuration

```yaml
machine:
  disks: []
  files: []
  # System-level NFS mount
  mounts:
    - source: "nfs-server.example.com:/exports/shared"
      destination: /var/mnt/nfs-shared
      type: nfs
      options:
        - noatime
        - nfsvers=4.2
        - rsize=1048576
        - wsize=1048576
```

Apply the configuration:

```bash
talosctl apply-config --nodes 192.168.1.10 --file machine-config-nfs.yaml
```

### NFS Mount Options

The mount options significantly affect performance and reliability:

```yaml
machine:
  mounts:
    - source: "10.0.1.50:/exports/data"
      destination: /var/mnt/nfs-data
      type: nfs
      options:
        - nfsvers=4.2      # Use NFSv4.2 for best features
        - rsize=1048576     # Read buffer size (1MB)
        - wsize=1048576     # Write buffer size (1MB)
        - hard              # Retry NFS requests indefinitely
        - timeo=600         # Timeout (60 seconds)
        - retrans=3         # Number of retries
        - noatime           # Do not update access times (performance)
        - _netdev           # Wait for network before mounting
```

**Recommended options breakdown:**

- `nfsvers=4.2` - NFSv4.2 provides better security and performance than v3
- `rsize/wsize=1048576` - larger buffers improve throughput for large file operations
- `hard` - NFS requests will retry forever rather than failing (use `soft` if you prefer timeout failures)
- `noatime` - prevents unnecessary metadata updates for read operations
- `_netdev` - ensures the network is up before attempting to mount

## Kubernetes NFS Persistent Volumes

For Kubernetes workloads, you can provide NFS storage through persistent volumes without system-level mounts.

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
    - noatime
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
  --namespace kube-system \
  --set kubeletDir=/var/lib/kubelet
```

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
  - noatime
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

## NFS Kernel Module Configuration

Talos Linux includes NFS client support in the kernel, but you may need to explicitly enable the module in some configurations:

```yaml
machine:
  kernel:
    modules:
      - name: nfs
      - name: nfsd  # Only if running NFS server (unusual on Talos)
```

## Setting Up NFS for Multiple Nodes

When multiple Talos nodes need the same NFS mount:

```yaml
# Common machine config patch for NFS
machine:
  mounts:
    - source: "10.0.1.50:/exports/shared-config"
      destination: /var/mnt/shared
      type: nfs
      options:
        - nfsvers=4.2
        - noatime
        - hard
```

Apply as a patch to all nodes:

```bash
for node in 192.168.1.10 192.168.1.11 192.168.1.12; do
  talosctl apply-config --nodes "$node" \
    --file base-config.yaml \
    --config-patch @nfs-patch.yaml
done
```

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

```yaml
# Force NFSv3 if needed
machine:
  mounts:
    - source: "legacy-server:/exports/data"
      destination: /var/mnt/legacy
      type: nfs
      options:
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
- Remount the filesystem or reboot the Talos node

**Performance issues:**
- Check network bandwidth between nodes and the NFS server
- Increase rsize/wsize mount options
- Use NFSv4.2 for better performance features
- Verify jumbo frames are enabled if the network supports them

**Mount hangs on boot:**
- NFS mounts can cause boot delays if the server is unreachable
- Use the `soft` mount option if you prefer timeout failures over indefinite retries
- Consider using `bg` (background mount) to avoid blocking boot

## Security Considerations

NFS has historically been weak on security. For Talos Linux deployments:

1. **Use NFSv4 with Kerberos** for authentication when possible
2. **Restrict NFS exports** to specific IP ranges or networks
3. **Use network segmentation** to isolate NFS traffic
4. **Avoid root squashing bypass** - configure `root_squash` on the NFS server
5. **Consider encryption** - use NFS over TLS or a VPN tunnel for sensitive data

## Summary

NFS on Talos Linux works through machine configuration for system-level mounts and through Kubernetes resources for workload storage. System-level mounts are configured in the machine config and mounted during boot. Kubernetes workloads can use static PVs, the NFS CSI driver for dynamic provisioning, or mount NFS directly in pod specs. Tune mount options for your workload pattern, ensure network reliability between nodes and the NFS server, and consider security implications when sharing data over the network.
