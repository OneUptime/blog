# How to Mount RBD with Kernel Modules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, Kernel, Block Storage

Description: Learn how to mount Ceph RBD images using the Linux kernel RBD module (krbd) on nodes that use Rook-Ceph for block storage.

---

## Kernel RBD vs Userspace rbd-nbd

Ceph RBD images can be mounted using two methods:

- **krbd (kernel RBD)** - Uses the `rbd` kernel module, exposes `/dev/rbdX` devices, lower overhead
- **rbd-nbd** - Userspace NBD driver, more feature-compatible with newer RBD features

In Rook-Ceph, the CSI driver defaults to `krbd` for mounting RBD volumes. However, `rbd-nbd` can be used as an alternative when features like encryption or write log cache are needed.

## Step 1 - Load the Kernel Module

Verify the `rbd` kernel module is available:

```bash
modinfo rbd
modprobe rbd
lsmod | grep rbd
```

To load at boot:

```bash
echo "rbd" | sudo tee /etc/modules-load.d/rbd.conf
```

## Step 2 - Create a Ceph Configuration File

The kernel RBD client needs a `ceph.conf` and keyring to authenticate:

```bash
cat /etc/ceph/ceph.conf
```

```text
[global]
mon_host = 192.168.1.10:6789,192.168.1.11:6789,192.168.1.12:6789
auth_cluster_required = cephx
auth_service_required = cephx
auth_client_required = cephx
```

Extract the Ceph keyring from the Rook secret:

```bash
kubectl get secret rook-ceph-admin-keyring -n rook-ceph \
  -o jsonpath='{.data.keyring}' | base64 -d > /etc/ceph/ceph.client.admin.keyring
```

## Step 3 - Map an RBD Image Using rbd CLI

Use the `rbd map` command which uses the kernel module by default:

```bash
rbd map replicapool/myimage --id admin --keyring /etc/ceph/ceph.client.admin.keyring
```

Check the mapped devices:

```bash
rbd showmapped
```

Output:

```text
id  pool         namespace  image    snap  device
0   replicapool             myimage  -     /dev/rbd0
```

## Step 4 - Mount the Block Device

Format and mount the device:

```bash
mkfs.ext4 /dev/rbd0
mkdir -p /mnt/rbd-data
mount /dev/rbd0 /mnt/rbd-data
```

## Step 5 - Map RBD via /sys Interface

You can also map RBD images directly through the kernel sysfs interface without the `rbd` CLI:

```bash
echo "192.168.1.10:6789 name=admin,secret=<key> replicapool myimage" \
  | sudo tee /sys/bus/rbd/add
```

## Step 6 - Configure Rook CSI to Use krbd

To explicitly configure the Rook CSI driver to use `krbd`, set the mounter option in the StorageClass:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-block-kernel
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: replicapool
  imageFeatures: layering
  mounter: rbd
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
```

Note: When using `mounter: rbd` (krbd), only features supported by the installed kernel version are available. Features like `exclusive-lock` require kernel 4.9+.

## Step 7 - Unmap and Clean Up

When done, unmount and unmap:

```bash
umount /mnt/rbd-data
rbd unmap /dev/rbd0
```

## Summary

Mounting RBD images with the Linux kernel module (`krbd`) provides a lightweight way to expose Ceph block devices on compute nodes. Load the `rbd` kernel module, extract Ceph credentials from Rook secrets, and use `rbd map` to create `/dev/rbdX` devices. In Rook-Ceph, the CSI driver uses `krbd` by default; you can explicitly set `mounter: rbd` in the StorageClass to ensure this behavior.
