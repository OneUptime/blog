# How to Create a KVM VM with UEFI Firmware on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, KVM, Virtualization, UEFI, OVMF

Description: A practical guide to creating KVM virtual machines that use UEFI firmware (OVMF) on Ubuntu, including Secure Boot configuration and troubleshooting tips.

---

Most tutorials default to BIOS-based KVM virtual machines, but modern workloads increasingly require UEFI firmware. Windows 11 mandates UEFI and TPM, many Linux distributions ship UEFI-only ISOs, and Secure Boot is required for certain enterprise environments. This guide walks through creating UEFI-based KVM VMs on Ubuntu using OVMF (Open Virtual Machine Firmware).

## Prerequisites

Before starting, confirm KVM is installed and functional:

```bash
# Check if KVM is available
kvm-ok

# Verify your user is in the libvirt group
groups $USER | grep libvirt

# If not, add yourself and log out/in
sudo usermod -aG libvirt $USER
```

## Installing OVMF (UEFI Firmware for KVM)

OVMF is the UEFI implementation for QEMU/KVM. Ubuntu packages it in the `ovmf` package:

```bash
# Install OVMF and supporting tools
sudo apt update
sudo apt install -y ovmf

# Verify installation location
ls /usr/share/OVMF/
# You should see: OVMF_CODE.fd, OVMF_VARS.fd, and SecureBoot variants
```

The two key files are:
- `OVMF_CODE.fd` - the read-only firmware code (shared across VMs)
- `OVMF_VARS.fd` - the NVRAM template that stores EFI variables (copied per VM)

For Secure Boot, you'll find files with `_VARS.secboot.fd` and `_CODE.secboot.fd` suffixes.

## Creating the UEFI NVRAM Variables File

Each VM needs its own copy of the NVRAM variables file so EFI settings are isolated:

```bash
# Create a directory for your VM's assets
mkdir -p ~/vms/myvm

# Copy the OVMF vars template for this VM
cp /usr/share/OVMF/OVMF_VARS.fd ~/vms/myvm/OVMF_VARS.fd

# Adjust ownership
sudo chown libvirt-qemu:kvm ~/vms/myvm/OVMF_VARS.fd
```

## Creating the VM with virt-install

Use `virt-install` with the `--boot uefi` option or manually specify the firmware paths:

### Basic UEFI VM (No Secure Boot)

```bash
# Create a disk image first
qemu-img create -f qcow2 ~/vms/myvm/disk.qcow2 40G

# Create the UEFI VM
virt-install \
  --name myvm-uefi \
  --ram 4096 \
  --vcpus 2 \
  --disk path=~/vms/myvm/disk.qcow2,format=qcow2 \
  --cdrom /path/to/ubuntu-24.04-desktop-amd64.iso \
  --os-variant ubuntu24.04 \
  --boot uefi \
  --graphics spice \
  --noautoconsole
```

The `--boot uefi` flag automatically handles the OVMF code and creates the NVRAM file in libvirt's default location (`/var/lib/libvirt/qemu/nvram/`).

### Manual UEFI Firmware Path Specification

If you need finer control over firmware locations:

```bash
virt-install \
  --name myvm-uefi-manual \
  --ram 4096 \
  --vcpus 2 \
  --disk path=~/vms/myvm/disk.qcow2,format=qcow2 \
  --cdrom /path/to/ubuntu-24.04-desktop-amd64.iso \
  --os-variant ubuntu24.04 \
  --boot loader=/usr/share/OVMF/OVMF_CODE.fd,loader.readonly=yes,loader.type=pflash,nvram.template=/usr/share/OVMF/OVMF_VARS.fd \
  --graphics spice \
  --noautoconsole
```

## Enabling Secure Boot

For Secure Boot, use the secboot variants of the OVMF firmware:

```bash
# List available Secure Boot firmware files
ls /usr/share/OVMF/*secboot*

# Create a Secure Boot VM
virt-install \
  --name myvm-secureboot \
  --ram 4096 \
  --vcpus 2 \
  --disk path=~/vms/myvm/disk.qcow2,format=qcow2 \
  --cdrom /path/to/windows11.iso \
  --os-variant win11 \
  --boot loader=/usr/share/OVMF/OVMF_CODE.secboot.fd,loader.readonly=yes,loader.type=pflash,loader.secure=yes,nvram.template=/usr/share/OVMF/OVMF_VARS.secboot.fd \
  --features smm.state=on \
  --machine q35 \
  --graphics spice \
  --noautoconsole
```

Note the additional flags:
- `--machine q35` - required for Secure Boot (q35 emulates a modern PCIe chipset)
- `--features smm.state=on` - System Management Mode, needed for UEFI Secure Boot
- `loader.secure=yes` - enables the Secure Boot enforcement mode

## Adding TPM for Windows 11

Windows 11 requires TPM 2.0. Use the software TPM emulator (swtpm):

```bash
# Install swtpm
sudo apt install -y swtpm swtpm-tools

# Create the VM with vTPM
virt-install \
  --name win11 \
  --ram 8192 \
  --vcpus 4 \
  --disk path=~/vms/win11/disk.qcow2,format=qcow2,bus=virtio \
  --cdrom /path/to/windows11.iso \
  --os-variant win11 \
  --boot loader=/usr/share/OVMF/OVMF_CODE.secboot.fd,loader.readonly=yes,loader.type=pflash,loader.secure=yes,nvram.template=/usr/share/OVMF/OVMF_VARS.secboot.fd \
  --features smm.state=on \
  --machine q35 \
  --tpm model=tpm-crb,type=emulator,version=2.0 \
  --graphics spice \
  --noautoconsole
```

## Verifying UEFI Mode Inside the VM

Once the VM is running, verify it booted in UEFI mode:

```bash
# Connect to the VM console
virsh console myvm-uefi

# Inside the VM (Linux), check for EFI directory
ls /sys/firmware/efi/

# Or check boot mode
[ -d /sys/firmware/efi ] && echo "UEFI" || echo "BIOS"
```

## Accessing the UEFI Shell

If the VM fails to boot, you can access the UEFI shell:

```bash
# Get the VM's VNC/SPICE port
virsh vncdisplay myvm-uefi

# Connect and press ESC at the TianoCore logo to enter UEFI setup
# Or connect via virt-viewer
virt-viewer myvm-uefi &
```

From the UEFI setup, you can configure boot order, enroll Secure Boot keys, or access the EFI shell for manual boot entry management.

## Inspecting VM XML for UEFI Settings

Check the libvirt XML to confirm UEFI configuration:

```bash
virsh dumpxml myvm-uefi | grep -A5 "loader\|os"
```

Expected output shows the loader and NVRAM paths:

```xml
<os>
  <type arch='x86_64' machine='pc-q35-8.2'>hvm</type>
  <loader readonly='yes' type='pflash'>/usr/share/OVMF/OVMF_CODE.fd</loader>
  <nvram>/var/lib/libvirt/qemu/nvram/myvm-uefi_VARS.fd</nvram>
  <boot dev='hd'/>
</os>
```

## Troubleshooting Common Issues

### VM Boots to UEFI Shell Instead of OS

The UEFI firmware cannot find a bootloader. This usually means:
- The OS wasn't installed correctly (EFI partition missing or not formatted)
- The boot order doesn't include the disk

```bash
# Edit boot order
virsh edit myvm-uefi
# Move <boot dev='hd'/> before cdrom
```

### Black Screen After Starting VM

This often indicates a display issue, not a UEFI problem. Try:

```bash
# Add video device explicitly
virsh edit myvm-uefi
# Add: <video><model type='vga' vram='16384' heads='1'/></video>
```

### Secure Boot Blocks Boot

If an OS refuses to boot with Secure Boot enabled, you can temporarily disable it in the UEFI setup or enroll the signing key via mokutil inside the guest.

### NVRAM File Permissions

If the VM fails to start with a permissions error on the NVRAM file:

```bash
# Check the file permissions
ls -la /var/lib/libvirt/qemu/nvram/

# Fix ownership if needed
sudo chown libvirt-qemu:kvm /var/lib/libvirt/qemu/nvram/myvm-uefi_VARS.fd
```

## Converting an Existing BIOS VM to UEFI

Converting an existing VM from BIOS to UEFI requires OS-side changes too - the disk needs an EFI System Partition and a UEFI bootloader. For Linux VMs, this typically involves:

1. Resizing the disk to add an ESP
2. Installing grub-efi inside the guest
3. Updating the libvirt XML to use OVMF

This conversion is non-trivial for production VMs. For new deployments, always start with UEFI from the beginning.

UEFI-based KVM VMs provide a more modern firmware environment that matches real hardware, enables Secure Boot enforcement, and is required for certain guest operating systems. Setting it up correctly from the start avoids painful migrations later.
