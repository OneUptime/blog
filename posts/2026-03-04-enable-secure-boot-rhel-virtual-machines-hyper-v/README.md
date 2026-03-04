# How to Enable Secure Boot for RHEL Virtual Machines in Hyper-V

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Hyper-V, Secure Boot, UEFI, Security, Virtualization, Linux

Description: Enable and configure Secure Boot for RHEL virtual machines running on Microsoft Hyper-V to verify the integrity of the boot process and protect against boot-level malware.

---

Secure Boot is a UEFI feature that verifies the digital signature of the bootloader and kernel before execution. This protects against bootkits and unauthorized boot components. RHEL supports Secure Boot on Hyper-V Generation 2 VMs when the correct certificate authority is configured.

## Prerequisites

- Hyper-V Generation 2 virtual machine (Generation 1 does not support Secure Boot)
- RHEL 8 or RHEL 9 (both support Secure Boot)

## Enable Secure Boot with the Linux Template

The default Secure Boot template uses the Microsoft Windows certificate, which will not validate the RHEL bootloader. You must switch to the template that includes the Microsoft UEFI CA for third-party signing.

```powershell
# Power off the VM first (Secure Boot settings cannot be changed while running)
Stop-VM -Name "RHEL9-Server"

# Set the Secure Boot template for Linux
Set-VMFirmware -VMName "RHEL9-Server" `
  -EnableSecureBoot On `
  -SecureBootTemplate "MicrosoftUEFICertificateAuthority"

# Start the VM
Start-VM -Name "RHEL9-Server"
```

## Verify Secure Boot is Active in RHEL

```bash
# Check if Secure Boot is enabled from within the guest
mokutil --sb-state
# Output: SecureBoot enabled

# Alternative check using the EFI variable
od -An -t u1 /sys/firmware/efi/efivars/SecureBoot-* | tail -1
# Last byte: 1 = enabled, 0 = disabled
```

## How RHEL Secure Boot Works on Hyper-V

The boot chain is verified in this order:

1. Hyper-V UEFI firmware verifies the GRUB2 bootloader (signed by Microsoft)
2. GRUB2 verifies the Linux kernel (signed by Red Hat)
3. The kernel enforces module signature verification

```bash
# Verify the bootloader is signed
pesign -S -i /boot/efi/EFI/redhat/shimx64.efi

# Verify the kernel is signed
pesign -S -i /boot/vmlinuz-$(uname -r)
```

## Managing Machine Owner Keys (MOK)

If you need to load custom kernel modules (such as third-party drivers), they must be signed.

```bash
# Generate a signing key pair
openssl req -new -x509 -newkey rsa:2048 -keyout MOK.priv \
  -outform DER -out MOK.der -nodes -days 36500 \
  -subj "/CN=Custom Module Signing Key/"

# Enroll the key using mokutil
sudo mokutil --import MOK.der
# You will be prompted to set a password

# Reboot - the MOK manager will appear during boot
# Select "Enroll MOK" and enter the password you set
sudo reboot
```

## Sign a Custom Kernel Module

```bash
# Sign a custom module with your MOK key
sudo /usr/src/kernels/$(uname -r)/scripts/sign-file \
  sha256 MOK.priv MOK.der /path/to/custom_module.ko

# Load the signed module
sudo modprobe custom_module

# Verify the module is loaded
lsmod | grep custom_module
```

## Troubleshooting Boot Failures

If the VM fails to boot after enabling Secure Boot:

```powershell
# Temporarily disable Secure Boot to recover
Stop-VM -Name "RHEL9-Server"
Set-VMFirmware -VMName "RHEL9-Server" -EnableSecureBoot Off
Start-VM -Name "RHEL9-Server"
```

Then investigate whether unsigned modules or a corrupted bootloader is the cause.

Secure Boot on Hyper-V adds a layer of boot integrity protection to your RHEL VMs with minimal configuration effort.
