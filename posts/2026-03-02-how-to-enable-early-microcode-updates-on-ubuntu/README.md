# How to Enable Early Microcode Updates on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Kernel, Security, CPU, Microcode

Description: Configure early microcode updates on Ubuntu to apply CPU firmware patches before the kernel initializes, protecting against CPU vulnerabilities like Spectre and Meltdown.

---

CPU microcode is firmware that runs inside your processor, controlling low-level instruction execution. CPU vendors (Intel and AMD) regularly release microcode updates that fix bugs, add features, and patch security vulnerabilities. Ubuntu supports applying these updates early in the boot process - before the Linux kernel fully initializes - providing maximum protection from the start.

## Why Early Microcode Matters

Microcode can be applied at two points:

1. **BIOS/UEFI level** - Loaded by firmware before the OS boots
2. **Early OS level** - Loaded by the kernel during initramfs, before most drivers initialize
3. **Late OS level** - Loaded after the kernel and drivers are running

Early loading is preferred because:
- Some CPU vulnerabilities can be exploited before late microcode loads
- Hardware errata fixed by microcode affect driver behavior, so applying it early prevents issues
- It ensures consistent behavior regardless of BIOS microcode version

## Checking Current Microcode Version

Before updating, see what microcode version is currently running:

```bash
# Check current microcode version
grep microcode /proc/cpuinfo | head -5
# Example output: microcode : 0xf4

# More detailed CPU and microcode information
cat /proc/cpuinfo | grep -E "vendor_id|model name|microcode" | sort -u

# For Intel CPUs, check via MSR (model-specific registers)
sudo rdmsr -a 0x8b 2>/dev/null | head -5

# For AMD CPUs
grep -i "amd" /proc/cpuinfo | head -2
```

## Installing Microcode Packages

Ubuntu provides microcode packages for both Intel and AMD processors:

```bash
# For Intel processors
sudo apt update
sudo apt install intel-microcode

# For AMD processors
sudo apt install amd64-microcode

# Install both (won't hurt - the wrong one just won't apply)
sudo apt install intel-microcode amd64-microcode
```

These packages include microcode firmware files and hooks that integrate with the initramfs to enable early loading.

## Verifying Early Load is Configured

After installation, the packages should automatically configure early loading:

```bash
# Check that the microcode initramfs hook is installed
ls /etc/initramfs-tools/hooks/ | grep micro

# Check if microcode files are in the initramfs
lsinitramfs /boot/initrd.img-$(uname -r) | grep -i micro

# Check the current initramfs for microcode
lsinitramfs /boot/initrd.img-$(uname -r) | grep "kernel/x86/microcode"
```

For GRUB-based systems, early microcode is provided via a separate initrd-like section prepended to the initramfs. Check that GRUB is using it:

```bash
# Look for early microcode in GRUB config
grep -i "initrd\|microcode" /boot/grub/grub.cfg | head -10

# Verify the microcode files exist
ls -la /boot/*microcode* 2>/dev/null
ls -la /lib/firmware/intel-ucode/ 2>/dev/null
ls -la /lib/firmware/amd-ucode/ 2>/dev/null
```

## How the Early Load Works

The microcode early loading mechanism uses a specific section of the initramfs:

```bash
# The initramfs on modern Ubuntu systems is actually two concatenated archives:
# 1. An uncompressed cpio containing the microcode
# 2. The normal compressed initramfs

# Extract and examine both sections
sudo unmkinitramfs /boot/initrd.img-$(uname -r) /tmp/initrd-contents
ls /tmp/initrd-contents/

# The kernel recognizes the uncompressed cpio section with microcode
# and applies it before executing the compressed section's init script
```

The kernel applies microcode in this order:
1. BIOS/UEFI provides base microcode
2. Early initramfs microcode section updates it (if newer)
3. Late userspace load via `/dev/cpu/*/microcode` updates it again

## Manually Triggering initramfs Rebuild

If you install the package but aren't sure if the initramfs was updated:

```bash
# Rebuild initramfs to include the new microcode
sudo update-initramfs -u

# For all kernels
sudo update-initramfs -u -k all

# Verify microcode is now in the initramfs
lsinitramfs /boot/initrd.img-$(uname -r) | grep micro
```

## Checking Microcode Was Applied at Boot

After rebooting, verify the microcode was applied:

```bash
# Check dmesg for microcode update messages
dmesg | grep -i microcode

# Example output for successful early load:
# [    0.000000] microcode: microcode updated early to revision 0xf4, date = 2023-01-10
# [    0.720000] microcode: Current revision: 0xf4
# [    0.720000] microcode: Microcode Update Driver: v2.2.

# For Intel, check the specific revision
dmesg | grep "microcode updated early"

# If you see "updated early", it worked
# If you only see "Current revision" without "updated early", late load is happening
```

```bash
# Check via /proc/cpuinfo after boot
grep "microcode" /proc/cpuinfo | sort -u

# The version should match or exceed what's in your package
dpkg -l intel-microcode | tail -1
```

## Intel Microcode Versions and Security

Intel microcode updates have addressed several major vulnerabilities. Understanding which version you need:

```bash
# Check your Intel CPU model
grep "model name" /proc/cpuinfo | head -1

# Check which microcode version is currently loaded
grep "microcode" /proc/cpuinfo | head -1 | awk '{print $NF}'

# Check vulnerability mitigations status
grep -r "" /sys/devices/system/cpu/vulnerabilities/ 2>/dev/null

# The above shows status of Spectre, Meltdown, etc.
ls /sys/devices/system/cpu/vulnerabilities/
cat /sys/devices/system/cpu/vulnerabilities/spectre_v2
cat /sys/devices/system/cpu/vulnerabilities/meltdown
cat /sys/devices/system/cpu/vulnerabilities/tsx_async_abort
```

## AMD Microcode Updates

AMD microcode works similarly:

```bash
# Check AMD CPU info
grep -E "vendor_id|model name" /proc/cpuinfo | head -2

# AMD microcode files
ls /lib/firmware/amd-ucode/ 2>/dev/null

# Check AMD microcode version
grep microcode /proc/cpuinfo | head -1

# dmesg check
dmesg | grep -i "microcode\|AMD"
```

## Pinning Microcode Versions

In some cases, a specific microcode update may cause performance regressions or compatibility issues. You may need to hold a specific version:

```bash
# Hold the current microcode version (prevent upgrades)
sudo apt-mark hold intel-microcode

# Check held packages
apt-mark showhold

# Unhold when ready to upgrade
sudo apt-mark unhold intel-microcode
```

## Testing Microcode Without Rebooting (Late Load)

For non-critical testing, you can apply a new microcode without rebooting using late loading:

```bash
# Check if late loading is supported
ls /dev/cpu/*/microcode 2>/dev/null || echo "No microcode device found"

# For systems with the device
# (Intel microcode package includes the iucode-tool)
sudo apt install iucode-tool

# Apply microcode without reboot (late load - less protection but useful for testing)
sudo iucode-tool --scan-system --write-earlyfw=/tmp/test-microcode.bin \
    /lib/firmware/intel-ucode/

# Warning: late load doesn't provide full protection
# Always reboot for production security patching
```

## Automating Microcode Updates

Microcode updates should be part of your regular system update process:

```bash
# Create a simple check script
cat << 'EOF' | sudo tee /usr/local/bin/check-microcode
#!/bin/bash
# Check if microcode was applied early at boot

if dmesg | grep -q "microcode updated early"; then
    echo "OK: Microcode was updated early at boot"
    dmesg | grep "microcode updated early"
else
    echo "WARNING: Microcode may not be loading early"
    echo "Current microcode revision:"
    grep "microcode" /proc/cpuinfo | head -1
fi

echo ""
echo "CPU Vulnerability Status:"
for vuln in /sys/devices/system/cpu/vulnerabilities/*; do
    echo "  $(basename $vuln): $(cat $vuln)"
done
EOF

sudo chmod +x /usr/local/bin/check-microcode
sudo /usr/local/bin/check-microcode
```

## Troubleshooting Microcode Loading

**Microcode not updating early:**

```bash
# Check if the package is installed
dpkg -l intel-microcode amd64-microcode 2>/dev/null

# Check initramfs contains microcode
lsinitramfs /boot/initrd.img-$(uname -r) | grep -i micro

# Rebuild and check again
sudo update-initramfs -u -v 2>&1 | grep -i micro

# Check boot messages
journalctl -b | grep -i microcode
```

**Version not changing after update:**

```bash
# After installing updated package, did initramfs rebuild?
# Check file timestamps
ls -la /boot/initrd.img-$(uname -r)
ls -la /lib/firmware/intel-ucode/

# Force rebuild
sudo update-initramfs -u

# Reboot is required for early load
sudo reboot
```

**BIOS microcode is newer:**

This is fine. The kernel will see that the BIOS already applied a newer (or same) version and the early load won't downgrade it. `dmesg` will show the already-current version.

Keeping CPU microcode current is a critical but often overlooked part of system maintenance. The vulnerability mitigations these updates provide - particularly for Spectre class vulnerabilities - depend on having current microcode with early loading enabled.
