# How to Install RHEL as a Generation 2 Virtual Machine on Hyper-V

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Hyper-V, Generation 2, Virtualization, Windows Server, Linux

Description: Install RHEL as a Generation 2 virtual machine on Microsoft Hyper-V, taking advantage of UEFI boot, secure boot support, and paravirtual devices.

---

Hyper-V Generation 2 VMs use UEFI firmware instead of BIOS, support Secure Boot, and offer better performance through synthetic devices. RHEL 8 and 9 are fully supported as Generation 2 guests on Hyper-V.

## Create a Generation 2 VM in Hyper-V

Using PowerShell on the Hyper-V host:

```powershell
# Create a Generation 2 VM with 4 GB RAM and 50 GB disk
New-VM -Name "RHEL9-Server" `
  -Generation 2 `
  -MemoryStartupBytes 4GB `
  -NewVHDPath "C:\VMs\RHEL9-Server.vhdx" `
  -NewVHDSizeBytes 50GB `
  -SwitchName "External-Switch"

# Set the number of virtual processors
Set-VMProcessor -VMName "RHEL9-Server" -Count 4

# Enable dynamic memory (optional)
Set-VMMemory -VMName "RHEL9-Server" -DynamicMemoryEnabled $true `
  -MinimumBytes 2GB -MaximumBytes 8GB
```

## Configure Secure Boot for Linux

Generation 2 VMs have Secure Boot enabled by default with a Microsoft UEFI CA. You need to switch to the Microsoft UEFI Certificate Authority that supports Linux.

```powershell
# Set the Secure Boot template to support Linux
Set-VMFirmware -VMName "RHEL9-Server" `
  -SecureBootTemplate "MicrosoftUEFICertificateAuthority"
```

## Attach the RHEL ISO

```powershell
# Add a DVD drive with the RHEL ISO
Add-VMDvdDrive -VMName "RHEL9-Server" `
  -Path "C:\ISOs\rhel-9.4-x86_64-dvd.iso"

# Set the DVD drive as the first boot device
$dvd = Get-VMDvdDrive -VMName "RHEL9-Server"
Set-VMFirmware -VMName "RHEL9-Server" -FirstBootDevice $dvd
```

## Install RHEL

```powershell
# Start the VM
Start-VM -Name "RHEL9-Server"

# Connect to the VM console
vmconnect localhost "RHEL9-Server"
```

In the Anaconda installer:

1. Select your language and keyboard
2. Configure installation destination (the VHDX disk)
3. Use automatic partitioning with LVM
4. Configure network settings
5. Begin installation

## Post-Installation: Install Hyper-V Integration Services

RHEL includes Hyper-V drivers in the kernel. Verify they are loaded:

```bash
# Check that Hyper-V modules are loaded
lsmod | grep hv_

# Expected modules:
# hv_vmbus     - VMBus driver
# hv_storvsc   - Storage driver
# hv_netvsc    - Network driver
# hv_utils     - Utilities (heartbeat, time sync, etc.)

# Install hyperv-daemons for guest services
sudo dnf install -y hyperv-daemons

# Enable and start the daemons
sudo systemctl enable --now hypervkvpd
sudo systemctl enable --now hypervvssd
```

## Verify the Installation

```bash
# Check the system recognizes Hyper-V
systemd-detect-virt
# Output: microsoft

# Verify network connectivity
ip addr show eth0

# Register with Red Hat
sudo subscription-manager register --username your_username --password your_password
sudo subscription-manager attach --auto

# Update the system
sudo dnf update -y
```

Generation 2 VMs offer better performance and security features compared to Generation 1, making them the recommended choice for RHEL on Hyper-V.
