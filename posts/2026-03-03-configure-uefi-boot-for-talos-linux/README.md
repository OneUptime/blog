# How to Configure UEFI Boot for Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, UEFI, Secure Boot, Boot Configuration, Kubernetes

Description: A complete guide to configuring UEFI boot settings for Talos Linux including Secure Boot, boot order, and firmware management.

---

UEFI (Unified Extensible Firmware Interface) has replaced legacy BIOS on virtually all modern hardware. Talos Linux fully supports UEFI booting and takes advantage of UEFI features like Secure Boot, GPT partition tables, and fast boot paths. Getting UEFI configuration right is important because it affects security, reliability, and boot speed.

This guide covers everything you need to know about configuring UEFI for Talos Linux, from basic firmware settings through advanced Secure Boot configuration.

## UEFI Fundamentals for Talos Linux

UEFI provides a standardized interface between the operating system and the platform firmware. For Talos Linux, the key UEFI features are:

- **EFI System Partition (ESP)**: A FAT32 partition that stores boot loaders and related files
- **Boot Manager**: UEFI's built-in boot manager that can directly launch EFI executables
- **Secure Boot**: Cryptographic verification of boot components
- **GPT**: GUID Partition Table support for modern disk layouts
- **Variables**: UEFI variables that store boot configuration persistently

Talos Linux uses all of these to provide a secure, reliable boot process.

## Step 1: Access UEFI Firmware Settings

Before installing Talos Linux, configure the UEFI firmware on your machine:

```
Common keys to enter UEFI setup:
- Dell: F2
- HP: F10
- Lenovo: F1 or F2
- Supermicro: Del
- Intel NUC: F2
- ASRock: F2 or Del
- Generic: F2, Del, or Esc
```

Some servers also provide remote firmware management through IPMI/BMC interfaces, which is useful for data center hardware.

## Step 2: Configure Essential UEFI Settings

### Boot Mode

Make sure the firmware is set to UEFI boot mode, not Legacy/CSM:

```
Boot Mode: UEFI (not Legacy, not CSM, not Hybrid)
```

If your firmware offers a "CSM" (Compatibility Support Module) option, disable it. CSM provides legacy BIOS compatibility but can interfere with UEFI boot.

### Boot Order

Set the boot order to match your deployment method:

For USB installation:
```
1. USB Drive / Removable Media
2. Internal SSD / NVMe
3. Network / PXE
```

For PXE boot:
```
1. Network / PXE (IPv4)
2. Internal SSD / NVMe
```

For installed systems:
```
1. Internal SSD / NVMe
2. (Optional) Network / PXE for recovery
```

### Secure Boot (Initial Setup)

For the initial installation, you may need to disable Secure Boot temporarily:

```
Secure Boot: Disabled (for initial install)
```

You can enable it later after enrolling the Talos Linux signing keys. We cover this in detail below.

## Step 3: Install Talos Linux with UEFI

Boot from your Talos Linux USB drive or PXE. The UEFI firmware will detect the EFI boot files on the media and start Talos:

```bash
# If using USB, flash the ISO
sudo dd if=metal-amd64.iso of=/dev/sdX bs=4M status=progress conv=fsync

# Boot from USB - the UEFI firmware launches the EFI bootloader
# Talos Linux starts in maintenance mode
```

When you apply the machine configuration, Talos installs itself to the target disk with a UEFI-compatible layout:

```yaml
# Machine configuration for UEFI installation
machine:
  install:
    disk: /dev/nvme0n1
    image: ghcr.io/siderolabs/installer:v1.9.0
    wipe: true
    bootloader: true  # Installs UEFI boot entries
```

```bash
# Apply the configuration
talosctl apply-config --insecure \
  --nodes <NODE_IP> \
  --file controlplane.yaml
```

The installer creates the following disk layout:

```
/dev/nvme0n1:
  ├── p1: EFI System Partition (260MB, FAT32)
  ├── p2: BIOS Boot Partition (1MB, for legacy compatibility)
  ├── p3: BOOT partition (1GB)
  ├── p4: META partition (variable)
  ├── p5: STATE partition (variable, encrypted)
  └── p6: EPHEMERAL partition (remaining space)
```

## Step 4: Verify UEFI Boot

After installation, verify the system is booting correctly via UEFI:

```bash
# Check for EFI boot messages
talosctl dmesg --nodes <NODE_IP> | grep -i "EFI"

# Expected output includes:
# efi: EFI v2.x by [firmware vendor]
# efi: UEFI boot entries registered

# Verify the ESP is mounted
talosctl ls /boot/EFI/ --nodes <NODE_IP>
```

## Step 5: Configure Secure Boot

Secure Boot verifies that every piece of software loaded during boot is signed by a trusted key. This prevents boot-level malware and unauthorized OS modifications.

### Understanding the Secure Boot Key Hierarchy

```
Platform Key (PK)
  └── Key Exchange Key (KEK)
       └── Signature Database (db)
            ├── Allowed signatures
            └── Talos Linux signing certificate
       └── Forbidden Database (dbx)
            └── Revoked signatures
```

### Enrolling Talos Linux Keys

Talos Linux provides its signing certificates. To enable Secure Boot:

```bash
# Download the Talos signing certificate
wget https://github.com/siderolabs/talos/releases/download/v1.9.0/talos-uki-signing-cert.der
```

Enroll the certificate in your UEFI firmware:

1. Enter UEFI setup
2. Navigate to Secure Boot configuration
3. Go to the Signature Database (db)
4. Add the Talos signing certificate
5. Enable Secure Boot
6. Save and exit

Some firmware requires certificates in DER format, others in PEM. Convert if needed:

```bash
# Convert PEM to DER
openssl x509 -in talos-uki-signing-cert.pem -outform DER -out talos-uki-signing-cert.der

# Convert DER to PEM
openssl x509 -in talos-uki-signing-cert.der -inform DER -out talos-uki-signing-cert.pem
```

### Using Custom Secure Boot Keys

For organizations that want full control over their Secure Boot chain:

```bash
# Generate a Platform Key (PK)
openssl req -new -x509 -newkey rsa:2048 \
  -keyout PK.key -out PK.crt -days 3650 -nodes \
  -subj "/CN=My Platform Key"

# Generate a Key Exchange Key (KEK)
openssl req -new -x509 -newkey rsa:2048 \
  -keyout KEK.key -out KEK.crt -days 3650 -nodes \
  -subj "/CN=My Key Exchange Key"

# Generate a database key (db)
openssl req -new -x509 -newkey rsa:2048 \
  -keyout db.key -out db.crt -days 3650 -nodes \
  -subj "/CN=My Signature Database Key"

# Sign the Talos UKI with your db key
# Then enroll PK, KEK, and db in the firmware
```

Build Talos images signed with your keys:

```bash
# Build a Talos image with custom signing
docker run --rm \
  -v $(pwd)/_out:/out \
  -v $(pwd)/db.key:/keys/db.key \
  -v $(pwd)/db.crt:/keys/db.crt \
  ghcr.io/siderolabs/imager:v1.9.0 metal \
  --arch amd64 \
  --uki-signing-key-path /keys/db.key \
  --uki-signing-cert-path /keys/db.crt
```

## Managing UEFI Boot Entries

UEFI maintains a list of boot entries in non-volatile variables. You can manage these through Talos:

```bash
# View current boot information from dmesg
talosctl dmesg --nodes <NODE_IP> | grep -i "boot"
```

On a standard Linux machine (for preparing firmware before Talos install), you can use `efibootmgr`:

```bash
# List current boot entries
efibootmgr -v

# Create a new boot entry
efibootmgr --create \
  --disk /dev/sda \
  --part 1 \
  --label "Talos Linux" \
  --loader '\EFI\systemd\systemd-bootx64.efi'

# Change boot order
efibootmgr --bootorder 0001,0002,0003
```

## UEFI Network Boot Configuration

Configure UEFI for PXE network booting:

```
UEFI Network Stack: Enabled
IPv4 PXE Support: Enabled
IPv6 PXE Support: Disabled (unless needed)
PXE Boot Order: Before or after disk, depending on your preference
```

For UEFI PXE, the DHCP server needs to provide the correct EFI boot file:

```bash
# In your DHCP configuration, serve the UEFI PXE file
# For ISC DHCP:
if option arch = 00:07 or option arch = 00:09 {
    filename "talos/ipxe-amd64.efi";
}
```

## UEFI Runtime Services

Talos Linux interacts with UEFI runtime services for several functions:

```bash
# UEFI provides:
# - Real-time clock access
# - Variable storage (for boot configuration)
# - Capsule updates (for firmware updates)
# - Reset/shutdown services

# Check UEFI runtime status
talosctl dmesg --nodes <NODE_IP> | grep -i "uefi\|runtime"
```

## Firmware Updates

Some UEFI firmware can be updated from the OS. While Talos Linux does not directly support firmware updates through its API, you can:

1. Boot a standard Linux USB to perform firmware updates
2. Use the BMC/IPMI interface for remote firmware updates
3. Schedule firmware updates during maintenance windows before installing Talos

```bash
# Check current firmware version from Talos
talosctl dmesg --nodes <NODE_IP> | grep -i "SMBIOS\|DMI\|BIOS"
```

## Troubleshooting UEFI Boot Issues

### System Boots to UEFI Shell

If the system drops to an EFI shell instead of booting Talos:

```bash
# From the EFI shell, try to boot manually
Shell> fs0:
fs0:\> ls EFI\Linux\
fs0:\> EFI\Linux\talos-A.efi

# If that works, the boot order needs to be fixed
# Enter UEFI setup and correct the boot order
```

### Secure Boot Failure

```bash
# If you see "Security Violation" during boot:
# 1. Enter UEFI setup
# 2. Check that the Talos signing certificate is enrolled
# 3. Or temporarily disable Secure Boot to diagnose

# Verify the UKI is signed correctly
# On a workstation:
pesign -S -i talos-A.efi
```

### Boot Partition Not Found

```bash
# If the firmware cannot find the ESP:
# 1. The ESP may be missing or corrupted
# 2. The partition type GUID may be wrong (should be EFI System Partition)

# Boot from USB and check the partition table
talosctl disks --insecure --nodes <NODE_IP>
```

### Slow UEFI Boot

Some firmware runs extensive hardware checks during boot. To speed things up:

```
Quick Boot: Enabled
Fast Boot: Enabled
POST Delay: 0 seconds
Memory Test: Disabled (or Minimal)
Boot Logo: Disabled
```

## Best Practices

1. **Always use UEFI mode**: Avoid legacy BIOS/CSM unless your hardware does not support UEFI
2. **Enable Secure Boot in production**: It adds a meaningful security layer
3. **Keep firmware updated**: Firmware updates often fix UEFI bugs and security vulnerabilities
4. **Use GPT partitioning**: It is the standard for UEFI and supports large disks
5. **Document firmware settings**: Different hardware vendors have different UEFI implementations, so document what works for each model
6. **Set up remote management**: IPMI/BMC access lets you change UEFI settings without physical access

## Conclusion

Properly configuring UEFI is the foundation of a secure and reliable Talos Linux deployment. UEFI provides the modern boot infrastructure that Talos Linux needs for features like Secure Boot, Unified Kernel Images, and fast boot times. Taking the time to configure UEFI correctly - including boot order, Secure Boot keys, and network boot settings - pays dividends in security and operational reliability across your Kubernetes cluster.
