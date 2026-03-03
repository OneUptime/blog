# How to Use Unified Kernel Images (UKI) with Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Unified Kernel Images, UKI, Secure Boot, UEFI

Description: Learn how Talos Linux uses Unified Kernel Images for secure, tamper-resistant booting and how to work with them effectively.

---

Unified Kernel Images (UKI) represent a modern approach to Linux booting that bundles the kernel, initramfs, kernel command line, and other boot components into a single signed EFI binary. Talos Linux has adopted UKI as its preferred boot method on UEFI systems, bringing significant security and reliability improvements to Kubernetes node booting.

This guide explains what UKI is, how Talos Linux uses it, and how you can leverage it in your deployments.

## What Is a Unified Kernel Image?

A traditional Linux boot involves multiple separate files:

- The boot loader (GRUB or systemd-boot)
- The kernel (vmlinuz)
- The initramfs (initial filesystem)
- A configuration file with kernel parameters
- Optionally, device tree blobs (for ARM)

These files are stored separately on the boot partition, and the boot loader assembles them at boot time. This separation creates several problems:

- Each file needs to be signed individually for Secure Boot
- Files can get out of sync (mismatched kernel and initramfs versions)
- The kernel command line can be tampered with
- Boot loader configuration is an additional attack surface

A UKI solves all of these by combining everything into a single PE (Portable Executable) binary:

```
UKI Binary (.efi):
  ├── Linux kernel
  ├── Initramfs
  ├── Kernel command line
  ├── OS release information
  ├── Splash image (optional)
  └── Microcode updates (optional)
```

This single binary is placed on the EFI System Partition and can be directly executed by the UEFI firmware or a boot manager like systemd-boot.

## How Talos Linux Uses UKI

Talos Linux generates UKI binaries during installation and upgrades. When you install Talos on a UEFI system, the installer creates UKI binaries for both the A and B boot slots:

```
/boot/EFI/Linux/
  ├── talos-A.efi    # Active boot entry (UKI)
  └── talos-B.efi    # Standby boot entry (UKI, for upgrades)
```

systemd-boot discovers these automatically based on their location in the `EFI/Linux/` directory.

```bash
# View the UKI files on a running Talos system
talosctl ls /boot/EFI/Linux/ --nodes <NODE_IP>

# Check which one is currently active
talosctl read /proc/cmdline --nodes <NODE_IP>
```

## Security Benefits of UKI

### Single Signature Verification

With UKI, the entire boot payload is signed as one unit. The UEFI firmware verifies a single signature before executing anything, which is far simpler and more secure than verifying multiple files:

```bash
# When Secure Boot is enabled:
# 1. Firmware verifies the UKI signature
# 2. If valid, the entire bundle (kernel + initramfs + cmdline) is trusted
# 3. No separate verification needed for each component
```

### Tamper-Resistant Kernel Command Line

In a traditional setup, an attacker with physical access could modify the kernel command line to disable security features or add debugging backdoors. With UKI, the command line is embedded in the signed binary and cannot be modified without breaking the signature.

```bash
# The kernel command line is baked into the UKI
# It cannot be changed at boot time through the boot loader
# This prevents attacks like:
# - Adding init=/bin/sh to get a root shell
# - Disabling SELinux/AppArmor
# - Changing the root filesystem
```

### Measured Boot

UKI works with TPM (Trusted Platform Module) measured boot. Each component of the UKI is measured into TPM PCRs (Platform Configuration Registers), creating a chain of trust from firmware through the kernel:

```bash
# TPM PCR measurements for UKI components:
# PCR 11: Unified kernel image
# PCR 12: Kernel command line
# PCR 13: System extensions
```

This enables disk encryption keys to be sealed to specific boot configurations, ensuring that the disk can only be decrypted when the system boots with the expected UKI.

## Building Custom UKI Images

If you need a custom UKI for your Talos deployment (for example, with additional system extensions or specific kernel parameters), use the Talos imager:

```bash
# Build a custom UKI with extra extensions
docker run --rm -v $(pwd)/_out:/out \
  ghcr.io/siderolabs/imager:v1.9.0 metal \
  --arch amd64 \
  --system-extension-image ghcr.io/siderolabs/iscsi-tools:v0.1.4 \
  --system-extension-image ghcr.io/siderolabs/intel-ucode:20231114 \
  --extra-kernel-arg net.ifnames=0
```

The imager produces a UKI-based image by default for UEFI targets. The resulting ISO or raw image contains the UKI binary on the EFI System Partition.

You can also use the Talos Image Factory for an easier approach:

```bash
# Visit https://factory.talos.dev
# Select your Talos version
# Add desired system extensions
# Download the generated image
# The factory produces UKI-based images for UEFI platforms
```

## Working with UKI in the A/B Upgrade Scheme

Talos Linux's upgrade process works naturally with UKI:

```bash
# Initiate an upgrade
talosctl upgrade --nodes <NODE_IP> \
  --image ghcr.io/siderolabs/installer:v1.10.0
```

The upgrade process:

1. Downloads the new installer image
2. Generates a new UKI binary for the inactive slot (e.g., talos-B.efi)
3. Updates systemd-boot to point to the new UKI
4. Reboots the system
5. If boot succeeds, the new slot becomes active
6. If boot fails, the system reverts to the old slot (talos-A.efi)

```bash
# After upgrade, verify the active boot entry
talosctl ls /boot/EFI/Linux/ --nodes <NODE_IP>

# Check the running version
talosctl version --nodes <NODE_IP>
```

## UKI and Secure Boot Configuration

To use UKI with UEFI Secure Boot:

### Option 1: Talos Default Keys

Talos Linux ships with its own signing keys. To use them with Secure Boot:

1. Enter UEFI firmware setup
2. Go to Secure Boot key management
3. Enroll the Talos Linux signing certificate
4. Enable Secure Boot

```bash
# Talos provides its signing certificates in the release
# Download the certificate for enrollment
wget https://github.com/siderolabs/talos/releases/download/v1.9.0/talos-uki-signing-cert.pem
```

### Option 2: Custom Signing Keys

For organizations that manage their own PKI:

```bash
# Generate your own signing keys
openssl req -new -x509 -newkey rsa:2048 \
  -keyout uki-signing.key \
  -out uki-signing.crt \
  -days 3650 \
  -nodes \
  -subj "/CN=My Organization UKI Signing Key"

# Build a Talos image signed with your keys
docker run --rm \
  -v $(pwd)/_out:/out \
  -v $(pwd)/uki-signing.key:/keys/uki-signing.key \
  -v $(pwd)/uki-signing.crt:/keys/uki-signing.crt \
  ghcr.io/siderolabs/imager:v1.9.0 metal \
  --arch amd64 \
  --uki-signing-key-path /keys/uki-signing.key \
  --uki-signing-cert-path /keys/uki-signing.crt
```

Then enroll your custom certificate in the UEFI firmware.

## UKI on ARM64 Platforms

UKI is not limited to x86_64. Talos Linux supports UKI on ARM64 UEFI systems:

```bash
# Build ARM64 UKI image
docker run --rm -v $(pwd)/_out:/out \
  ghcr.io/siderolabs/imager:v1.9.0 metal \
  --arch arm64
```

Note that some ARM boards boot using U-Boot rather than UEFI, which does not support UKI. Check your board's boot firmware before expecting UKI support.

## Inspecting UKI Contents

You can inspect the contents of a UKI binary using standard PE tools:

```bash
# On a Linux workstation, use objdump or pesign
# to examine the UKI sections

# List sections in the UKI binary
objdump -h talos-A.efi

# The sections include:
# .osrel  - OS release information
# .cmdline - Kernel command line
# .linux  - Linux kernel
# .initrd - Initramfs
```

This is useful for verifying that the correct kernel parameters and components are included.

## Comparing UKI vs Traditional Boot

| Aspect | Traditional Boot | UKI |
|--------|-----------------|-----|
| Files | Multiple (kernel, initrd, config) | Single EFI binary |
| Signing | Each file signed separately | One signature for everything |
| Command line | Editable at boot | Embedded and immutable |
| Boot speed | Slightly slower (assembly) | Slightly faster (pre-assembled) |
| Complexity | Higher (more moving parts) | Lower (single file) |
| TPM support | Per-component measurement | Unified measurement |
| Compatibility | BIOS and UEFI | UEFI only |

## Troubleshooting UKI Issues

### UKI Binary Not Detected

```bash
# Check that the UKI is in the correct directory
talosctl ls /boot/EFI/Linux/ --nodes <NODE_IP>

# Verify the file has the correct extension (.efi)
# systemd-boot only auto-discovers .efi files in EFI/Linux/
```

### Secure Boot Rejection

If Secure Boot rejects the UKI:

```bash
# Check if the UKI is signed
# On a workstation with the UKI file:
pesign -S -i talos-A.efi

# Verify the enrolled certificates match
# Check the UEFI firmware's Secure Boot DB
```

### Boot Failures After Upgrade

```bash
# If the new UKI fails to boot, the A/B fallback should activate
# Wait 2-3 minutes for the automatic fallback

# If fallback does not work, boot from USB
# Check the UKI files on the ESP
talosctl ls /boot/EFI/Linux/ --insecure --nodes <NODE_IP>
```

## Future of UKI in Talos Linux

The UKI approach aligns well with Talos Linux's philosophy of immutability and security. Future developments may include:

- Automatic TPM-based disk encryption tied to UKI measurements
- Direct UEFI firmware boot without any boot manager
- Enhanced attestation capabilities for zero-trust environments
- Automated key rotation for Secure Boot certificates

## Conclusion

Unified Kernel Images bring a meaningful security improvement to the Talos Linux boot process. By bundling all boot components into a single signed binary, UKI eliminates several classes of boot-time attacks and simplifies the verification chain. For UEFI systems, UKI is the recommended boot method, and Talos Linux makes it the default. Whether you are running a small cluster or a large fleet, the security and reliability benefits of UKI make it worth understanding and using.
