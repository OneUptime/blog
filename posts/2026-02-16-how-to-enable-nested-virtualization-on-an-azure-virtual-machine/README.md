# How to Enable Nested Virtualization on an Azure Virtual Machine

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Virtual Machine, Nested Virtualization, Hyper-V, DevOps, Cloud Computing

Description: Learn how to enable and use nested virtualization on Azure VMs for running hypervisors, containers, and development environments inside a VM.

---

Nested virtualization lets you run a hypervisor inside an Azure VM, which means you can create virtual machines inside your virtual machine. It sounds like inception, and yes, there is a performance cost, but there are legitimate use cases that make it worthwhile.

I first needed nested virtualization for a CI/CD pipeline that tested Hyper-V configurations. Spinning up physical Hyper-V servers for each test run was not practical, and the tests needed actual Hyper-V functionality - not just a mock. Running Hyper-V inside an Azure VM solved the problem.

## Use Cases for Nested Virtualization

Before diving into the how, here is why you might want this:

**Development and testing**: Developers building hypervisor-level features or testing VM-based deployment tools need access to a real hypervisor. Nested virtualization provides this in a cloud-friendly way.

**Training environments**: Create isolated lab environments where students can practice creating and managing VMs without needing access to physical hardware.

**Legacy application isolation**: Some applications expect to run inside a VM. Nesting lets you run those applications in their expected environment within Azure.

**Container host testing**: Testing Windows containers with Hyper-V isolation requires nested virtualization.

**Running emulators**: Android emulators and certain IoT device emulators need hardware virtualization support.

## VM Size Requirements

Not all Azure VM sizes support nested virtualization. You need a VM size whose Azure size documentation lists Nested Virtualization as supported. The following VM families are common choices:

- Dv3 and Dsv3 series
- Dv4 and Dsv4 series
- Dv5 and Dsv5 series
- Ev3 and Esv3 series
- Ev4 and Esv4 series
- Ev5 and Esv5 series
- Fsv2 series

The B-series and A-series do not support nested virtualization. AMD-based v6 families such as Dalsv6 and Easv6 also support nested virtualization, while some older AMD families do not. When in doubt, check the Azure documentation for your specific VM size.

```bash
# Create a VM with a size that supports nested virtualization

az vm create \
  --resource-group myResourceGroup \
  --name nestedVM \
  --image Win2022Datacenter \
  --size Standard_D4s_v5 \
  --security-type Standard \
  --admin-username azureuser \
  --admin-password 'YourSecurePassword123!'
```

## Enabling Hyper-V on Windows Server

For Windows VMs, enabling nested virtualization means installing the Hyper-V role. Connect to your VM via RDP and follow these steps:

```powershell
# Install the Hyper-V role and management tools
Install-WindowsFeature -Name Hyper-V -IncludeManagementTools -Restart
```

After the restart, verify Hyper-V is running:

```powershell
# Verify Hyper-V is installed and running
Get-WindowsFeature Hyper-V

# Check that the hypervisor is active
Get-VMHost

# Verify hardware virtualization support
systeminfo | Select-String "Hyper-V"
```

After Hyper-V is installed and active, `systeminfo` usually reports that a hypervisor has been detected instead of listing the individual Hyper-V requirements. Before installing Hyper-V, those requirements should show hardware-assisted virtualization, Data Execution Prevention, and Second Level Address Translation (SLAT) as available.

## Enabling KVM on Linux

For Linux VMs, nested virtualization uses KVM (Kernel-based Virtual Machine). First, verify that the CPU supports virtualization:

```bash
# Check for virtualization support
grep -E 'vmx|svm' /proc/cpuinfo

# If you see vmx flags, Intel VT-x is available; if you see svm flags, AMD-V is available
# Install KVM and related tools on Ubuntu
sudo apt update
sudo apt install -y qemu-kvm qemu-utils libvirt-daemon-system libvirt-clients bridge-utils virtinst cloud-image-utils

# Verify KVM is loaded
lsmod | grep kvm

# Check that the KVM device exists
ls -la /dev/kvm

# Verify everything works
sudo virt-host-validate
```

If `/proc/cpuinfo` does not show vmx or svm flags, your VM size does not support nested virtualization. Switch to a supported size.

## Creating Nested VMs on Windows (Hyper-V)

Once Hyper-V is enabled, you can create VMs inside your Azure VM. There are some networking considerations though.

### Networking Setup

The trickiest part of nested virtualization is networking. The nested VMs need to communicate with the outside world, but Azure's network does not natively see them. You have a few options:

**NAT networking** (simplest): The nested VMs share the host VM's IP address through NAT.

```powershell
# Create an internal virtual switch with NAT
New-VMSwitch -Name "NATSwitch" -SwitchType Internal

# Get the interface index of the new switch
$ifIndex = (Get-NetAdapter | Where-Object {$_.Name -like "*NATSwitch*"}).ifIndex

# Assign an IP to the host side of the switch
New-NetIPAddress -IPAddress 192.168.100.1 -PrefixLength 24 -InterfaceIndex $ifIndex

# Create the NAT rule
New-NetNat -Name "NestedVMNAT" -InternalIPInterfaceAddressPrefix 192.168.100.0/24
```

**External switch with MAC spoofing**: A Hyper-V option when you control the outer virtualization host, but not the usual choice in Azure public cloud. Azure networking does not natively learn the MAC addresses of your nested VMs, so NAT is the supported approach for most Azure VM nested virtualization setups.

### Creating a Nested VM

```powershell
# Create a new nested VM
New-VM -Name "NestedVM01" `
  -MemoryStartupBytes 2GB `
  -Generation 2 `
  -NewVHDPath "C:\VMs\NestedVM01.vhdx" `
  -NewVHDSizeBytes 40GB `
  -SwitchName "NATSwitch"

# Attach an ISO for OS installation
Add-VMDvdDrive -VMName "NestedVM01" -Path "C:\ISOs\ubuntu-22.04.iso"

# Configure the VM
Set-VM -Name "NestedVM01" `
  -ProcessorCount 2 `
  -DynamicMemory `
  -MemoryMinimumBytes 1GB `
  -MemoryMaximumBytes 4GB

# Start the VM
Start-VM -Name "NestedVM01"
```

## Creating Nested VMs on Linux (KVM)

With KVM installed, you can use virt-install to create nested VMs:

```bash
# Download an OS image
wget https://releases.ubuntu.com/22.04/ubuntu-22.04-live-server-amd64.iso \
  -O /var/lib/libvirt/images/ubuntu-22.04.iso

# Create a nested VM
sudo virt-install \
  --name nested-vm-01 \
  --ram 2048 \
  --vcpus 2 \
  --disk path=/var/lib/libvirt/images/nested-vm-01.qcow2,size=20 \
  --os-variant ubuntu22.04 \
  --network network=default \
  --cdrom /var/lib/libvirt/images/ubuntu-22.04.iso \
  --graphics vnc,listen=0.0.0.0 \
  --noautoconsole

# List running nested VMs
sudo virsh list --all

# Connect to the VM console
sudo virsh console nested-vm-01
```

For automated deployments using cloud images instead of ISOs:

```bash
# Download a cloud image
wget https://cloud-images.ubuntu.com/jammy/current/jammy-server-cloudimg-amd64.img \
  -O /var/lib/libvirt/images/ubuntu-base.img

# Create a disk from the cloud image
sudo qemu-img create -f qcow2 -b /var/lib/libvirt/images/ubuntu-base.img \
  -F qcow2 /var/lib/libvirt/images/nested-vm-01.qcow2 20G

# Create a cloud-init configuration
cat > /tmp/cloud-init.yaml << 'CIEOF'
#cloud-config
hostname: nested-vm-01
users:
  - name: admin
    ssh_authorized_keys:
      - ssh-rsa AAAA...your-key-here
    sudo: ALL=(ALL) NOPASSWD:ALL
    shell: /bin/bash
CIEOF

# Create the cloud-init ISO
sudo cloud-localds /var/lib/libvirt/images/nested-vm-01-cidata.iso /tmp/cloud-init.yaml

# Create the VM with cloud-init
sudo virt-install \
  --name nested-vm-01 \
  --ram 2048 \
  --vcpus 2 \
  --disk path=/var/lib/libvirt/images/nested-vm-01.qcow2 \
  --disk path=/var/lib/libvirt/images/nested-vm-01-cidata.iso,device=cdrom \
  --os-variant ubuntu22.04 \
  --network network=default \
  --import \
  --noautoconsole
```

## Performance Considerations

Nested virtualization introduces overhead. The nested hypervisor intercepts and emulates certain operations, which adds latency. Here is what to expect:

- CPU performance: Usually 5-15% overhead for compute-bound workloads.
- Memory: The host VM needs enough memory for itself plus all nested VMs. There is no memory overcommit magic happening.
- Disk I/O: Nested VMs writing to virtual disks on top of Azure managed disks adds latency. Use Premium SSD or Ultra Disk for the host VM if I/O matters.
- Networking: NAT networking adds some overhead. For throughput-sensitive workloads, consider Accelerated Networking on the host VM (though this does not help the nested VMs directly).

## Monitoring Nested Environments

Monitoring nested VMs is tricky because Azure only sees the host VM. The nested VMs are invisible to Azure Monitor. You need to install monitoring agents inside the nested VMs and have them report to your monitoring platform independently.

OneUptime can monitor both the host VM (through Azure integration) and the nested VMs (through agents installed inside them). This gives you a unified view of the entire nested environment.

```bash
# Inside a nested Linux VM, check resource usage
top -bn1 | head -20
free -h
df -h
```

## Security Considerations

Running nested virtualization increases the attack surface. The nested hypervisor is another layer of software that could have vulnerabilities. Keep the hypervisor (Hyper-V or KVM) patched and updated. Apply the same security practices to nested VMs as you would to any other VM - firewall rules, limited access, regular patching.

Also, be aware that Azure's security features like Just-in-Time VM access, Azure Defender, and NSG rules only apply to the host VM. Nested VMs need their own security controls.

## Wrapping Up

Nested virtualization on Azure is a powerful feature for specific use cases. Pick the right VM size, install the hypervisor (Hyper-V on Windows or KVM on Linux), configure networking carefully, and plan for the performance overhead. It is not meant for running production workloads inside nested VMs - that is what regular Azure VMs are for. But for development, testing, training, and running hypervisor-dependent software, it is exactly the right tool.
