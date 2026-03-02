# How to Use virt-manager GUI for VM Management on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, KVM, virt-manager, Virtualization

Description: Learn how to install and use virt-manager on Ubuntu to create, configure, and manage KVM virtual machines through a graphical interface.

---

virt-manager (Virtual Machine Manager) is a desktop application for managing KVM virtual machines. It provides a graphical interface on top of libvirt, making VM creation and management accessible without memorizing virsh commands. It also supports managing remote hypervisors over SSH, which makes it useful for administering headless servers from your workstation.

## Installing virt-manager

On a desktop Ubuntu system:

```bash
sudo apt update
sudo apt install virt-manager

# Also install supporting packages if not already present
sudo apt install qemu-kvm libvirt-daemon-system libvirt-clients

# Add your user to the required groups
sudo usermod -aG libvirt $USER
sudo usermod -aG kvm $USER

# Log out and back in for group changes to take effect
```

On a headless server that you will manage remotely:

```bash
# Server needs libvirt but not virt-manager itself
sudo apt install qemu-kvm libvirt-daemon-system libvirt-clients

# On your local workstation (Ubuntu desktop):
sudo apt install virt-manager
```

## Launching virt-manager

```bash
# Start from terminal
virt-manager

# Or search "Virtual Machine Manager" in your application menu
```

The main window shows all configured connections and their virtual machines. By default, it connects to the local QEMU/KVM hypervisor.

## Connecting to a Remote Hypervisor

One of virt-manager's most useful features is remote management:

1. Go to **File > Add Connection**
2. Select "QEMU/KVM" as the hypervisor
3. Check "Connect to remote host over SSH"
4. Enter the hostname and username
5. Click "Connect"

From the command line:

```bash
# Connect virt-manager directly to a remote host
virt-manager --connect qemu+ssh://user@remote-server/system
```

Set up SSH key authentication first to avoid password prompts:

```bash
# Generate SSH key if you don't have one
ssh-keygen -t ed25519 -f ~/.ssh/virt-manager-key

# Copy to remote server
ssh-copy-id -i ~/.ssh/virt-manager-key.pub user@remote-server
```

## Creating a New Virtual Machine

Click the "Create a new virtual machine" button (or go to **File > New Virtual Machine**).

The wizard walks through five steps:

### Step 1: Installation Source

Choose how to install the OS:
- **Local install media**: ISO file or CD/DVD
- **Network Install**: URL of an installation mirror
- **Import existing disk image**: Use a pre-existing disk image
- **Manual install**: Manually configure without automatic OS detection

For a new install with an ISO:

```bash
# Download Ubuntu Server ISO
wget -P ~/Downloads \
  https://releases.ubuntu.com/22.04/ubuntu-22.04.4-live-server-amd64.iso
```

Then select this ISO in the wizard.

### Step 2: OS Selection

virt-manager tries to detect the OS automatically. You can search manually if it doesn't:
- Type "ubuntu" in the search box
- Select the correct version (e.g., "Ubuntu 22.04 LTS")

Getting this right matters for virt-manager to apply optimal defaults.

### Step 3: Memory and CPU

Set the resources the VM will have. Recommended minimums:
- Ubuntu Server: 1 GB RAM, 1 vCPU
- Ubuntu Desktop: 2 GB RAM, 2 vCPUs
- Production workloads: Size based on your application requirements

### Step 4: Storage

Configure the primary disk:
- **Disk size**: How much storage to allocate
- **Storage path**: Where to create the disk image (default: `/var/lib/libvirt/images/`)
- **Format**: qcow2 is the best choice - it supports snapshots and thin provisioning

### Step 5: Network and Review

Select the network:
- **Virtual network 'default'**: NAT networking, VMs can reach internet but aren't directly accessible
- **Bridge device**: Your VM gets a real LAN IP address (requires bridge setup)

Check "Customize configuration before install" if you want to adjust anything before starting.

## Modifying VM Hardware

Select a VM and click "Open" to see its details. Then click the information (i) icon to access hardware configuration.

### Adding a Disk

1. Click "Add Hardware" at the bottom
2. Select "Storage"
3. Set the disk size and format
4. Choose the device type: VirtIO Disk (best performance), SATA, or IDE
5. Click "Finish"

### Adding a Network Interface

1. Click "Add Hardware"
2. Select "Network"
3. Choose the virtual network
4. Select "VirtIO" as the device model for best performance
5. Click "Finish"

### Adjusting CPU and Memory

1. Click "CPUs" in the hardware list
2. Change the vCPU count
3. Enable CPU topology (sockets, cores, threads) for NUMA-aware applications
4. Click "Memory" to adjust RAM allocation

### Enabling CPU Features

For maximum performance, set the CPU model to match the host:

1. Click "CPUs"
2. In "Configuration", change CPU model to "host-passthrough"
3. This exposes all host CPU features to the VM but reduces migration compatibility

## Viewing the VM Console

Double-click a running VM to open its console window. virt-manager supports:
- **VNC**: Default display, works everywhere but slower
- **SPICE**: Better performance, supports clipboard sharing, USB redirection, and file transfers
- **Serial console**: Text-only, useful for headless VMs

Switch between graphical and serial console with the menu at the top of the console window.

### Using SPICE for Better Performance

Edit the VM's display settings:

1. Open VM details
2. Click "Display Spice" (or add one via "Add Hardware > Graphics")
3. Set type to SPICE server
4. Install SPICE guest tools in the VM:

```bash
# Inside the guest VM
sudo apt install spice-vdagent xserver-xorg-video-qxl
```

## Managing VM Snapshots

Right-click a VM and select "Manage Snapshots" or use the snapshot icon in the VM console window.

Creating a snapshot:

1. Click the "+" button
2. Give the snapshot a name (e.g., "before-nginx-install")
3. Add an optional description
4. Click "Finish"

Reverting to a snapshot:

1. Select the snapshot from the list
2. Click the "Play" button to revert

Deleting old snapshots:

1. Select the snapshot
2. Click the trash icon

## Cloning Virtual Machines

Right-click a stopped VM in the main window:

1. Select "Clone"
2. Give the clone a new name
3. Choose whether to copy all disks or share them
4. Click "Clone"

The clone gets a new UUID and new MAC addresses for all network interfaces.

## Remote Display with SSH Tunneling

When managing remote VMs, the display traffic goes over the SSH connection automatically. For direct SPICE access without virt-manager:

```bash
# Get the SPICE port from virsh
virsh domdisplay myvm
# Output: spice://127.0.0.1:5900

# Create SSH tunnel for SPICE access
ssh -L 5900:127.0.0.1:5900 user@remote-server

# Connect with remote-viewer on your local machine
sudo apt install virt-viewer
remote-viewer spice://127.0.0.1:5900
```

## Performance Tips for virt-manager VMs

Set these options for better VM performance:

1. **Disk bus**: Use VirtIO, not SATA or IDE
2. **Network model**: Use VirtIO, not e1000 or rtl8139
3. **Video model**: QXL for SPICE, Virtio for better 2D performance
4. **Memory balloon**: Disable if VM has a fixed workload (avoids memory fluctuation)
5. **CPU model**: "host-passthrough" for maximum performance

Install VirtIO drivers inside the guest:

```bash
# Inside Ubuntu guest VM
sudo apt install qemu-guest-agent virtio-modules-common

# Start the guest agent
sudo systemctl enable --now qemu-guest-agent
```

The guest agent enables virt-manager to query the VM's IP addresses, take consistent snapshots, and perform graceful shutdowns.

virt-manager is the right tool when you want a graphical overview of your VM infrastructure without leaving the Linux ecosystem. It handles most day-to-day management tasks visually while still giving you access to the underlying virsh commands when you need more control.
