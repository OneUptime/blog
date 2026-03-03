# How to Configure Storage on Raspberry Pi Running Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Raspberry Pi, Storage, Kubernetes, Persistent Volumes

Description: A comprehensive guide to configuring storage options on Raspberry Pi devices running Talos Linux, covering SD cards, USB drives, NFS, and distributed storage solutions.

---

Storage on Raspberry Pi is one of the most important things to get right when running Talos Linux. The Pi was not designed as a server, and its storage options reflect that. MicroSD cards wear out, USB drives have performance limitations, and there is no built-in SATA or NVMe interface on most models. But with the right configuration and some thoughtful planning, you can build a reliable storage setup for your Pi-based Kubernetes cluster.

This guide covers all the practical storage options for Raspberry Pi running Talos Linux, from the boot media itself to persistent storage for your Kubernetes workloads.

## Understanding Talos Linux Disk Layout

Before configuring storage, understand how Talos uses disk space. When Talos installs to a disk, it creates the following partition layout:

- **EFI System Partition** (100 MB) - Boot files
- **BIOS Boot Partition** (1 MB) - For legacy boot
- **Boot Partition** (1 GB) - Kernel and initramfs
- **META Partition** (1 MB) - Talos metadata
- **STATE Partition** (100 MB) - Machine configuration
- **Ephemeral Partition** (remaining space) - Container images, pod logs, etcd data

```bash
# View the disk layout on a running Talos node
talosctl -n <PI_IP> disks

# View partition details
talosctl -n <PI_IP> get blockdevices
```

The ephemeral partition is where most storage activity happens. Container images, running container filesystems, pod logs, and etcd data all live here.

## SD Card Configuration

MicroSD is the default boot media for Raspberry Pi. For Talos, use the highest quality card you can find.

### Choosing the Right SD Card

Not all SD cards are created equal. For Kubernetes workloads, you want cards with good random I/O performance:

- **Application Performance Class A2** - These cards are optimized for random reads and writes, which matches Kubernetes I/O patterns much better than sequential-optimized cards.
- **Minimum 32 GB** - After Talos partitions, you need room for container images and ephemeral data.
- **Endurance-rated cards** - Samsung PRO Endurance or SanDisk Max Endurance are designed for sustained write workloads.

```bash
# Test SD card performance from within Talos
# (This is for reference - you'd test before installing)
talosctl -n <PI_IP> dmesg | grep mmc
```

### Reducing SD Card Wear

SD cards have limited write cycles. Reduce wear through Talos configuration:

```yaml
machine:
  kubelet:
    extraArgs:
      # Reduce container log sizes
      container-log-max-size: "2Mi"
      container-log-max-files: "1"

      # More aggressive image garbage collection
      image-gc-high-threshold: "60"
      image-gc-low-threshold: "40"

  sysctls:
    # Reduce write frequency for dirty pages
    vm.dirty_writeback_centisecs: "3000"  # 30 seconds instead of 5
    vm.dirty_expire_centisecs: "6000"     # 60 seconds

    # Reduce journal writes
    vm.dirty_ratio: "40"
    vm.dirty_background_ratio: "10"
```

## USB Storage

USB drives and SSDs provide better performance and endurance than SD cards. The Raspberry Pi 4 and 5 both support USB 3.0, which offers up to 5 Gbps throughput.

### Booting from USB

To boot Talos directly from USB, update the Pi's EEPROM boot order:

```bash
# Set boot order: USB first, then SD
# BOOT_ORDER=0xf14 means: USB mass storage (4), SD (1), restart (f)
sudo rpi-eeprom-config --edit
# Change BOOT_ORDER=0xf14
```

Flash Talos to the USB drive:

```bash
# Flash to USB drive
sudo dd if=metal-rpi_generic-arm64.raw of=/dev/sdX bs=4M status=progress conv=fsync
```

### Adding a USB Drive as Extra Storage

If you boot from SD but want a USB drive for persistent storage, configure it as an additional disk in Talos:

```yaml
# Machine config for additional USB storage
machine:
  disks:
    - device: /dev/sda  # USB drive device
      partitions:
        - mountpoint: /var/mnt/usb-storage
          size: 0  # Use all available space
```

After applying this configuration, the USB drive will be mounted and available for Kubernetes persistent volumes.

## NVMe on Raspberry Pi 5

The Pi 5 supports NVMe through an M.2 HAT adapter. This provides the best storage performance available on any Raspberry Pi:

```yaml
# Machine config for NVMe on Pi 5
machine:
  install:
    disk: /dev/nvme0n1  # Boot from NVMe

  disks:
    # If using NVMe as both boot and additional storage,
    # Talos handles this automatically with the ephemeral partition
```

NVMe performance on the Pi 5 is typically:

- Sequential read: 400-800 MB/s (limited by PCIe Gen2 x1)
- Sequential write: 300-600 MB/s
- Random 4K read: 20,000-40,000 IOPS

This is a massive improvement over SD cards (typically 2,000-5,000 IOPS for random reads).

## NFS for Shared Storage

NFS is one of the simplest ways to provide shared persistent storage across Pi nodes. If you have a NAS, another server, or even a Pi with a large USB drive, you can export a directory via NFS.

### Setting Up an NFS Server (on a non-Talos machine)

```bash
# On the NFS server (Ubuntu/Debian)
sudo apt install nfs-kernel-server

# Create an export directory
sudo mkdir -p /export/kubernetes
sudo chown nobody:nogroup /export/kubernetes

# Configure the export
echo "/export/kubernetes 192.168.1.0/24(rw,sync,no_subtree_check,no_root_squash)" | sudo tee -a /etc/exports

# Apply and start
sudo exportfs -ra
sudo systemctl enable --now nfs-kernel-server
```

### Using NFS in Kubernetes

Install the NFS CSI driver on your Talos cluster:

```bash
# Install NFS CSI driver
helm repo add csi-driver-nfs https://raw.githubusercontent.com/kubernetes-csi/csi-driver-nfs/master/charts
helm install csi-driver-nfs csi-driver-nfs/csi-driver-nfs --namespace kube-system
```

Create a StorageClass:

```yaml
# nfs-storageclass.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nfs
provisioner: nfs.csi.k8s.io
parameters:
  server: 192.168.1.50
  share: /export/kubernetes
reclaimPolicy: Retain
volumeBindingMode: Immediate
mountOptions:
  - nfsvers=4.1
```

Now pods can request storage from NFS:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-data
spec:
  storageClassName: nfs
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 10Gi
```

## Local Path Provisioner

For the simplest possible persistent storage using the node's local disk:

```bash
# Install Rancher's local-path-provisioner
kubectl apply -f https://raw.githubusercontent.com/rancher/local-path-provisioner/master/deploy/local-path-storage.yaml

# Make it the default storage class
kubectl patch storageclass local-path -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'
```

This stores data on the node's ephemeral partition. Data is lost if the node is reinstalled, so only use this for data you can recreate.

## iSCSI Storage

For more advanced setups, Talos supports iSCSI through a system extension:

```yaml
# Machine config with iSCSI extension
machine:
  install:
    extensions:
      - image: ghcr.io/siderolabs/iscsi-tools:latest
```

After applying this configuration, you can use iSCSI-based storage solutions like OpenEBS or connect to an iSCSI SAN.

## Storage Performance Tips

### Avoid Writes to SD Cards When Possible

Route high-write workloads (databases, logging) to USB or NFS storage. Use the SD card primarily for the OS and read-heavy container images.

### Use tmpfs for Temporary Data

For workloads that create temporary files, use emptyDir with medium set to Memory:

```yaml
volumes:
  - name: temp
    emptyDir:
      medium: Memory
      sizeLimit: 64Mi
```

### Monitor Disk Usage

Keep an eye on disk consumption, especially on small SD cards:

```bash
# Check disk usage
talosctl -n <PI_IP> usage /var

# Check for large files
talosctl -n <PI_IP> usage /var/log
```

## Wrapping Up

Storage on Raspberry Pi running Talos Linux requires planning around the Pi's hardware limitations. SD cards work for getting started, but USB SSDs or NVMe (on Pi 5) provide much better performance and reliability for sustained Kubernetes workloads. For shared storage needs, NFS is the pragmatic choice for Pi clusters. The key is to understand the I/O patterns of your workloads and match them to the right storage backend, keeping in mind that the SD card slot was never designed for server workloads.
