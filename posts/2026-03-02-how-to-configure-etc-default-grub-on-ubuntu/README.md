# How to Configure /etc/default/grub on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, GRUB, Boot, Linux, System Administration

Description: Learn how to configure /etc/default/grub on Ubuntu to customize boot parameters, kernel options, timeouts, and boot behavior for your systems.

---

The GRUB bootloader controls the early boot process on Ubuntu systems. While most users never need to touch it, system administrators regularly find themselves tweaking GRUB settings to adjust boot timeouts, add kernel parameters, configure console output for headless servers, or troubleshoot boot issues. All of this is done through `/etc/default/grub`, which acts as the main configuration interface for GRUB on Ubuntu.

## How GRUB Configuration Works on Ubuntu

Ubuntu uses a two-level GRUB configuration system:

1. `/etc/default/grub` - The user-facing configuration file where you set variables
2. `/boot/grub/grub.cfg` - The actual GRUB configuration used at boot time, auto-generated from templates

You should never edit `/boot/grub/grub.cfg` directly. Instead, edit `/etc/default/grub` and run `update-grub` to regenerate it:

```bash
# After any change to /etc/default/grub, always run this
sudo update-grub
```

## Viewing the Current Configuration

```bash
cat /etc/default/grub
```

A default Ubuntu installation typically shows something like this:

```bash
# If you change this file, run 'update-grub' afterwards to update
# /boot/grub/grub.cfg.

GRUB_DEFAULT=0
GRUB_TIMEOUT_STYLE=hidden
GRUB_TIMEOUT=0
GRUB_DISTRIBUTOR=`lsb_release -i -s 2> /dev/null || echo Debian`
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash"
GRUB_CMDLINE_LINUX=""
```

## Key Configuration Variables

### GRUB_DEFAULT

Controls which menu entry is selected by default:

```bash
# Boot the first entry (most common)
GRUB_DEFAULT=0

# Boot a specific entry by name
GRUB_DEFAULT="Ubuntu, with Linux 6.8.0-52-generic"

# Remember the last OS selected (useful for dual-boot systems)
GRUB_DEFAULT=saved
GRUB_SAVEDEFAULT=true
```

### GRUB_TIMEOUT and GRUB_TIMEOUT_STYLE

Controls how long GRUB waits before booting:

```bash
# Show the menu for 5 seconds
GRUB_TIMEOUT=5
GRUB_TIMEOUT_STYLE=menu

# Hide the menu but still wait 5 seconds (press Shift/Esc to show menu)
GRUB_TIMEOUT=5
GRUB_TIMEOUT_STYLE=hidden

# Boot immediately with no delay (not recommended for single-OS production systems)
GRUB_TIMEOUT=0
GRUB_TIMEOUT_STYLE=hidden
```

On desktop systems, showing the menu with a short timeout is helpful for recovery. On servers and headless machines, `hidden` with a reasonable timeout (like 3-5 seconds) lets you interrupt boot if needed while not wasting time on normal boots.

### GRUB_CMDLINE_LINUX_DEFAULT

Kernel parameters added to normal (non-recovery) boot entries:

```bash
# Default Ubuntu desktop - quiet boot with splash screen
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash"

# Server - remove quiet/splash for verbose boot messages
GRUB_CMDLINE_LINUX_DEFAULT=""

# Add specific parameters
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash intel_iommu=on"
```

### GRUB_CMDLINE_LINUX

Kernel parameters added to ALL boot entries, including recovery mode:

```bash
# This applies to every kernel including recovery
GRUB_CMDLINE_LINUX=""

# Example: force consistent network interface naming
GRUB_CMDLINE_LINUX="net.ifnames=0 biosdevname=0"
```

## Common Configuration Use Cases

### Headless Server - Serial Console

For servers managed over a serial port or IPMI console:

```bash
sudo nano /etc/default/grub
```

```bash
GRUB_DEFAULT=0
GRUB_TIMEOUT_STYLE=menu
GRUB_TIMEOUT=5
GRUB_CMDLINE_LINUX_DEFAULT=""
GRUB_CMDLINE_LINUX="console=tty0 console=ttyS0,115200n8"
GRUB_TERMINAL="console serial"
GRUB_SERIAL_COMMAND="serial --speed=115200 --unit=0 --word=8 --parity=no --stop=1"
```

```bash
sudo update-grub
```

### Disabling Spectre/Meltdown Mitigations for Performance

Some workloads take a measurable hit from CPU vulnerability mitigations. Only disable these if you understand the security implications:

```bash
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash mitigations=off"
```

### Enabling IOMMU for PCI Passthrough

Required for virtualization setups that pass physical PCIe devices to VMs:

```bash
# For Intel systems
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash intel_iommu=on iommu=pt"

# For AMD systems
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash amd_iommu=on iommu=pt"
```

### Troubleshooting Boot Issues - Verbose Mode

When a system fails to boot cleanly, removing `quiet` and `splash` shows what's happening:

```bash
GRUB_CMDLINE_LINUX_DEFAULT=""
```

Or add `debug` for even more output:

```bash
GRUB_CMDLINE_LINUX_DEFAULT="debug"
```

### Older Graphics Drivers

If you're having display issues with a particular GPU or need to force a specific framebuffer:

```bash
# Force VESA framebuffer
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash nomodeset"

# Specify framebuffer resolution
GRUB_GFXMODE=1920x1080x32
GRUB_GFXPAYLOAD_LINUX=keep
```

### Network Interface Naming

Ubuntu uses predictable interface names like `enp3s0` by default. If you need the old `eth0` style names:

```bash
GRUB_CMDLINE_LINUX="net.ifnames=0 biosdevname=0"
```

## Applying Changes

After every edit to `/etc/default/grub`:

```bash
# Regenerate the actual GRUB config
sudo update-grub

# Verify the output looks correct
sudo grep -A 5 "menuentry" /boot/grub/grub.cfg | head -30

# Check the generated kernel command line
grep "linux" /boot/grub/grub.cfg | head -5
```

The `update-grub` command will show you which kernels and entries it found during the update.

## Managing GRUB Password Protection

On shared or kiosk systems, you may want to password-protect GRUB to prevent users from editing boot parameters or booting into recovery mode:

```bash
# Generate an encrypted password hash
grub-mkpasswd-pbkdf2
```

Add the password to GRUB's custom configuration:

```bash
sudo nano /etc/grub.d/40_custom
```

```
set superusers="admin"
password_pbkdf2 admin grub.pbkdf2.sha512.10000.HASH_VALUE_HERE
```

```bash
sudo update-grub
```

## Customizing the GRUB Menu Appearance

```bash
# Set background image (must be in a format GRUB supports)
GRUB_BACKGROUND="/boot/grub/background.png"

# Disable the graphical terminal (fall back to text)
GRUB_TERMINAL=console
```

For themed GRUB menus, the configuration lives in `/boot/grub/themes/` and is referenced via `GRUB_THEME`.

## Dual-Boot Considerations

On dual-boot systems with Windows, Ubuntu's `os-prober` detects Windows automatically. If it's not finding it:

```bash
# Make sure os-prober is installed and enabled
sudo apt install os-prober

# Re-enable it if it was disabled (it's disabled by default in some versions)
echo "GRUB_DISABLE_OS_PROBER=false" | sudo tee -a /etc/default/grub

sudo update-grub
```

## Recovery If GRUB Becomes Misconfigured

If a bad GRUB configuration prevents booting, you can recover from a live Ubuntu USB:

```bash
# Boot from live USB, then mount your system
sudo mount /dev/sda2 /mnt          # Replace with your root partition
sudo mount /dev/sda1 /mnt/boot/efi # For UEFI systems
sudo mount --bind /dev /mnt/dev
sudo mount --bind /proc /mnt/proc
sudo mount --bind /sys /mnt/sys

# Chroot into the system
sudo chroot /mnt

# Fix /etc/default/grub and regenerate
nano /etc/default/grub
update-grub
exit

# Unmount and reboot
sudo umount -R /mnt
sudo reboot
```

Working with GRUB configuration is straightforward as long as you remember the golden rule: always run `update-grub` after changes, and keep a recovery option available (live USB or cloud console) before experimenting with boot parameters.
