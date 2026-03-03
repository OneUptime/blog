# How to Troubleshoot Specified Install Disk Does Not Exist in Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Troubleshooting, Installation, Disk Errors, Kubernetes

Description: Step-by-step guide to diagnosing and fixing the specified install disk does not exist error in Talos Linux, covering common causes and solutions.

---

One of the more frustrating errors you can encounter when installing Talos Linux is the "specified install disk does not exist" message. This error means Talos cannot find the disk you told it to use for installation. It can happen on bare metal, in virtual machines, or in cloud environments. The good news is that the causes are usually straightforward to identify and fix.

## Understanding the Error

When you apply a machine configuration to a Talos node, the configuration includes an install disk specification:

```yaml
machine:
  install:
    disk: /dev/sda
    image: ghcr.io/siderolabs/installer:v1.7.0
```

If Talos boots up and cannot find `/dev/sda` (or whatever device you specified), it will report that the specified install disk does not exist. The node will stay in maintenance mode, waiting for a corrected configuration.

## Common Causes

### 1. Wrong Device Name

The most common cause is simply specifying the wrong device path. Different hardware and virtualization platforms name their disks differently:

```
Common disk naming patterns:
  /dev/sda        - SATA, SAS, and some SCSI disks
  /dev/nvme0n1    - NVMe drives
  /dev/vda        - VirtIO disks (KVM/QEMU/Proxmox)
  /dev/xvda       - Xen virtual disks (some AWS instances)
  /dev/mmcblk0    - SD cards and eMMC storage
  /dev/hda        - Legacy IDE disks (very rare now)
```

If you generated your machine configuration assuming the disk would be `/dev/sda` but the actual system uses VirtIO (which shows up as `/dev/vda`), you will get this error.

### 2. Missing Storage Drivers

Talos includes drivers for most common storage controllers, but some specialized hardware may require additional drivers that are not in the default Talos image. This is more common with:

- Hardware RAID controllers
- Certain NVMe controllers with non-standard interfaces
- Older SCSI controllers
- Some embedded storage controllers

If the storage driver is missing, the kernel will not detect the disk at all, and any device path you specify will not exist.

### 3. Disk Not Connected or Detected

On bare metal systems, the disk might not be physically connected properly, or it might be disabled in the BIOS/UEFI settings. On virtual machines, the virtual disk might not be attached to the VM.

### 4. Timing Issues

In rare cases, the disk might take a few seconds to be detected by the kernel after boot. If Talos tries to find the disk before the driver has finished initialization, it might not see it. This is more common with USB-connected storage or some SAS controllers.

## Diagnosing the Problem

The first step in fixing this error is figuring out which disks are actually available on the system. If the node is in maintenance mode, you can connect to it with `talosctl` using the `--insecure` flag.

```bash
# Connect to a node in maintenance mode
# The --insecure flag is needed because TLS is not configured yet
talosctl get disks --nodes 192.168.1.10 --insecure

# Example output:
# NODE          NAMESPACE   TYPE   ID        VERSION   SIZE      MODEL
# 192.168.1.10  runtime     Disk   vda       1         50 GB     QEMU HARDDISK
# 192.168.1.10  runtime     Disk   nvme0n1   1         500 GB    Samsung 980 PRO
```

This output tells you exactly which devices Talos can see. Compare this to what your machine configuration specifies.

```bash
# You can also check all block devices
talosctl get blockdevices --nodes 192.168.1.10 --insecure
```

## Fixing the Configuration

Once you know the correct device name, update your machine configuration and re-apply it.

### Option 1: Apply a Corrected Configuration

```bash
# Edit your configuration file to use the correct disk path
# For example, change /dev/sda to /dev/vda

# Then apply the corrected configuration
talosctl apply-config --nodes 192.168.1.10 \
  --file corrected-worker.yaml --insecure
```

### Option 2: Patch the Configuration

If you do not want to regenerate the entire configuration file, you can use a patch:

```bash
# Patch just the install disk
talosctl apply-config --nodes 192.168.1.10 --insecure \
  --config-patch '[{"op": "replace", "path": "/machine/install/disk", "value": "/dev/vda"}]' \
  --file worker.yaml
```

### Option 3: Use Disk Selectors Instead of Hardcoded Paths

Instead of specifying an exact device path, you can use disk selectors that match based on disk properties. This is more robust because it works even if the device name changes:

```yaml
machine:
  install:
    diskSelector:
      size: '>= 50GB'  # Install on any disk that is at least 50GB
      type: ssd          # Only consider SSDs
```

Other selector options include:

```yaml
machine:
  install:
    diskSelector:
      model: Samsung*     # Match by model name
      serial: S123*       # Match by serial number
      busPath: /pci0000*  # Match by bus path
```

Disk selectors are especially useful in automated deployments where you do not know the exact device name ahead of time.

## Platform-Specific Solutions

### Proxmox / KVM

Proxmox and other KVM-based hypervisors typically use VirtIO disks, which appear as `/dev/vda`:

```bash
# Check your Proxmox VM configuration
qm config 100 | grep scsi\|virtio\|sata

# If using VirtIO:
# machine.install.disk should be /dev/vda

# If using SCSI:
# machine.install.disk should be /dev/sda
```

### VMware

VMware virtual disks can appear as either `/dev/sda` (with the default PVSCSI or LSI Logic controller) or as NVMe devices if you add an NVMe controller:

```yaml
# For VMware with default SCSI controller
machine:
  install:
    disk: /dev/sda

# For VMware with NVMe controller
machine:
  install:
    disk: /dev/nvme0n1
```

### AWS EC2

AWS instances use different disk names depending on the instance type and disk attachment method:

```yaml
# NVMe-based instances (most current generation)
machine:
  install:
    disk: /dev/nvme0n1

# Older Xen-based instances
machine:
  install:
    disk: /dev/xvda
```

### Bare Metal with RAID Controllers

If your server has a hardware RAID controller, individual disks might not be visible to the OS. Instead, you will see the RAID logical drive:

```bash
# With a RAID controller, you might see:
# /dev/sda (the RAID logical volume)
# rather than individual physical disks

# Some RAID controllers present as:
# /dev/cciss/c0d0 (older HP controllers)
# /dev/md0 (Linux software RAID, though Talos doesn't support this natively)
```

## Missing Driver Solutions

If no disks appear at all, you likely need a system extension that includes the missing storage driver.

```bash
# Check if any storage-related kernel modules are needed
# You can do this by booting a standard Linux live USB on the same hardware
# and checking which modules are loaded for the storage controller:
lspci -v | grep -i storage
lsmod | grep -i nvme\|ahci\|scsi
```

Talos supports system extensions that can add kernel modules:

```bash
# Build a custom Talos image with additional drivers
docker run --rm -t -v /tmp/out:/out \
  ghcr.io/siderolabs/imager:v1.7.0 \
  installer \
  --system-extension-image ghcr.io/siderolabs/drbd:9.2.4-v1.7.0
```

Check the Talos extensions repository for available storage drivers. If your controller needs a driver that is not available as an extension, you may need to build a custom Talos kernel with the driver included.

## Preventing This Error

To avoid running into this error in the first place:

1. **Always check available disks first.** Before applying a machine configuration, boot the node into maintenance mode and use `talosctl get disks --insecure` to see what is available.

2. **Use disk selectors for automated deployments.** If you are deploying many nodes with potentially different hardware, disk selectors are more reliable than hardcoded paths.

3. **Standardize your hardware.** If you control the hardware procurement, using the same storage controllers and disk types across your fleet eliminates this class of problems.

4. **Test your configuration in a staging environment.** Before deploying to production, verify your machine configuration works on hardware that matches your production environment.

5. **Use stable disk identifiers.** Instead of `/dev/sda` which can change between boots, use paths from `/dev/disk/by-id/` or `/dev/disk/by-path/`:

```yaml
machine:
  install:
    disk: /dev/disk/by-id/scsi-SATA_Samsung_SSD_860_S123456789
```

## Conclusion

The "specified install disk does not exist" error in Talos Linux almost always comes down to a mismatch between the device path in your machine configuration and the actual device names on the hardware. By using `talosctl get disks` to discover the real device names and using disk selectors for more flexible matching, you can resolve this error quickly and prevent it from happening in future deployments.
