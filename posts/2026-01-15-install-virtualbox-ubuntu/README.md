# How to Install VirtualBox on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, VirtualBox, Virtualization, Virtual Machines, Tutorial

Description: Step-by-step guide to installing Oracle VirtualBox on Ubuntu for running virtual machines and testing environments.

---

VirtualBox is a free, open-source virtualization platform from Oracle that runs on Windows, macOS, and Linux. It's popular for development, testing, and running different operating systems alongside your main OS.

## Prerequisites

- Ubuntu 20.04, 22.04, or 24.04
- 64-bit system with virtualization support
- At least 4GB RAM
- Sufficient disk space

## Installation Methods

### Method 1: Ubuntu Repository (Simple)

```bash
# Install from Ubuntu repos
sudo apt update
sudo apt install virtualbox -y

# Verify installation
vboxmanage --version
```

### Method 2: Oracle Repository (Latest Version)

```bash
# Download Oracle's GPG key
wget -q https://www.virtualbox.org/download/oracle_vbox_2016.asc -O- | sudo gpg --dearmor -o /usr/share/keyrings/oracle-virtualbox.gpg

# Add Oracle repository
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/oracle-virtualbox.gpg] https://download.virtualbox.org/virtualbox/debian $(lsb_release -cs) contrib" | sudo tee /etc/apt/sources.list.d/virtualbox.list

# Update and install
sudo apt update
sudo apt install virtualbox-7.0 -y
```

### Method 3: Download .deb Package

```bash
# Download latest version from virtualbox.org
wget https://download.virtualbox.org/virtualbox/7.0.14/virtualbox-7.0_7.0.14-161095~Ubuntu~jammy_amd64.deb

# Install package
sudo dpkg -i virtualbox-7.0_7.0.14-161095~Ubuntu~jammy_amd64.deb

# Fix dependencies if needed
sudo apt -f install
```

## Post-Installation Setup

### Add User to vboxusers Group

```bash
# Add current user to vboxusers group
sudo usermod -aG vboxusers $USER

# Apply changes (or log out and back in)
newgrp vboxusers
```

### Install Extension Pack (Optional)

The Extension Pack adds USB 2.0/3.0 support, VirtualBox RDP, and PXE boot:

```bash
# Download extension pack (match your VirtualBox version)
wget https://download.virtualbox.org/virtualbox/7.0.14/Oracle_VM_VirtualBox_Extension_Pack-7.0.14.vbox-extpack

# Install extension pack
sudo vboxmanage extpack install Oracle_VM_VirtualBox_Extension_Pack-7.0.14.vbox-extpack
```

Accept the license agreement when prompted.

### Install Guest Additions Dependencies

```bash
# For building guest additions in VMs
sudo apt install build-essential dkms linux-headers-$(uname -r) -y
```

## Launch VirtualBox

```bash
# Start VirtualBox GUI
virtualbox

# Or from application menu
```

## Create Virtual Machine (GUI)

1. Click "New"
2. Enter name, type, and version
3. Allocate RAM
4. Create virtual hard disk (VDI recommended)
5. Choose dynamically allocated or fixed size
6. Set disk size
7. Click "Create"

## Create Virtual Machine (CLI)

```bash
# Create VM
vboxmanage createvm --name "Ubuntu-VM" --ostype "Ubuntu_64" --register

# Set memory and CPUs
vboxmanage modifyvm "Ubuntu-VM" --memory 2048 --cpus 2

# Create virtual disk
vboxmanage createhd --filename ~/VirtualBox\ VMs/Ubuntu-VM/Ubuntu-VM.vdi --size 20000

# Add SATA controller
vboxmanage storagectl "Ubuntu-VM" --name "SATA" --add sata --controller IntelAhci

# Attach hard disk
vboxmanage storageattach "Ubuntu-VM" --storagectl "SATA" --port 0 --device 0 --type hdd --medium ~/VirtualBox\ VMs/Ubuntu-VM/Ubuntu-VM.vdi

# Add IDE controller for CD-ROM
vboxmanage storagectl "Ubuntu-VM" --name "IDE" --add ide

# Attach ISO
vboxmanage storageattach "Ubuntu-VM" --storagectl "IDE" --port 0 --device 0 --type dvddrive --medium /path/to/ubuntu.iso

# Set boot order
vboxmanage modifyvm "Ubuntu-VM" --boot1 dvd --boot2 disk

# Enable NAT networking
vboxmanage modifyvm "Ubuntu-VM" --nic1 nat
```

## VM Management Commands

### Basic Operations

```bash
# List all VMs
vboxmanage list vms

# List running VMs
vboxmanage list runningvms

# Start VM (headless)
vboxmanage startvm "Ubuntu-VM" --type headless

# Start VM (GUI)
vboxmanage startvm "Ubuntu-VM" --type gui

# Pause VM
vboxmanage controlvm "Ubuntu-VM" pause

# Resume VM
vboxmanage controlvm "Ubuntu-VM" resume

# Save state (hibernate)
vboxmanage controlvm "Ubuntu-VM" savestate

# Power off (force)
vboxmanage controlvm "Ubuntu-VM" poweroff

# ACPI shutdown (graceful)
vboxmanage controlvm "Ubuntu-VM" acpipowerbutton
```

### VM Configuration

```bash
# Get VM info
vboxmanage showvminfo "Ubuntu-VM"

# Modify settings
vboxmanage modifyvm "Ubuntu-VM" --memory 4096
vboxmanage modifyvm "Ubuntu-VM" --cpus 4
vboxmanage modifyvm "Ubuntu-VM" --vram 128

# Enable nested virtualization
vboxmanage modifyvm "Ubuntu-VM" --nested-hw-virt on

# Enable clipboard sharing
vboxmanage modifyvm "Ubuntu-VM" --clipboard bidirectional

# Enable drag and drop
vboxmanage modifyvm "Ubuntu-VM" --draganddrop bidirectional
```

### Delete VM

```bash
# Unregister and delete all files
vboxmanage unregistervm "Ubuntu-VM" --delete
```

## Networking

### Network Modes

| Mode | Description |
|------|-------------|
| NAT | VM shares host's IP (default) |
| Bridged | VM gets own IP on LAN |
| Host-Only | VM can only communicate with host |
| Internal | VMs can only communicate with each other |

### Configure Network

```bash
# Set to bridged adapter
vboxmanage modifyvm "Ubuntu-VM" --nic1 bridged --bridgeadapter1 eth0

# Set to host-only
vboxmanage modifyvm "Ubuntu-VM" --nic1 hostonly --hostonlyadapter1 vboxnet0

# Port forwarding (NAT mode)
vboxmanage modifyvm "Ubuntu-VM" --natpf1 "ssh,tcp,,2222,,22"
vboxmanage modifyvm "Ubuntu-VM" --natpf1 "http,tcp,,8080,,80"

# Remove port forwarding rule
vboxmanage modifyvm "Ubuntu-VM" --natpf1 delete "ssh"
```

### Create Host-Only Network

```bash
# Create host-only network
vboxmanage hostonlyif create

# Configure IP
vboxmanage hostonlyif ipconfig vboxnet0 --ip 192.168.56.1 --netmask 255.255.255.0
```

## Snapshots

```bash
# Take snapshot
vboxmanage snapshot "Ubuntu-VM" take "Clean Install"

# List snapshots
vboxmanage snapshot "Ubuntu-VM" list

# Restore snapshot
vboxmanage snapshot "Ubuntu-VM" restore "Clean Install"

# Delete snapshot
vboxmanage snapshot "Ubuntu-VM" delete "Clean Install"
```

## Shared Folders

```bash
# Add shared folder (permanent)
vboxmanage sharedfolder add "Ubuntu-VM" --name "shared" --hostpath /home/user/shared --automount

# Remove shared folder
vboxmanage sharedfolder remove "Ubuntu-VM" --name "shared"
```

In the guest VM (after installing Guest Additions):
```bash
# Mount shared folder
sudo mount -t vboxsf shared /mnt/shared

# Auto-mount at boot - add to /etc/fstab
shared /mnt/shared vboxsf defaults 0 0
```

## Install Guest Additions

Inside the VM:

```bash
# Insert Guest Additions CD
# From VirtualBox menu: Devices > Insert Guest Additions CD image

# Mount and install (in VM)
sudo mount /dev/cdrom /mnt
cd /mnt
sudo ./VBoxLinuxAdditions.run

# Reboot VM
sudo reboot
```

## Import/Export VMs

### Export VM (OVA)

```bash
# Export to OVA format
vboxmanage export "Ubuntu-VM" --output ~/ubuntu-vm.ova
```

### Import VM

```bash
# Import OVA file
vboxmanage import ~/ubuntu-vm.ova
```

## Troubleshooting

### Kernel Driver Not Installed

```bash
# Rebuild kernel modules
sudo /sbin/vboxconfig

# Or reinstall DKMS module
sudo apt install --reinstall virtualbox-dkms
```

### Secure Boot Issues

Secure Boot can prevent VirtualBox kernel modules from loading:

```bash
# Option 1: Disable Secure Boot in BIOS

# Option 2: Sign VirtualBox modules
sudo mokutil --import /var/lib/shim-signed/mok/MOK.der
# Reboot and enroll the key
```

### USB Devices Not Detected

```bash
# Check vboxusers group membership
groups $USER

# Add user to vboxusers
sudo usermod -aG vboxusers $USER
# Log out and back in
```

### VT-x/AMD-V Not Available

```bash
# Enable in BIOS/UEFI settings
# Look for: Intel VT-x, AMD-V, SVM, Virtualization Technology
```

## Uninstall VirtualBox

```bash
# Remove VirtualBox
sudo apt remove virtualbox* --purge

# Remove configuration
rm -rf ~/.config/VirtualBox
rm -rf ~/VirtualBox\ VMs
```

---

VirtualBox is excellent for development, testing, and learning new operating systems. For production virtualization workloads, consider KVM/QEMU for better Linux integration and performance.
