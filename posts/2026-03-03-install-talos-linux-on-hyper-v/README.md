# How to Install Talos Linux on Hyper-V

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Hyper-V, Windows, Virtualization, Kubernetes

Description: A complete guide to deploying Talos Linux on Microsoft Hyper-V for running Kubernetes clusters on Windows Server infrastructure.

---

Microsoft Hyper-V is the built-in hypervisor for Windows Server and Windows 10/11 Pro. If your organization runs Windows infrastructure, Hyper-V is a natural choice for hosting Talos Linux virtual machines. Talos publishes a VHD image specifically for Hyper-V, making the deployment process straightforward. This guide covers everything from creating VMs to bootstrapping a Kubernetes cluster.

## Prerequisites

Make sure Hyper-V is enabled and you have the necessary tools:

```powershell
# Enable Hyper-V on Windows Server
Install-WindowsFeature -Name Hyper-V -IncludeManagementTools -Restart

# Enable Hyper-V on Windows 10/11 Pro
Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V -All

# Verify Hyper-V is running
Get-VMHost
```

On your management workstation (can be WSL2 or another machine):

```bash
# Install talosctl
curl -sL https://talos.dev/install | sh

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl && sudo mv kubectl /usr/local/bin/
```

## Downloading the Talos Image

Download the Talos VHD image for Hyper-V:

```powershell
# Download the Talos VHD image
$TalosVersion = "v1.7.0"
$DownloadUrl = "https://github.com/siderolabs/talos/releases/download/$TalosVersion/metal-amd64.raw.xz"
$DownloadPath = "C:\Hyper-V\Images"

# Create the directory
New-Item -ItemType Directory -Path $DownloadPath -Force

# Download the image
Invoke-WebRequest -Uri $DownloadUrl -OutFile "$DownloadPath\talos.raw.xz"

# You will need 7-Zip or xz tools to extract
# Using 7-Zip:
& "C:\Program Files\7-Zip\7z.exe" x "$DownloadPath\talos.raw.xz" -o"$DownloadPath"

# Convert the raw image to VHDX format
# Using qemu-img (available through WSL or separate install)
wsl qemu-img convert -f raw -O vhdx /mnt/c/Hyper-V/Images/talos.raw /mnt/c/Hyper-V/Images/talos-base.vhdx
```

Alternatively, use the Talos ISO approach which is simpler:

```powershell
# Download the Talos ISO
$IsoUrl = "https://github.com/siderolabs/talos/releases/download/v1.7.0/talos-amd64.iso"
Invoke-WebRequest -Uri $IsoUrl -OutFile "C:\Hyper-V\Images\talos-amd64.iso"
```

## Setting Up Networking

Create a virtual switch for the Talos cluster:

```powershell
# Create an internal virtual switch for the Talos cluster
New-VMSwitch -Name "Talos-Switch" -SwitchType Internal

# Get the adapter created by the switch
$Adapter = Get-NetAdapter | Where-Object { $_.Name -like "*Talos-Switch*" }

# Assign an IP address to the host adapter
New-NetIPAddress -InterfaceIndex $Adapter.InterfaceIndex `
  -IPAddress 192.168.100.1 `
  -PrefixLength 24

# Create a NAT for internet access
New-NetNat -Name "Talos-NAT" `
  -InternalIPInterfaceAddressPrefix 192.168.100.0/24

# Alternatively, create an external switch for direct network access
# This gives VMs their own IPs on your physical network
New-VMSwitch -Name "Talos-External" `
  -NetAdapterName "Ethernet" `
  -AllowManagementOS $true
```

## Creating Control Plane VMs

Create the virtual machines using PowerShell:

```powershell
# Base path for VM files
$VMPath = "C:\Hyper-V\VMs"
$ISOPath = "C:\Hyper-V\Images\talos-amd64.iso"

# Function to create a Talos VM
function New-TalosVM {
    param(
        [string]$Name,
        [int]$Memory = 8GB,
        [int]$CPUs = 4,
        [int]$DiskSize = 50GB,
        [string]$Switch = "Talos-Switch"
    )

    # Create the VM
    New-VM -Name $Name `
        -MemoryStartupBytes $Memory `
        -Generation 2 `
        -NewVHDPath "$VMPath\$Name\$Name.vhdx" `
        -NewVHDSizeBytes $DiskSize `
        -SwitchName $Switch `
        -Path $VMPath

    # Configure the VM
    Set-VMProcessor -VMName $Name -Count $CPUs
    Set-VMMemory -VMName $Name -DynamicMemoryEnabled $false

    # Disable Secure Boot (Talos uses its own secure boot chain)
    Set-VMFirmware -VMName $Name -EnableSecureBoot Off

    # Add DVD drive with Talos ISO
    Add-VMDvdDrive -VMName $Name -Path $ISOPath

    # Set boot order - DVD first, then disk
    $DVD = Get-VMDvdDrive -VMName $Name
    $HDD = Get-VMHardDiskDrive -VMName $Name
    Set-VMFirmware -VMName $Name -BootOrder $DVD, $HDD

    Write-Host "Created VM: $Name"
}

# Create control plane VMs
New-TalosVM -Name "talos-cp-1" -Memory 8GB -CPUs 4 -DiskSize 50GB
New-TalosVM -Name "talos-cp-2" -Memory 8GB -CPUs 4 -DiskSize 50GB
New-TalosVM -Name "talos-cp-3" -Memory 8GB -CPUs 4 -DiskSize 50GB

# Create worker VMs with more resources
New-TalosVM -Name "talos-worker-1" -Memory 16GB -CPUs 4 -DiskSize 100GB
New-TalosVM -Name "talos-worker-2" -Memory 16GB -CPUs 4 -DiskSize 100GB
New-TalosVM -Name "talos-worker-3" -Memory 16GB -CPUs 4 -DiskSize 100GB
```

Start the VMs:

```powershell
# Start all Talos VMs
$VMs = @("talos-cp-1", "talos-cp-2", "talos-cp-3",
         "talos-worker-1", "talos-worker-2", "talos-worker-3")

foreach ($vm in $VMs) {
    Start-VM -Name $vm
    Write-Host "Started $vm"
}
```

## Generating Talos Configuration

On your management machine, generate the configuration:

```bash
# Generate Talos configuration
# Use a VIP or the IP of the first control plane node
talosctl gen config talos-hyperv-cluster "https://192.168.100.11:6443" \
  --output-dir _out

# Create a Hyper-V specific patch
cat > hyperv-patch.yaml <<'EOF'
machine:
  install:
    disk: /dev/sda
    image: ghcr.io/siderolabs/installer:v1.7.0
  network:
    interfaces:
      - interface: eth0
        dhcp: true
EOF

# Apply patches
talosctl machineconfig patch _out/controlplane.yaml \
  --patch @hyperv-patch.yaml \
  --output _out/controlplane-patched.yaml

talosctl machineconfig patch _out/worker.yaml \
  --patch @hyperv-patch.yaml \
  --output _out/worker-patched.yaml
```

## Applying Configuration

When VMs boot from the ISO, they enter maintenance mode. Check the Hyper-V console for each VM to find the assigned IP address, then apply the configuration:

```bash
# Apply configuration to each node
# Control plane nodes
talosctl apply-config --insecure --nodes 192.168.100.11 \
  --file _out/controlplane-patched.yaml

talosctl apply-config --insecure --nodes 192.168.100.12 \
  --file _out/controlplane-patched.yaml

talosctl apply-config --insecure --nodes 192.168.100.13 \
  --file _out/controlplane-patched.yaml

# Worker nodes
talosctl apply-config --insecure --nodes 192.168.100.21 \
  --file _out/worker-patched.yaml

talosctl apply-config --insecure --nodes 192.168.100.22 \
  --file _out/worker-patched.yaml

talosctl apply-config --insecure --nodes 192.168.100.23 \
  --file _out/worker-patched.yaml
```

After the nodes install Talos and reboot, remove the ISO:

```powershell
# Remove the ISO from all VMs after installation
foreach ($vm in $VMs) {
    Remove-VMDvdDrive -VMName $vm -ControllerNumber 0 -ControllerLocation 1
    Write-Host "Removed ISO from $vm"
}
```

## Bootstrapping the Cluster

```bash
# Configure talosctl
talosctl config merge _out/talosconfig
talosctl config endpoint 192.168.100.11
talosctl config node 192.168.100.11

# Bootstrap the cluster
talosctl bootstrap --nodes 192.168.100.11

# Wait for the cluster to be healthy
talosctl health --wait-timeout 15m

# Get kubeconfig
talosctl kubeconfig

# Verify
kubectl get nodes -o wide
kubectl get pods -A
```

## Post-Installation

Install essential components:

```bash
# Install a CNI
cilium install --helm-set ipam.mode=kubernetes

# Set up local path provisioner for storage
kubectl apply -f https://raw.githubusercontent.com/rancher/local-path-provisioner/v0.0.26/deploy/local-path-storage.yaml
```

## Managing VMs with PowerShell

Common management commands:

```powershell
# Check VM status
Get-VM | Where-Object { $_.Name -like "talos-*" } | Format-Table Name, State, CPUUsage, MemoryAssigned

# Create a checkpoint (snapshot) before upgrades
foreach ($vm in $VMs) {
    Checkpoint-VM -Name $vm -SnapshotName "pre-upgrade"
}

# Restore from checkpoint if needed
Restore-VMSnapshot -VMName "talos-cp-1" -Name "pre-upgrade" -Confirm:$false

# Graceful shutdown
Stop-VM -Name "talos-cp-1" -Force

# Export a VM for backup
Export-VM -Name "talos-cp-1" -Path "C:\Backups\Hyper-V"
```

## Conclusion

Hyper-V is a perfectly capable platform for running Talos Linux, especially in Windows-centric environments. The PowerShell automation makes it easy to script VM creation and management, and Generation 2 VMs provide good performance with UEFI boot support. Whether you are running a development cluster on your Windows workstation or a production cluster on Windows Server, the deployment process is consistent and reliable.
