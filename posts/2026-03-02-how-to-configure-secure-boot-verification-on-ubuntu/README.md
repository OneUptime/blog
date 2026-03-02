# How to Configure Secure Boot Verification on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Secure Boot, UEFI, Hardening

Description: Guide to verifying and configuring Secure Boot on Ubuntu, understanding the signing chain, managing MOK keys, and troubleshooting Secure Boot failures with custom kernels or drivers.

---

Secure Boot is a UEFI firmware feature that verifies the digital signature of bootloaders and kernels before executing them. It ensures that the system boots only software that has been signed by a trusted key, protecting against bootkits, rootkits, and other pre-OS malware that could compromise the system before the operating system loads.

Ubuntu has supported Secure Boot since 12.04, using a shim bootloader signed by Microsoft to chain-trust to Canonical's own signing keys.

## Understanding the Secure Boot Chain

The trust chain on an Ubuntu system with Secure Boot:

1. **UEFI firmware** checks the signature of the bootloader against keys in the Secure Boot database (db)
2. **shim** (signed by Microsoft) is the first stage bootloader
3. **shim** verifies GRUB's signature against Canonical's key (embedded in shim) or Machine Owner Keys (MOK)
4. **GRUB** verifies the Linux kernel's signature
5. **Linux kernel** verifies signed kernel modules (via `CONFIG_MODULE_SIG_FORCE` if enabled)

Breaking any link in this chain causes a Secure Boot failure and prevents booting.

## Checking Secure Boot Status

```bash
# Check if Secure Boot is currently enabled
sudo mokutil --sb-state
# Expected output: SecureBoot enabled

# Or use bootctl
sudo bootctl status | grep -i secure

# Alternative: check via EFI variables
cat /sys/firmware/efi/vars/SecureBoot-8be4df61-93ca-11d2-aa0d-00e098032b8c/data | \
  od -An -tu1 | awk '{print $NF}'
# Output of 1 means Secure Boot is enabled

# More readable check
dmesg | grep -i 'secure boot\|secureboot'
```

## The shim and MOK System

The Machine Owner Key (MOK) database is a secondary trust database managed by the `shim` bootloader. It allows system owners to add their own signing keys without modifying the UEFI firmware's trust database.

This is particularly important for:
- Third-party drivers (like NVIDIA drivers) that are not signed by a distribution key
- Custom kernels you compile yourself
- DKMS modules built locally

### Viewing Current MOK Entries

```bash
# List all keys in the MOK database
sudo mokutil --list-enrolled

# List pending MOK enrollments
sudo mokutil --list-new

# Check if a specific key is enrolled
sudo mokutil --test-key /path/to/certificate.pem
```

## Managing Secure Boot Keys for Custom Drivers

Ubuntu uses DKMS (Dynamic Kernel Module Support) to build kernel modules. When Secure Boot is enabled, DKMS-built modules must be signed.

### Setting Up Signing Keys

Ubuntu automatically handles this for officially supported drivers. For custom modules:

```bash
# Install the tools needed for signing
sudo apt-get install -y mokutil openssl sbsigntool

# Check if a signing key already exists
ls /var/lib/shim-signed/mok/
```

If you need to create your own signing key:

```bash
# Create directory for keys
sudo mkdir -p /root/mok

# Generate a private key and self-signed certificate
sudo openssl req -new -x509 \
  -newkey rsa:2048 \
  -keyout /root/mok/mok.priv \
  -out /root/mok/mok.pem \
  -days 36500 \
  -subj "/CN=Custom MOK Key $(hostname)/" \
  -nodes

# Convert to DER format for UEFI enrollment
sudo openssl x509 \
  -in /root/mok/mok.pem \
  -outform DER \
  -out /root/mok/mok.der

# Restrict key file permissions
sudo chmod 600 /root/mok/mok.priv
sudo chmod 644 /root/mok/mok.pem /root/mok/mok.der
```

### Enrolling the Key in MOK

```bash
# Stage the key for enrollment
# You will be prompted to set a one-time enrollment password
sudo mokutil --import /root/mok/mok.der

# Reboot - the shim MOK Manager will appear at next boot
# Enter the enrollment password to confirm the key enrollment
sudo reboot

# After reboot, verify the key is enrolled
sudo mokutil --list-enrolled | grep -A 5 "Custom MOK"
```

### Signing a Kernel Module

```bash
# Sign a kernel module with your MOK key
sudo /usr/src/linux-headers-$(uname -r)/scripts/sign-file \
  sha256 \
  /root/mok/mok.priv \
  /root/mok/mok.pem \
  /path/to/your-module.ko

# Verify the signature
sudo /usr/src/linux-headers-$(uname -r)/scripts/extract-module-sig.pl \
  -i /path/to/your-module.ko

# Or using modinfo
modinfo /path/to/your-module.ko | grep -i sig
```

## Configuring DKMS to Auto-Sign Modules

For DKMS to automatically sign modules it builds with Secure Boot active:

```bash
# Configure DKMS to use your signing key
sudo tee /etc/dkms/framework.conf.d/signing.conf <<EOF
# Use custom signing key for DKMS-built modules
mok_signing_key=/root/mok/mok.priv
mok_certificate=/root/mok/mok.pem
sign_tool=/usr/lib/linux/dkms-sign-module
EOF
```

For the NVIDIA driver (a common use case):

```bash
# Install NVIDIA driver - DKMS handles signing automatically
sudo apt-get install -y nvidia-driver-535

# If Secure Boot is enabled, you may be prompted to set a MOK enrollment password
# After reboot, enroll the key in the UEFI MOK Manager
```

## Verifying Kernel and Module Signatures

```bash
# Check if the running kernel is signed
sudo sbverify --cert /usr/share/shim-signed/shim.pem \
  /boot/vmlinuz-$(uname -r)

# Check module signing enforcement level
cat /sys/module/module/parameters/sig_enforce
# 0 = signing not enforced (but verified when sig present)
# 1 = all modules must be signed

# List loaded modules and their signature status
grep -r 'taint\|unsigned' /sys/module/*/taint 2>/dev/null | head -20

# More detailed: check if any unsigned modules are loaded
dmesg | grep -i 'module.*signature\|unsigned module'
```

## Enabling Module Signature Enforcement

Beyond just verifying signatures, you can require all kernel modules to be signed:

```bash
# Check current state
cat /sys/module/module/parameters/sig_enforce

# Enable enforcement temporarily (takes effect for the current boot)
sudo sh -c 'echo 1 > /sys/module/module/parameters/sig_enforce'

# To make permanent, add kernel parameter in GRUB
sudo nano /etc/default/grub
```

Add `module.sig_enforce=1` to `GRUB_CMDLINE_LINUX_DEFAULT`:

```
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash module.sig_enforce=1"
```

```bash
sudo update-grub
```

**Caution**: This prevents any unsigned module from loading, including any third-party drivers that have not been signed. Verify all your modules are signed before enforcing this.

## Disabling Secure Boot

On some systems (development machines, systems with incompatible hardware), you may need to disable Secure Boot:

```bash
# Check if Secure Boot can be disabled from the OS
sudo mokutil --disable-validation
# This requires a reboot and confirmation in the MOK Manager

# For full disable, use your system's UEFI setup utility (typically F2 or DEL at boot)
```

Note that disabling Secure Boot is a security trade-off. On servers, Secure Boot should remain enabled where the hardware supports it.

## Troubleshooting Secure Boot Issues

### System Won't Boot After Kernel Update

```bash
# Boot from a live USB and check the GRUB configuration
# Or boot into recovery mode

# Verify the new kernel is signed
sbverify --cert /usr/share/shim-signed/shim.pem /boot/vmlinuz-X.Y.Z

# If signature verification fails, the kernel package may not have shipped with a signature
# Reinstall the kernel package
sudo apt-get install --reinstall linux-image-$(uname -r)
```

### Module Fails to Load with Signature Error

```bash
# Check dmesg for signature errors
sudo dmesg | grep -i 'key\|signature\|module'

# Common error:
# module: module.ko: module verification failed: signature and/or required key missing

# Sign the module with your MOK key (see above)
# Or check if the module is in DKMS and rebuild with signing
sudo dkms status
sudo dkms autoinstall
```

### Verifying the Full Boot Chain

```bash
# Check that shim is present and is the active bootloader
ls -la /boot/efi/EFI/ubuntu/

# Verify grub is signed
sbverify --cert /usr/share/shim-signed/shim.pem \
  /boot/efi/EFI/ubuntu/grubx64.efi

# Check the UEFI boot order
sudo efibootmgr -v

# Ensure 'ubuntu' is in the boot order and points to shim
sudo efibootmgr -v | grep -i 'ubuntu\|shim'
```

## Secure Boot and Full Disk Encryption

Secure Boot pairs well with LUKS full disk encryption, but the combination requires care:

```bash
# Check if LUKS is configured
lsblk -o NAME,TYPE,FSTYPE | grep crypt

# With Secure Boot + LUKS, even if someone boots from external media,
# they still cannot decrypt the drive without the key
# Secure Boot ensures the decryption password is only requested
# by a trusted, unmodified bootloader
```

For the strongest protection, enable both Secure Boot and LUKS encryption. Secure Boot prevents bootkit-level attacks, and LUKS protects data if the drive is physically removed.

Secure Boot is a hardware-anchored trust mechanism. When properly configured with enrolled MOK keys for any custom modules and combined with kernel module signing enforcement, it significantly raises the bar for low-level persistent threats on Ubuntu servers.
