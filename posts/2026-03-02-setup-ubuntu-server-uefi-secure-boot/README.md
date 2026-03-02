# How to Set Up Ubuntu Server with UEFI Secure Boot Enabled

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, UEFI, Secure Boot, Security, Installation

Description: Learn how to install and configure Ubuntu Server with UEFI Secure Boot enabled, understand how shim and MOK work, and manage kernel modules that require signing.

---

Secure Boot is a UEFI feature that verifies each piece of software in the boot chain has been signed by a trusted key before running it. The intent is to prevent rootkits and boot-level malware from loading before the OS. Ubuntu has supported Secure Boot since Ubuntu 12.04 through the use of a pre-signed shim bootloader provided by Canonical. On Ubuntu Server, you can install and run with Secure Boot enabled without any special configuration - but you need to understand how the chain works, especially when you need to load third-party kernel modules.

## How Ubuntu Implements Secure Boot

The Secure Boot trust chain on Ubuntu works as follows:

1. UEFI firmware verifies the first-stage bootloader (`shim`) against Microsoft's certificate (pre-installed in most UEFI firmware)
2. `shim` verifies GRUB against Canonical's certificate (embedded in shim)
3. GRUB verifies the Linux kernel against Canonical's certificate
4. The kernel verifies loadable kernel modules against the kernel's built-in key ring

Canonical signs `shim`, GRUB, and the kernel. As long as you use Ubuntu's official bootloader and kernels, Secure Boot works transparently.

## Checking Secure Boot Status

Before installation, verify your system is in UEFI mode with Secure Boot available. During installation or on a running system:

```bash
# Check Secure Boot status on a running Ubuntu system
mokutil --sb-state
# Output: SecureBoot enabled

# Check UEFI vs BIOS mode
[ -d /sys/firmware/efi ] && echo "UEFI" || echo "BIOS/Legacy"

# Show detailed Secure Boot variables
efivar --list | grep -i secure
```

## Installing Ubuntu Server with Secure Boot Enabled

The Ubuntu Server installer is fully compatible with Secure Boot. Do not disable it in your UEFI settings.

1. Download Ubuntu Server 24.04 LTS ISO
2. Create a bootable USB using Rufus (Windows) with GPT partition scheme, or `dd` on Linux/macOS
3. Boot from USB - the shim in the ISO is signed by Microsoft, so it passes UEFI verification
4. Proceed with installation normally

The installer will:
- Use the EFI System Partition (ESP) at `/boot/efi`
- Install the signed `shim`, `grubx64.efi`, and kernel
- Register Canonical's key with the UEFI MokList if needed

No additional steps are required for the base Ubuntu system.

## Machine Owner Key (MOK) Management

When you need to load kernel modules not signed by Canonical - such as VirtualBox guest additions, custom DKMS modules, or out-of-tree drivers - you need to create your own signing key, sign the modules, and enroll the key into the MOK database.

### Generate a MOK Key Pair

```bash
# Create a directory for your keys
sudo mkdir -p /var/lib/shim-signed/mok
cd /var/lib/shim-signed/mok

# Generate a 2048-bit RSA key pair valid for 10 years
sudo openssl req -new -x509 -newkey rsa:2048 \
    -keyout MOK.priv \
    -outform DER \
    -out MOK.der \
    -days 3650 \
    -subj "/CN=My Ubuntu MOK/" \
    -nodes

# Set restrictive permissions on the private key
sudo chmod 600 MOK.priv
```

### Enroll the Key in MOK

```bash
# Enroll the public key into the MOK database
# This requires a password that you will enter at the UEFI MOK manager on next reboot
sudo mokutil --import /var/lib/shim-signed/mok/MOK.der
# Enter and confirm a temporary enrollment password
```

Reboot the system. The UEFI shim will detect the pending MOK enrollment and launch the MOK Manager (a blue screen). Select "Enroll MOK", confirm, enter the password you set above, and choose to continue. The system will then boot normally with your key enrolled.

Verify the key was enrolled:

```bash
# List enrolled MOK keys
sudo mokutil --list-enrolled | grep -A 5 "CN=My Ubuntu MOK"
```

### Sign a Kernel Module

Once your key is enrolled, sign any custom module before loading it:

```bash
# Sign a kernel module with your MOK key
sudo /usr/src/linux-headers-$(uname -r)/scripts/sign-file \
    sha256 \
    /var/lib/shim-signed/mok/MOK.priv \
    /var/lib/shim-signed/mok/MOK.der \
    /path/to/your/module.ko
```

For DKMS modules, configure DKMS to auto-sign after each build:

```bash
# Create DKMS signing configuration
sudo tee /etc/dkms/sign_helper.sh << 'EOF'
#!/bin/sh
/usr/src/linux-headers-$(uname -r)/scripts/sign-file sha256 \
    /var/lib/shim-signed/mok/MOK.priv \
    /var/lib/shim-signed/mok/MOK.der \
    "$1"
EOF
sudo chmod +x /etc/dkms/sign_helper.sh
```

## Handling Third-Party Drivers

### NVIDIA Drivers

Ubuntu's official NVIDIA driver packages through the `ubuntu-drivers` tool handle Secure Boot signing automatically:

```bash
# Install NVIDIA drivers (handles Secure Boot automatically)
sudo ubuntu-drivers autoinstall

# The installer creates a MOK and prompts for enrollment password
# Reboot and complete enrollment in the MOK Manager
```

### VirtualBox Guest Additions

When running Ubuntu as a VM guest with Secure Boot enabled, the VirtualBox guest additions kernel modules need signing:

```bash
# After installing VirtualBox guest additions, sign the modules
sudo /usr/src/linux-headers-$(uname -r)/scripts/sign-file sha256 \
    /var/lib/shim-signed/mok/MOK.priv \
    /var/lib/shim-signed/mok/MOK.der \
    /lib/modules/$(uname -r)/misc/vboxguest.ko
```

## Updating GRUB with Secure Boot

After kernel updates, GRUB and shim need to point to the new kernel. Ubuntu handles this automatically via `update-grub` and the kernel post-install scripts:

```bash
# Verify GRUB is properly configured after a kernel update
sudo update-grub
ls -la /boot/efi/EFI/ubuntu/
```

The signed GRUB binary (`grubx64.efi`) and shim (`shimx64.efi`) should be present in the EFI partition.

## Troubleshooting Secure Boot Issues

### System Refuses to Boot After Kernel Update

If a kernel update broke boot, the issue is often a GRUB misconfiguration rather than Secure Boot. Boot from a live USB and repair GRUB:

```bash
# From live USB, mount and chroot into your system
sudo mount /dev/sda2 /mnt
sudo mount /dev/sda1 /mnt/boot/efi
sudo mount --bind /dev /mnt/dev
sudo mount --bind /proc /mnt/proc
sudo mount --bind /sys /mnt/sys
sudo mount --bind /sys/firmware/efi/efivars /mnt/sys/firmware/efi/efivars
sudo chroot /mnt

# Reinstall GRUB for EFI
grub-install --target=x86_64-efi --efi-directory=/boot/efi --bootloader-id=ubuntu
update-grub
exit
```

### Module Load Fails with "Required key not available"

This means the module is not signed with an enrolled key:

```bash
# Check kernel ring for signature errors
dmesg | grep -i "module verification failed"

# Sign the module with your enrolled MOK key
sudo /usr/src/linux-headers-$(uname -r)/scripts/sign-file sha256 \
    /var/lib/shim-signed/mok/MOK.priv \
    /var/lib/shim-signed/mok/MOK.der \
    /path/to/module.ko
```

### Checking Which Keys Are Trusted

```bash
# List keys in the UEFI Secure Boot database
sudo mokutil --list-enrolled

# List keys in the kernel keyring
sudo keyctl list %:.platform
```

## Disabling Secure Boot (Last Resort)

If you genuinely cannot make a required driver work with Secure Boot, disable it through the UEFI firmware settings. Access UEFI setup on boot (Del, F2, or F10 depending on hardware), navigate to the Secure Boot section, and disable it.

This is a significant security trade-off and should only be done on systems where the threat model allows it - for example, isolated lab machines or embedded systems with physical security.

Ubuntu Server's Secure Boot support is solid for standard workloads. The main complexity arises with out-of-tree kernel modules, but the MOK workflow is well-documented and becomes routine once you have gone through it once.
