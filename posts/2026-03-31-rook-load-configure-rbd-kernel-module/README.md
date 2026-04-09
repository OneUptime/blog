# How to Load and Configure the RBD Kernel Module

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, RBD, Kernel, Module, Block Storage

Description: Load and configure the Linux RBD kernel module to mount Ceph block devices on client nodes, including module parameters and persistent configuration.

---

## What Is the RBD Kernel Module?

The `rbd` kernel module (part of the Linux kernel) enables direct kernel-level access to Ceph RADOS Block Device (RBD) images. It provides better performance than the userspace `librbd` approach and is commonly used for ReadWriteOnce block storage in Kubernetes environments with Rook-Ceph.

## Checking if the Module Is Available

```bash
modinfo rbd
```

If the module is not found, your kernel may not include it. Check the kernel config:

```bash
grep CONFIG_BLK_DEV_RBD /boot/config-$(uname -r)
```

Values:
- `=y` - built into the kernel (always available)
- `=m` - loadable module
- Not present - not supported (requires different kernel)

## Loading the Module

```bash
sudo modprobe rbd
```

Verify it loaded:

```bash
lsmod | grep rbd
```

## Making It Persistent Across Reboots

```bash
echo "rbd" | sudo tee /etc/modules-load.d/rbd.conf
```

## Module Parameters

Set module parameters at load time:

```bash
# Allow single_major mode for more efficient minor number allocation
sudo modprobe rbd single_major=Y

# Set the major device number for rbd devices
sudo modprobe rbd rbd_major=252
```

List available parameters:

```bash
ls /sys/module/rbd/parameters/
```

For example, check if `single_major` is active:

```bash
cat /sys/module/rbd/parameters/single_major
```

## Mapping an RBD Image

Once the module is loaded, map an image:

```bash
sudo rbd device map mypool/myimage \
  --keyring /etc/ceph/ceph.client.admin.keyring
```

List mapped devices:

```bash
rbd device list
```

Sample output:

```text
id  pool     namespace  image    snap  device
0   mypool              myimage  -     /dev/rbd0
```

## Configuring via `/sys` Interface

Adjust parameters at runtime without reloading:

```bash
# Set the max outstanding requests per device
echo 128 | sudo tee /sys/block/rbd0/queue/nr_requests
```

## Persistent Module Options

Create a modprobe options file:

```bash
cat << 'EOF' | sudo tee /etc/modprobe.d/rbd.conf
options rbd single_major=Y
EOF
```

## Summary

Load the RBD kernel module with `modprobe rbd` and persist it via `/etc/modules-load.d/rbd.conf`. Set module parameters in `/etc/modprobe.d/rbd.conf` for persistent config, or adjust via `/sys/module/rbd/parameters/` at runtime. After loading, use `rbd device map` to attach block devices.
