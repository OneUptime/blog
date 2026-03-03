# How to Understand the Linux Boot Process on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, System Administration, Kernel, systemd

Description: A deep dive into the Linux boot process on Ubuntu, covering BIOS/UEFI, GRUB, kernel initialization, initramfs, and systemd target startup.

---

Understanding what happens between pressing the power button and seeing the login prompt is invaluable for troubleshooting boot failures, optimizing startup time, and diagnosing kernel panics. The Linux boot process is a sequence of well-defined stages, each handing off control to the next. This post walks through each stage on a modern Ubuntu system.

## Stage 1: Firmware (BIOS or UEFI)

When the machine powers on, the CPU begins executing code at a fixed memory address. On older systems this is the BIOS (Basic Input/Output System). On modern hardware it's UEFI (Unified Extensible Firmware Interface).

### BIOS Systems

The BIOS performs the Power-On Self-Test (POST), which initializes and checks hardware components. It then looks for a bootable device according to the configured boot order (disk, USB, network, etc.). On the selected device, it loads the first 512 bytes - the Master Boot Record (MBR) - into memory and executes it.

### UEFI Systems

UEFI has a more sophisticated boot manager. It reads the EFI System Partition (ESP), a FAT32 partition typically mounted at `/boot/efi`, and loads the configured EFI application. On Ubuntu this is usually GRUB's EFI binary.

```bash
# Check if your system uses UEFI
ls /sys/firmware/efi

# View EFI boot entries
efibootmgr -v

# Check the ESP partition
lsblk -o NAME,FSTYPE,MOUNTPOINT | grep -A1 vfat
```

## Stage 2: GRUB Bootloader

GRUB (Grand Unified Bootloader) is what most Ubuntu systems use. It presents the boot menu, allows kernel parameter editing, and loads the kernel.

### GRUB Configuration

```bash
# Main GRUB configuration file (generated, don't edit directly)
cat /boot/grub/grub.cfg | head -50

# Edit these defaults instead
sudo nano /etc/default/grub

# After changes, regenerate grub.cfg
sudo update-grub
```

Key `/etc/default/grub` settings:

```bash
GRUB_DEFAULT=0                    # Default menu entry (0 = first)
GRUB_TIMEOUT=5                    # Seconds to show menu
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash"  # Kernel parameters
GRUB_CMDLINE_LINUX=""             # Extra kernel parameters (all boots)
```

### What GRUB Does

1. Loads its own configuration from `/boot/grub/grub.cfg`
2. Presents the boot menu
3. Loads the selected kernel image (`vmlinuz`) into memory
4. Loads the initial RAM disk (`initrd.img`) into memory
5. Passes control to the kernel with the configured parameters

```bash
# View current kernel command line
cat /proc/cmdline

# List available kernels
ls /boot/vmlinuz-*
ls /boot/initrd.img-*
```

## Stage 3: Kernel Initialization

Once GRUB passes control, the kernel decompresses itself (the `vmlinuz` file is a compressed kernel image) and begins hardware initialization.

### What the Kernel Does at Boot

- Detects and initializes CPU features
- Sets up memory management (page tables, virtual memory)
- Initializes the scheduler
- Detects PCI devices
- Sets up interrupt handlers
- Mounts the initial RAM filesystem (initramfs)
- Starts the init process

```bash
# View kernel messages from boot
dmesg | head -100

# See kernel version
uname -r

# View kernel boot parameters used
cat /proc/cmdline
```

### Kernel Ring Buffer

The kernel maintains a circular buffer of log messages. On Ubuntu these are also captured by journald:

```bash
# View kernel messages
dmesg
dmesg --level=err,warn       # Only errors and warnings
dmesg -T                     # Human-readable timestamps

# Via journald
journalctl -k                # Kernel messages only
journalctl -k --boot=-1      # Kernel messages from previous boot
```

## Stage 4: initramfs (Initial RAM Filesystem)

The initramfs is a compressed archive that the kernel extracts into a temporary in-memory filesystem. Its purpose is to do whatever is needed before the real root filesystem can be mounted.

This is particularly important for:
- Loading filesystem drivers (ext4, btrfs, etc.)
- Handling encrypted root partitions (LUKS)
- Setting up software RAID (mdadm)
- Handling LVM volumes

```bash
# View the initramfs contents
mkdir /tmp/initrd-extract
cd /tmp/initrd-extract
unmkinitramfs /boot/initrd.img-$(uname -r) .
ls

# Check initramfs size
ls -lh /boot/initrd.img-$(uname -r)

# Rebuild initramfs after changes
sudo update-initramfs -u -k $(uname -r)
```

### The init Script in initramfs

The kernel executes `/init` inside the initramfs. On Ubuntu this is a shell script that handles device detection, runs hooks from `/scripts/`, and eventually pivots to the real root filesystem.

```bash
# View the init script
cat /tmp/initrd-extract/init | head -60
```

## Stage 5: systemd and Target Activation

After the real root filesystem is mounted, the kernel executes `/sbin/init`, which on modern Ubuntu is a symlink to systemd. systemd then takes over all service and target management.

### systemd Boot Sequence

systemd uses "targets" (analogous to runlevels) to define system states. The default target determines what gets started.

```bash
# Check the default target
systemctl get-default

# Common targets
# graphical.target    - Full GUI with networking
# multi-user.target   - Multi-user CLI with networking
# rescue.target       - Single user mode
# emergency.target    - Minimal shell, filesystem read-only

# Change default target
sudo systemctl set-default multi-user.target
```

### Analyzing Boot Time

```bash
# Overall boot time breakdown
systemd-analyze

# Per-service timing
systemd-analyze blame

# Dependency chain (critical path)
systemd-analyze critical-chain

# Generate SVG timeline (requires graphical environment or file viewer)
systemd-analyze plot > /tmp/boot-timeline.svg
```

Example output:
```text
Startup finished in 3.682s (firmware) + 2.169s (loader) + 1.873s (kernel) + 8.241s (userspace) = 15.966s
graphical.target reached after 8.189s in userspace
```

### Service Dependencies

```bash
# See what a service wants/requires
systemctl show networking.service --property=Wants,Requires,After,Before

# View the dependency tree for a target
systemctl list-dependencies graphical.target

# See failed units from this boot
systemctl --failed
```

## Stage 6: Login Manager

The final stage of a graphical boot is the display manager (login screen). On Ubuntu with GNOME this is typically GDM3.

```bash
# Check display manager status
systemctl status gdm

# For headless servers, the getty service handles console login
systemctl status getty@tty1

# View active login sessions
loginctl list-sessions
```

## Boot Troubleshooting

### Accessing GRUB Recovery Mode

If the system won't boot, hold Shift during boot to display the GRUB menu. Select "Advanced options for Ubuntu" then "recovery mode." This boots into a minimal rescue environment.

### Editing Kernel Parameters at Boot

At the GRUB menu, press `e` to edit the boot entry. Find the line starting with `linux` and append parameters. Press Ctrl+X to boot with those parameters.

Useful parameters:
- `systemd.unit=rescue.target` - boot to rescue mode
- `init=/bin/bash` - boot directly to a bash shell (root access)
- `nomodeset` - disable kernel mode setting (GPU issues)
- `ro single` - read-only single-user mode

### Reading Previous Boot Logs

```bash
# List available boot logs
journalctl --list-boots

# Read a specific previous boot (0 = current, -1 = last, etc.)
journalctl --boot=-1

# See why a unit failed in the last boot
journalctl --boot=-1 -u nginx.service
```

### Common Boot Failures

**GRUB rescue prompt** - GRUB can't find its configuration. This usually means the disk layout changed or the boot partition is corrupted. Boot from a live USB and run `grub-install` and `update-grub`.

**Kernel panic** - The kernel encountered an unrecoverable error. Note the function names in the stack trace and check `dmesg` from the previous boot if possible.

**systemd hangs at a target** - Usually a service with `Type=oneshot` or a dependency loop. Boot to rescue mode and use `systemctl status` to identify the offending unit.

The Linux boot process, while appearing complex, follows a logical progression from firmware to bootloader to kernel to userspace. Each stage can be inspected, modified, and debugged independently, making it approachable even when things go wrong.
