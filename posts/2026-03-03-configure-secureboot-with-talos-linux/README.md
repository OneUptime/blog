# How to Configure SecureBoot with Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, SecureBoot, UEFI, Security, Hardware Security

Description: Step-by-step guide to enabling and configuring UEFI SecureBoot with Talos Linux for hardware-level boot integrity verification.

---

SecureBoot creates a chain of trust from your hardware firmware all the way to the operating system. When enabled, the UEFI firmware verifies that every piece of code executed during the boot process is cryptographically signed by a trusted authority. For Talos Linux, this means the bootloader, kernel, and initramfs are all verified before they run, preventing boot-level attacks like rootkits and bootkits.

Talos Linux has supported SecureBoot since version 1.5, and the process for enabling it has become increasingly straightforward. This guide covers the setup from start to finish.

## Why SecureBoot Matters for Talos Linux

Talos Linux already provides an immutable, read-only root filesystem. But without SecureBoot, an attacker with physical access could replace the kernel or bootloader with a compromised version. SecureBoot closes this gap by ensuring that only signed code runs during boot.

The combination of SecureBoot and Talos Linux's immutable design creates a strong security posture:

1. UEFI firmware only boots signed bootloaders (SecureBoot)
2. The bootloader only loads signed kernels (SecureBoot chain)
3. The kernel mounts a verified, read-only filesystem (Talos)
4. The OS only accepts changes through authenticated API calls (mTLS)

## Prerequisites

Before configuring SecureBoot, verify that your hardware supports it:

- UEFI firmware with SecureBoot capability
- TPM 2.0 module (recommended but not strictly required)
- Access to UEFI firmware settings
- Talos Linux v1.5.0 or later

```bash
# Check current Talos version
talosctl -n 10.0.1.10 version

# Check if the node is using UEFI boot
talosctl -n 10.0.1.10 read /sys/firmware/efi/fw_platform_size
# If this returns a value, the system is using UEFI
```

## Understanding the SecureBoot Key Hierarchy

SecureBoot uses a hierarchy of keys:

- **PK (Platform Key)**: The root of trust, owned by the hardware vendor. Only one PK can exist.
- **KEK (Key Exchange Key)**: Authorized to update the signature database. Can be multiple.
- **db (Signature Database)**: Contains certificates of trusted signing authorities.
- **dbx (Forbidden Signature Database)**: Contains hashes or certificates of explicitly untrusted code.

For Talos Linux, you have two options:

1. **Use Talos-signed images**: Talos provides pre-signed SecureBoot images that work with the standard Microsoft UEFI CA chain.
2. **Use custom keys**: Enroll your own keys for full control over the trust chain.

## Option 1: Using Talos SecureBoot Images

This is the simpler approach. Talos provides SecureBoot-enabled images signed with their own keys.

### Download the SecureBoot Image

```bash
# Download the SecureBoot ISO from the Talos Image Factory
# Visit https://factory.talos.dev and select SecureBoot option

# Or use the command line
wget https://factory.talos.dev/image/SCHEMATIC_ID/v1.9.0/metal-amd64-secureboot.iso
```

### Enroll Talos Keys in UEFI

Before booting the SecureBoot image, you need to enroll the Talos signing keys in your UEFI firmware.

```bash
# The Talos SecureBoot ISO includes an enrollment utility
# Boot from the ISO in UEFI setup mode

# Alternatively, enroll keys manually:
# 1. Enter UEFI firmware settings (usually F2/Del during boot)
# 2. Navigate to Security > Secure Boot
# 3. Clear all existing keys (enter Setup Mode)
# 4. Enroll the Talos keys from the ISO
```

Talos also supports automatic key enrollment through the machine configuration:

```yaml
# Machine configuration for SecureBoot
machine:
  install:
    disk: /dev/sda
    image: factory.talos.dev/installer-secureboot/SCHEMATIC_ID:v1.9.0
    bootloader: true
    wipe: true
  secureboot:
    enrollKeys: true  # Automatically enroll SecureBoot keys
```

### Boot and Verify

```bash
# After installing with the SecureBoot image, verify SecureBoot is active
talosctl -n 10.0.1.10 dmesg | grep -i "secure boot"

# Check SecureBoot status from the kernel
talosctl -n 10.0.1.10 read /sys/firmware/efi/efivars/SecureBoot-*
```

## Option 2: Using Custom Keys

For maximum control, generate and enroll your own SecureBoot keys.

### Generate Custom Keys

```bash
# Create a directory for your keys
mkdir -p secureboot-keys && cd secureboot-keys

# Generate the Platform Key (PK)
openssl req -new -x509 -newkey rsa:2048 -sha256 \
  -days 3650 -nodes \
  -subj "/CN=My Platform Key" \
  -keyout PK.key -out PK.crt

# Generate the Key Exchange Key (KEK)
openssl req -new -x509 -newkey rsa:2048 -sha256 \
  -days 3650 -nodes \
  -subj "/CN=My Key Exchange Key" \
  -keyout KEK.key -out KEK.crt

# Generate the Signature Database key (db)
openssl req -new -x509 -newkey rsa:2048 -sha256 \
  -days 3650 -nodes \
  -subj "/CN=My Signature Database Key" \
  -keyout db.key -out db.crt
```

### Sign the Talos Boot Files

```bash
# Download the unsigned Talos boot files
# You need: the EFI bootloader, kernel, and initramfs

# Sign the bootloader
sbsign --key db.key --cert db.crt \
  --output signed-bootx64.efi \
  bootx64.efi

# Sign the kernel
sbsign --key db.key --cert db.crt \
  --output signed-vmlinuz \
  vmlinuz

# Verify the signatures
sbverify --cert db.crt signed-bootx64.efi
sbverify --cert db.crt signed-vmlinuz
```

### Enroll Custom Keys

```bash
# Convert certificates to EFI signature list format
cert-to-efi-sig-list -g "$(uuidgen)" PK.crt PK.esl
cert-to-efi-sig-list -g "$(uuidgen)" KEK.crt KEK.esl
cert-to-efi-sig-list -g "$(uuidgen)" db.crt db.esl

# Sign the signature lists
sign-efi-sig-list -g "$(uuidgen)" -k PK.key -c PK.crt PK PK.esl PK.auth
sign-efi-sig-list -g "$(uuidgen)" -k PK.key -c PK.crt KEK KEK.esl KEK.auth
sign-efi-sig-list -g "$(uuidgen)" -k KEK.key -c KEK.crt db db.esl db.auth
```

### Use Custom Keys with Talos Image Factory

The Talos Image Factory can build images signed with your custom keys:

```yaml
# Schematic for custom SecureBoot image
customization:
  secureboot:
    enrollKeys: true
    keys:
      pk:
        cert: <base64-encoded-PK-cert>
      kek:
        cert: <base64-encoded-KEK-cert>
      db:
        cert: <base64-encoded-db-cert>
        key: <base64-encoded-db-key>
```

## Configuring Talos for SecureBoot

Update your machine configuration to use SecureBoot settings.

```yaml
# Machine configuration with SecureBoot
machine:
  install:
    disk: /dev/sda
    image: factory.talos.dev/installer-secureboot/SCHEMATIC_ID:v1.9.0
    bootloader: true
  features:
    secureboot: true
```

Apply the configuration:

```bash
# Apply to a new node
talosctl apply-config --insecure \
  --nodes 10.0.1.10 \
  --file secureboot-config.yaml

# For existing nodes, this requires a reinstall
# because the boot partition structure changes
talosctl -n 10.0.1.10 upgrade \
  --image factory.talos.dev/installer-secureboot/SCHEMATIC_ID:v1.9.0
```

## Verifying SecureBoot Status

After booting with SecureBoot enabled, verify the configuration.

```bash
# Check SecureBoot is enabled
talosctl -n 10.0.1.10 dmesg | grep -i "secure"

# Check the boot mode
talosctl -n 10.0.1.10 get securitystate

# Verify through kernel parameters
talosctl -n 10.0.1.10 read /sys/firmware/efi/efivars/SecureBoot-8be4df61-93ca-11d2-aa0d-00e098032b8c
# Output should indicate SecureBoot is active
```

## Handling SecureBoot During Upgrades

When upgrading Talos Linux with SecureBoot enabled, the new images must also be signed.

```bash
# Upgrade using a SecureBoot image
talosctl -n 10.0.1.10 upgrade \
  --image factory.talos.dev/installer-secureboot/SCHEMATIC_ID:v1.9.1

# The upgrade process:
# 1. Downloads the new signed image
# 2. Verifies the signature matches the enrolled keys
# 3. Writes the new image to the boot partition
# 4. Reboots the node
# 5. UEFI verifies the new boot files before executing them
```

If you are using custom keys, you need to sign each new Talos release before upgrading.

## Troubleshooting SecureBoot

### Boot Fails After Enabling SecureBoot

```bash
# Common cause: keys not properly enrolled
# Solution: Enter UEFI settings and verify key enrollment

# Check if the firmware is in Setup Mode or User Mode
# Setup Mode = keys not enrolled, SecureBoot inactive
# User Mode = keys enrolled, SecureBoot active
```

### Unsigned Module Errors

```bash
# If kernel modules fail to load due to signature verification
# This is expected behavior - only signed modules should load

# Check dmesg for module loading errors
talosctl -n 10.0.1.10 dmesg | grep -i "module"
```

### Key Enrollment Fails

Some UEFI firmware implementations have quirks with key enrollment. If automatic enrollment fails:

1. Enter UEFI setup manually
2. Clear all SecureBoot keys to enter Setup Mode
3. Enroll keys manually through the UEFI interface
4. Enable SecureBoot
5. Boot the signed Talos image

## Integrating with TPM 2.0

For additional security, combine SecureBoot with TPM 2.0 measured boot.

```yaml
# Machine configuration with TPM support
machine:
  install:
    disk: /dev/sda
  features:
    secureboot: true
  systemDiskEncryption:
    state:
      provider: luks2
      keys:
        - slot: 0
          tpm: {}
    ephemeral:
      provider: luks2
      keys:
        - slot: 0
          tpm: {}
```

With TPM-sealed encryption, the disk encryption keys are bound to the SecureBoot state. If someone tampers with the boot chain, the TPM will refuse to release the encryption keys, preventing access to the disk.

## Conclusion

SecureBoot adds a critical layer of hardware-rooted trust to Talos Linux clusters. Whether you use Talos-signed images for simplicity or custom keys for maximum control, the result is a verified boot chain that prevents tampering with the operating system before it starts. Combined with Talos Linux's immutable filesystem and API-only management, SecureBoot makes your nodes significantly more resistant to physical and firmware-level attacks. Start with the pre-signed images to get familiar with the process, and consider moving to custom keys if your security requirements demand full control over the trust chain.
