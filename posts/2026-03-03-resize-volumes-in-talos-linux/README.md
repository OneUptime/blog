# How to Resize Volumes in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Volume Management, Disk Resize, Kubernetes Storage, Partitions

Description: Learn how to resize volumes and partitions in Talos Linux, including expanding the EPHEMERAL partition, resizing persistent volumes, and handling disk growth scenarios.

---

Resizing volumes in Talos Linux is a task that comes up more often than you might expect. Clusters grow, workloads increase, and the disk space that seemed generous at installation time starts feeling tight. Because Talos Linux is an immutable operating system with no shell access, the process of resizing volumes works differently than what you might be used to with traditional Linux systems.

## Understanding Volume Types in Talos Linux

Before getting into the details of resizing, it helps to understand the different types of volumes you might encounter on a Talos node:

**System Partitions** - These are the partitions Talos creates during installation: EFI/BIOS, BOOT, META, STATE, and EPHEMERAL. The EPHEMERAL partition is the one most likely to need resizing, since it holds Kubernetes data, container images, and pod storage.

**Persistent Volumes (PVs)** - These are Kubernetes-managed volumes provided by a CSI driver. They are separate from the system partitions and are managed through the Kubernetes storage API.

**Additional Disk Partitions** - Talos can be configured to partition and mount additional disks beyond the system disk. These are defined in the machine configuration.

## Resizing the EPHEMERAL Partition

The EPHEMERAL partition occupies all remaining disk space after the other system partitions are created. If you started with a small disk and later migrated to a larger one, or if you expanded a virtual disk in your hypervisor, the EPHEMERAL partition will not automatically grow to fill the new space.

To resize the EPHEMERAL partition after expanding the underlying disk, you typically need to reinstall Talos on the node. During installation, Talos will repartition the disk and the EPHEMERAL partition will automatically expand to fill the available space.

```bash
# Step 1: Drain the node
kubectl drain node-01 --ignore-daemonsets --delete-emptydir-data

# Step 2: Expand the virtual disk in your hypervisor
# (This step varies depending on your platform - VMware, Proxmox, AWS, etc.)

# Step 3: Upgrade/reinstall Talos to trigger repartitioning
talosctl upgrade --nodes 192.168.1.10 \
  --image ghcr.io/siderolabs/installer:v1.7.0 \
  --preserve

# Step 4: Verify the new partition size
talosctl get mounts --nodes 192.168.1.10
```

The `--preserve` flag keeps the existing machine configuration intact during the upgrade. The repartitioning during upgrade will detect the additional disk space and expand the EPHEMERAL partition.

## Resizing Kubernetes Persistent Volumes

Persistent Volumes managed by a CSI driver can be resized through the Kubernetes API, as long as the storage class supports volume expansion.

```yaml
# First, make sure your StorageClass allows expansion
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: local-storage
provisioner: kubernetes.io/no-provisioner
allowVolumeExpansion: true  # This must be true
reclaimPolicy: Retain
```

To resize an existing PVC:

```bash
# Check the current size of a PVC
kubectl get pvc my-data-claim -o jsonpath='{.spec.resources.requests.storage}'

# Edit the PVC to request more storage
kubectl patch pvc my-data-claim -p \
  '{"spec":{"resources":{"requests":{"storage":"50Gi"}}}}'

# Verify the resize is progressing
kubectl get pvc my-data-claim -o yaml | grep -A 5 conditions
```

The success of this operation depends entirely on the CSI driver. If you are using a cloud-based CSI driver (like AWS EBS CSI or Azure Disk CSI), volume expansion is usually straightforward. If you are using local storage or a self-managed solution like Rook-Ceph, the process may involve additional steps.

## Resizing Additional Disk Partitions

If you have additional disks configured in the Talos machine configuration, you can resize partitions by updating the configuration. For example, if you added a second disk for storage:

```yaml
# Original machine configuration with a secondary disk
machine:
  disks:
    - device: /dev/sdb
      partitions:
        - mountpoint: /var/mnt/storage
          size: 100GB  # Original size
```

To resize this partition, update the configuration:

```yaml
# Updated configuration with a larger partition
machine:
  disks:
    - device: /dev/sdb
      partitions:
        - mountpoint: /var/mnt/storage
          size: 200GB  # New larger size
```

Apply the updated configuration:

```bash
# Apply the new configuration
talosctl apply-config --nodes 192.168.1.10 --file updated-config.yaml

# Some partition changes require a reboot
talosctl reboot --nodes 192.168.1.10

# Verify the new mount size
talosctl get mounts --nodes 192.168.1.10
```

Note that growing a partition is generally safe, but shrinking a partition can lead to data loss if the existing data exceeds the new size. Always back up data before attempting to shrink a volume.

## Expanding Disks in Virtual Environments

In virtualized environments, the process of expanding the underlying disk varies by platform. Here are examples for common setups:

### VMware / vSphere

```bash
# Use govc or the vSphere UI to expand the disk
govc vm.disk.change -vm talos-worker-01 -disk.key 2000 -size 200G
```

### Proxmox

```bash
# Expand the disk using qm command
qm resize 100 scsi0 +100G
```

### AWS EC2

```bash
# Expand an EBS volume
aws ec2 modify-volume --volume-id vol-0123456789abcdef0 --size 200
```

After expanding the underlying disk, you need to tell Talos to use the new space. For the system disk, an upgrade or reinstall will repartition. For additional disks, updating the machine configuration and rebooting is usually sufficient.

## Working with LVM and Talos

Talos Linux does not natively support LVM (Logical Volume Manager) on the system disk, since it uses its own partition layout. However, you can use LVM on additional disks if you deploy it through Kubernetes using privileged containers or through a storage solution like Rook-Ceph that manages its own volumes.

If you need LVM-like flexibility for your storage, consider using a CSI driver that supports dynamic provisioning and volume expansion. Solutions like Rook-Ceph, Longhorn, or OpenEBS provide this capability on top of raw disks in a Talos cluster.

```yaml
# Example: Using Rook-Ceph for flexible volume management
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  dataDirHostPath: /var/lib/rook
  storage:
    useAllNodes: true
    useAllDevices: false
    devices:
      - name: sdb  # Additional disk on each node
```

## Monitoring Disk Usage Before Resizing

Before deciding to resize, verify that disk space is actually the issue. Sometimes cleaning up unused container images or old pod data frees enough space without needing to resize.

```bash
# Check disk usage on a node
talosctl get mounts --nodes 192.168.1.10

# Check which images are consuming space
talosctl get images --nodes 192.168.1.10

# Check Kubernetes resource usage
kubectl describe node node-01 | grep -A 10 "Allocated resources"
```

Kubernetes also has garbage collection for unused container images. You can configure the thresholds in the kubelet configuration section of the Talos machine config:

```yaml
machine:
  kubelet:
    extraConfig:
      imageGCHighThresholdPercent: 85
      imageGCLowThresholdPercent: 80
```

## Planning Disk Sizes for Talos Nodes

Good capacity planning can reduce the need for resizing later. Here are some guidelines:

- **Control plane nodes**: 50GB minimum for the system disk. etcd data can grow significantly in busy clusters.
- **Worker nodes**: 100GB or more depending on workload. Container images and ephemeral storage for pods are the biggest consumers.
- **Storage nodes**: Size based on your persistent volume needs, plus overhead for the storage solution (Ceph, Longhorn, etc.).

If you are running in a cloud or virtual environment where disk expansion is easy, starting smaller and growing as needed is a reasonable approach. If you are on bare metal where disk changes are harder, plan generously from the start.

## Conclusion

Resizing volumes in Talos Linux requires understanding the different types of storage at play. System partitions are resized through upgrades or reinstalls, Kubernetes persistent volumes are resized through the PVC API, and additional disk partitions are managed through the machine configuration. The key to smooth resizing is planning ahead, monitoring disk usage proactively, and knowing which tool to use for each type of volume.
