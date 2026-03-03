# How to Install Ubuntu Server on an IBM POWER (ppc64el) System

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, IBM POWER, ppc64el, Installation, Enterprise

Description: Learn how to install Ubuntu Server on IBM POWER8, POWER9, and POWER10 systems using ppc64el architecture, covering PowerVM, OpenFirmware boot, and PowerNV bare metal.

---

IBM POWER processors are high-end server CPUs used in enterprise environments, HPC clusters, and data centers where reliability, performance, and RAS (Reliability, Availability, and Serviceability) features matter. Ubuntu has maintained a first-class ppc64el (POWER little-endian) port since Ubuntu 14.04. Canonical and IBM have a formal partnership that keeps the ppc64el port well-maintained and enterprise-ready.

## POWER Architecture Variants

Ubuntu's ppc64el port runs on:

- **IBM POWER8** (2013): First generation with little-endian support; Ubuntu 14.04+
- **IBM POWER9** (2017): Enhanced I/O, NVLink for GPU computing; Ubuntu 16.04+
- **IBM POWER10** (2021): Enhanced security, AI inferencing; Ubuntu 20.04+
- **OpenPOWER systems**: Community designs (Raptor Talos II, Blackbird) using the OpenPOWER ISA

### Virtualization Environments

POWER systems commonly run in two contexts:

- **PowerVM LPAR (Logical Partition)**: IBM's proprietary hypervisor, common in enterprise deployments
- **PowerNV (bare metal / KVM)**: Running directly on hardware without PowerVM; supports KVM virtualization
- **PowerVM virtual machines through HMC**: Managed through IBM's Hardware Management Console

## Downloading ppc64el Ubuntu

```bash
# Download Ubuntu Server 24.04 LTS for ppc64el
wget https://cdimage.ubuntu.com/releases/24.04/release/ubuntu-24.04-live-server-ppc64el.iso

# Verify checksum
wget https://cdimage.ubuntu.com/releases/24.04/release/SHA256SUMS
sha256sum -c SHA256SUMS --ignore-missing
```

## Installing on a PowerVM LPAR

IBM POWER systems managed by PowerVM (the enterprise hypervisor) use LPARs - logical partitions that behave like independent servers.

### Prerequisites

- Access to the HMC (Hardware Management Console) or IVM (Integrated Virtualization Manager)
- A virtual optical device (VOPT) or network boot setup
- Allocated CPU, memory, and virtual I/O resources

### Creating an LPAR

Through the HMC web interface or command line:

```bash
# HMC command to create an LPAR (run on HMC system)
mksyscfg -r lpar \
    -m <managed-system-name> \
    -i "name=ubuntu-server,\
        profile_name=default,\
        lpar_env=aixlinux,\
        min_mem=2048,desired_mem=4096,max_mem=8192,\
        min_procs=1,desired_procs=2,max_procs=4,\
        min_proc_units=0.1,desired_proc_units=1.0,max_proc_units=2.0,\
        proc_mode=shared,\
        sharing_mode=uncap,\
        uncap_weight=128,\
        boot_mode=norm"
```

### Loading the ISO into a Virtual Optical Device

```bash
# On HMC: Create a virtual optical media library and load ISO
mkvopt -m <managed-system> -o ubuntu-24.04-ppc64el.iso -f /home/hscroot/ubuntu.iso

# Attach VOPT to the LPAR
chhwres -m <managed-system> -r virtualio --rsubtype vopt \
    -o a -p <lpar-name> \
    --id 1 \
    -a "media_name=ubuntu-24.04-ppc64el.iso"
```

### Booting the LPAR to SMS

On PowerVM, the System Management Services (SMS) menu handles boot device selection - the POWER equivalent of UEFI/BIOS setup:

1. Open an LPAR console from HMC
2. Power on the LPAR with boot mode set to SMS
3. In the SMS menu, navigate to "Select Boot Options"
4. Choose the virtual optical device with the ISO

### Installation Process

The Ubuntu Server installer on ppc64el works the same as on x86_64 through the text-based subiquity interface. However, storage configuration has some POWER-specific considerations.

### PReP Boot Partition

On POWER systems using non-UEFI firmware, the bootloader requires a PReP (PowerPC Reference Platform) boot partition:

```text
# Required partitions on a PowerVM LPAR disk:
Device    Size    Type
/dev/sda1 8 MB    PReP Boot partition (type 0x41)
/dev/sda2 1 GB    ext4 - /boot
/dev/sda3 rest    LVM or ext4 - /
```

The Ubuntu installer should create the PReP partition automatically when it detects POWER hardware. In the custom storage configuration, add:

```yaml
# autoinstall storage for ppc64el
storage:
  config:
    - id: disk-sda
      type: disk
      ptable: msdos   # MBR for POWER (not GPT in non-UEFI mode)
      path: /dev/sda
      grub_device: true

    - id: part-prep
      type: partition
      device: disk-sda
      size: 8M
      flag: prep     # PReP boot partition

    - id: part-boot
      type: partition
      device: disk-sda
      size: 1G
      flag: boot

    - id: format-boot
      type: format
      fstype: ext4
      volume: part-boot

    - id: mount-boot
      type: mount
      device: format-boot
      path: /boot

    - id: part-root
      type: partition
      device: disk-sda
      size: -1

    - id: format-root
      type: format
      fstype: ext4
      volume: part-root

    - id: mount-root
      type: mount
      device: format-root
      path: /
```

### UEFI-Based POWER Systems

POWER9 and POWER10 systems increasingly support UEFI boot alongside the traditional OPAL/OpenFirmware. On UEFI-capable POWER systems, use GPT partitioning with an EFI partition, same as x86_64.

```bash
# Check if booted in UEFI mode
[ -d /sys/firmware/efi ] && echo "UEFI" || echo "OpenFirmware/OPAL"
```

## Installing on PowerNV (Bare Metal / KVM Host)

PowerNV (POWER Non-Virtualized) means the system runs directly on the hardware with OPAL (Open Power Abstraction Layer) firmware, without PowerVM. This is the setup for OpenPOWER systems like the Raptor Talos II.

### Petitboot Bootloader

PowerNV systems use Petitboot, a Linux kexec-based bootloader embedded in the firmware. It scans connected storage and network for bootable kernels and presents a menu.

To boot the Ubuntu installer:

1. Connect a USB drive or NVMe with the ppc64el ISO
2. Petitboot detects the ISO contents
3. Navigate to "Ubuntu Server" in the Petitboot menu and press Enter

Petitboot also supports network booting (PXE/PXELINUX) if you have a boot server.

### Disk Layout for PowerNV

PowerNV systems typically use GPT. With UEFI support:

```text
/dev/sda1  512MB  FAT32     /boot/efi (EFI partition)
/dev/sda2  1GB    ext4      /boot
/dev/sda3  rest   LVM/ext4  /
```

Without UEFI (pure OpenFirmware):

```text
/dev/sda1  8MB    PReP      (bootloader)
/dev/sda2  1GB    ext4      /boot
/dev/sda3  rest   ext4      /
```

## Verifying the ppc64el Architecture

After installation:

```bash
# Verify architecture
uname -m
# Output: ppc64le

dpkg --print-architecture
# Output: ppc64el

# CPU information
lscpu | head -20

# Detailed POWER CPU info
cat /proc/cpuinfo | grep -E "cpu|clock|revision" | head -20
```

## Post-Install: POWER-Specific Considerations

### NUMA Topology

POWER processors have a NUMA (Non-Uniform Memory Access) topology that applications should be aware of:

```bash
# Check NUMA topology
numactl --hardware

# Run a process on a specific NUMA node
numactl --cpunodebind=0 --membind=0 your-application
```

### Huge Pages for Database Workloads

POWER supports multiple page sizes. For database workloads, huge pages improve TLB efficiency:

```bash
# Check huge page support
cat /proc/meminfo | grep Huge

# Configure huge pages
echo 512 | sudo tee /proc/sys/vm/nr_hugepages

# Make persistent
echo "vm.nr_hugepages=512" | sudo tee /etc/sysctl.d/99-hugepages.conf
```

### SMT (Simultaneous MultiThreading)

POWER supports up to 8 threads per core (SMT-8). For CPU-bound workloads, adjusting SMT level can improve performance:

```bash
# Check current SMT mode
ppc64_cpu --smt

# Set SMT level (1, 2, 4, or 8)
sudo ppc64_cpu --smt=4

# Make persistent (add to /etc/rc.local or a systemd unit)
```

### Package Availability

Most Ubuntu packages are available for ppc64el, but some proprietary software is x86_64-only. Check before committing to a software stack:

```bash
# Check if a package has ppc64el builds
apt-cache show package-name | grep -A 2 "Package:"

# Alternative: check on launchpad
# https://launchpad.net/ubuntu/+source/<package>
```

## KVM Virtualization on PowerNV

PowerNV systems can run KVM guests. Ubuntu Server on PowerNV supports hosting KVM virtual machines:

```bash
# Install KVM support
sudo apt install qemu-kvm libvirt-daemon-system virtinst

# Check KVM acceleration is available
sudo kvm-ok
# Should output: INFO: /dev/kvm exists, KVM acceleration can be used

# Create a VM
sudo virt-install \
    --name test-vm \
    --ram 2048 \
    --vcpus 2 \
    --disk path=/var/lib/libvirt/images/test.qcow2,size=20 \
    --cdrom /path/to/ubuntu.iso \
    --os-type linux \
    --os-variant ubuntu24.04 \
    --graphics none \
    --console pty,target_type=serial
```

## Troubleshooting

### Bootloader Issues on PowerVM

If GRUB fails to install, check that the PReP partition is correctly typed:

```bash
# Verify PReP partition type
sudo fdisk -l /dev/sda | grep PReP

# If missing, recreate with fdisk:
# n (new partition), then t (change type), then 41 (PReP Boot)
```

### Kernel Panic at Boot

Mismatched device tree or missing drivers can cause boot failures. Boot from the Ubuntu ISO in rescue mode and check:

```bash
dmesg | grep -i "error\|fail\|panic"
```

Installing Ubuntu on POWER systems is straightforward on modern POWER9/POWER10 hardware with UEFI support. Older POWER8 LPARs and PowerNV systems require attention to the PReP partition and the Petitboot bootloader, but the process is well-documented and the Ubuntu POWER team maintains excellent hardware support.
