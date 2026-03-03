# How to Use NVMe Disks with Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, NVMe, Disk Management, Storage, Kubernetes, Performance

Description: A practical guide to using NVMe disks with Talos Linux for system installation and additional storage, including device naming, configuration, and performance tips.

---

NVMe (Non-Volatile Memory Express) disks are the standard for high-performance storage in modern servers and workstations. If you are building a Talos Linux cluster on hardware with NVMe drives, you will want to understand how Talos handles these devices, how to specify them in your machine configuration, and how to get the best performance out of them.

## NVMe Device Naming in Talos Linux

The first thing to know about NVMe disks in Talos Linux is how they are named. Unlike traditional SATA or SAS drives that appear as `/dev/sda`, `/dev/sdb`, etc., NVMe drives use a different naming convention:

```text
NVMe Device Naming:
  /dev/nvme0n1    - First NVMe drive, first namespace
  /dev/nvme0n1p1  - First partition on the first NVMe drive
  /dev/nvme0n1p2  - Second partition on the first NVMe drive
  /dev/nvme1n1    - Second NVMe drive, first namespace
```

The naming follows the pattern `/dev/nvmeXnY` where X is the controller number and Y is the namespace number. Most consumer and server NVMe drives have a single namespace, so you will usually see `/dev/nvme0n1`, `/dev/nvme1n1`, and so on.

## Installing Talos Linux on an NVMe Disk

When installing Talos Linux, you specify the installation disk in the machine configuration. For NVMe drives, you need to use the correct device path:

```yaml
# Machine configuration for installing Talos on an NVMe disk
machine:
  install:
    disk: /dev/nvme0n1  # Install to the first NVMe drive
    image: ghcr.io/siderolabs/installer:v1.7.0
    wipe: true  # Wipe the disk before installation
```

If you are generating the machine configuration using `talosctl gen config`, you can specify the install disk:

```bash
# Generate configuration with NVMe as the install disk
talosctl gen config my-cluster https://192.168.1.100:6443 \
  --install-disk /dev/nvme0n1

# Or use a config patch to set the install disk
talosctl gen config my-cluster https://192.168.1.100:6443 \
  --config-patch '[{"op": "replace", "path": "/machine/install/disk", "value": "/dev/nvme0n1"}]'
```

## Identifying NVMe Disks on a Talos Node

Before configuring your machine, you need to know which NVMe devices are available. If the node is already running Talos (even in maintenance mode), you can use `talosctl` to list the disks:

```bash
# List all disks on a node
talosctl get disks --nodes 192.168.1.10

# Example output:
# NODE          NAMESPACE   TYPE   ID           VERSION   SIZE      MODEL
# 192.168.1.10  runtime     Disk   nvme0n1      1         1.0 TB    Samsung 980 PRO
# 192.168.1.10  runtime     Disk   nvme1n1      1         2.0 TB    Intel P5510
# 192.168.1.10  runtime     Disk   sda          1         4.0 TB    HGST HUS726T4
```

This tells you exactly which NVMe devices are present on the node, along with their size and model information. Use this to plan your disk layout.

## Using NVMe Disks for Additional Storage

Beyond the system installation disk, you can configure Talos to use additional NVMe disks for storage. This is common in setups where you want fast NVMe storage for databases, caching layers, or distributed storage systems like Ceph.

```yaml
# Machine configuration with additional NVMe disk
machine:
  install:
    disk: /dev/nvme0n1  # System disk
  disks:
    - device: /dev/nvme1n1  # Additional NVMe disk for storage
      partitions:
        - mountpoint: /var/mnt/fast-storage
```

This configuration tells Talos to partition the second NVMe drive and mount it at `/var/mnt/fast-storage`. Kubernetes pods can then use this mount point through hostPath volumes or a local persistent volume provisioner.

## Setting Up Local Persistent Volumes on NVMe

For Kubernetes workloads that need high-performance local storage, you can create local persistent volumes backed by NVMe disks:

```yaml
# First, configure the NVMe disk in the Talos machine config
machine:
  disks:
    - device: /dev/nvme1n1
      partitions:
        - mountpoint: /var/mnt/nvme-storage

---
# Then create a PersistentVolume in Kubernetes
apiVersion: v1
kind: PersistentVolume
metadata:
  name: nvme-pv-01
spec:
  capacity:
    storage: 500Gi
  volumeMode: Filesystem
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: nvme-local
  local:
    path: /var/mnt/nvme-storage
  nodeAffinity:
    required:
      nodeSelectorTerms:
        - matchExpressions:
            - key: kubernetes.io/hostname
              operator: In
              values:
                - worker-01
```

And the corresponding StorageClass:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nvme-local
provisioner: kubernetes.io/no-provisioner
volumeBindingMode: WaitForFirstConsumer
```

## NVMe and Distributed Storage Systems

If you are running a distributed storage solution like Rook-Ceph on your Talos cluster, NVMe disks can significantly improve performance. Rook-Ceph can be configured to use specific NVMe devices:

```yaml
# Rook-Ceph cluster configuration targeting NVMe devices
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  storage:
    useAllNodes: false
    useAllDevices: false
    nodes:
      - name: worker-01
        devices:
          - name: nvme1n1  # Dedicated NVMe for Ceph OSD
      - name: worker-02
        devices:
          - name: nvme1n1
      - name: worker-03
        devices:
          - name: nvme1n1
```

This tells Rook-Ceph to use the second NVMe drive on each worker node for Ceph Object Storage Daemons (OSDs). The first NVMe drive remains the Talos system disk.

## NVMe Performance Considerations

NVMe drives are fast, but there are a few things to consider when using them with Talos Linux:

**IO Scheduler** - Talos Linux uses a default IO scheduler that works well for most workloads. NVMe devices typically benefit from the `none` or `mq-deadline` scheduler, which reduces overhead for devices that already have their own internal queuing.

**Partition Alignment** - Talos automatically aligns partitions correctly during installation, so you do not need to worry about manual alignment. Misaligned partitions can reduce NVMe performance, but Talos handles this for you.

**Temperature Monitoring** - NVMe drives can throttle under sustained heavy workloads if they overheat. In a bare-metal deployment, make sure your server has adequate cooling for NVMe drives, especially M.2 drives that may be in confined spaces.

**Wear Leveling** - NVMe drives have a finite number of write cycles. For workloads with heavy write patterns (like etcd on control plane nodes), monitor the drive's health periodically:

```bash
# You can check NVMe health through a privileged pod
kubectl run nvme-check --rm -it --image=alpine \
  --overrides='{"spec":{"nodeName":"worker-01","containers":[{"name":"nvme-check","image":"alpine","command":["sh"],"securityContext":{"privileged":true},"volumeMounts":[{"name":"dev","mountPath":"/dev"}]}],"volumes":[{"name":"dev","hostPath":{"path":"/dev"}}]}}' \
  -- sh -c "apk add nvme-cli && nvme smart-log /dev/nvme0n1"
```

## Multiple NVMe Disks in a Single Node

For nodes with multiple NVMe drives, you have several options for organizing your storage:

**Separate purposes** - Use one NVMe for the system disk and others for specific workloads:

```yaml
machine:
  install:
    disk: /dev/nvme0n1  # System
  disks:
    - device: /dev/nvme1n1  # Database storage
      partitions:
        - mountpoint: /var/mnt/database
    - device: /dev/nvme2n1  # Cache storage
      partitions:
        - mountpoint: /var/mnt/cache
```

**Storage pool** - Hand multiple NVMe drives to a distributed storage system like Ceph, which will pool them together:

```yaml
# Rook-Ceph with multiple NVMe devices per node
nodes:
  - name: worker-01
    devices:
      - name: nvme1n1
      - name: nvme2n1
      - name: nvme3n1
```

## Troubleshooting NVMe Issues

If your NVMe disks are not showing up in Talos, here are some things to check:

1. **Firmware and BIOS settings** - Make sure NVMe is enabled in the system BIOS. Some systems have options to disable NVMe or to change the storage mode.

2. **Driver support** - Talos Linux includes NVMe drivers in the default kernel. If you are using an unusual NVMe controller, check whether it requires a specific driver that might need a custom Talos extension.

3. **Device naming** - After a reboot, NVMe device names can sometimes change order. Using stable device identifiers (like `/dev/disk/by-id/`) in your machine configuration can prevent issues:

```yaml
machine:
  install:
    disk: /dev/disk/by-id/nvme-Samsung_SSD_980_PRO_S123456789
```

4. **Disk detection** - Use `talosctl get disks` to verify the system can see the NVMe drives. If a drive is missing from the list, it may be a hardware or firmware issue.

## Conclusion

NVMe disks work well with Talos Linux and are straightforward to configure for both system installation and additional storage. The key is using the correct device paths, planning your disk layout based on workload requirements, and leveraging Kubernetes storage primitives to expose NVMe-backed storage to your applications. Whether you are running a small development cluster or a large production deployment, NVMe storage on Talos Linux delivers the performance that modern cloud-native workloads demand.
