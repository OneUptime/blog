# How to Manage VMs with virsh Command Line on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, KVM, Virsh, Virtualization

Description: Master the virsh command-line tool for managing KVM virtual machines on Ubuntu, covering VM lifecycle, networking, storage, and resource management operations.

---

virsh is the primary command-line interface for managing KVM virtual machines through libvirt. Once you understand its structure, it becomes faster and more scriptable than any GUI. This guide covers the essential virsh operations for day-to-day VM management.

## Understanding virsh Basics

virsh connects to the libvirt daemon and accepts commands in two modes:
- **Direct mode:** `virsh <command> [arguments]`
- **Interactive shell:** Run `virsh` alone to enter the shell, then type commands

```bash
# Run a single command
virsh list

# Enter interactive shell
virsh
# virsh # list
# virsh # quit
```

virsh can connect to local or remote hypervisors:

```bash
# Connect to local hypervisor (default)
virsh -c qemu:///system list

# Connect to remote hypervisor over SSH
virsh -c qemu+ssh://user@remote-host/system list
```

## VM Lifecycle Management

### Creating VMs

`virt-install` is the primary tool for creating new VMs:

```bash
# Create a VM from an ISO
sudo virt-install \
  --name myvm \
  --memory 2048 \
  --vcpus 2 \
  --disk size=20,format=qcow2 \
  --cdrom /path/to/ubuntu-22.04.iso \
  --os-variant ubuntu22.04 \
  --network network=default \
  --graphics spice

# Create a minimal VM for testing
sudo virt-install \
  --name test-vm \
  --memory 512 \
  --vcpus 1 \
  --disk size=8,format=qcow2 \
  --import \
  --disk /var/lib/libvirt/images/ubuntu-base.qcow2 \
  --os-variant ubuntu22.04 \
  --network network=default \
  --noautoconsole
```

### Starting and Stopping VMs

```bash
# List all VMs (including stopped ones)
virsh list --all

# Start a VM
virsh start myvm

# Graceful shutdown (sends shutdown signal to OS)
virsh shutdown myvm

# Force off (like unplugging power)
virsh destroy myvm

# Reboot
virsh reboot myvm

# Pause (suspend to memory)
virsh suspend myvm

# Resume from pause
virsh resume myvm

# Save VM state to disk (like hibernate)
virsh save myvm /tmp/myvm.state

# Restore saved state
virsh restore /tmp/myvm.state
```

### Autostart Configuration

```bash
# Enable autostart when host boots
virsh autostart myvm

# Disable autostart
virsh autostart --disable myvm

# Check autostart status
virsh dominfo myvm | grep Autostart
```

## Getting VM Information

```bash
# Basic VM information
virsh dominfo myvm

# VM XML configuration
virsh dumpxml myvm

# VM XML to a file for editing
virsh dumpxml myvm > myvm-config.xml

# CPU and memory usage
virsh domstats myvm

# Network interface information (shows IP addresses)
virsh domifaddr myvm

# Block device information
virsh domblkinfo myvm

# List snapshots
virsh snapshot-list myvm
```

## Editing VM Configuration

```bash
# Edit VM XML configuration (opens in $EDITOR)
sudo virsh edit myvm

# Add a device via XML snippet
# Create device XML first, then:
virsh attach-device myvm /tmp/new-disk.xml --config

# Remove a device
virsh detach-device myvm /tmp/device.xml --config
```

## CPU and Memory Management

```bash
# Set CPU count (while VM is off)
virsh setvcpus myvm 4 --config

# Hot-add CPUs (if VM supports it)
virsh setvcpus myvm 4 --live

# Set maximum memory (requires VM restart)
virsh setmaxmem myvm 8G --config

# Set current memory allocation
virsh setmem myvm 4G --live
virsh setmem myvm 4G --config

# Pin VM vCPUs to specific host CPUs
virsh vcpupin myvm 0 2  # Pin vCPU 0 to host CPU 2
virsh vcpupin myvm 1 3  # Pin vCPU 1 to host CPU 3
```

## Disk Management

```bash
# List VM disks
virsh domblklist myvm

# Attach a new disk image
sudo qemu-img create -f qcow2 /var/lib/libvirt/images/myvm-data.qcow2 50G
virsh attach-disk myvm \
  /var/lib/libvirt/images/myvm-data.qcow2 \
  vdb \
  --driver qemu \
  --subdriver qcow2 \
  --persistent

# Detach a disk
virsh detach-disk myvm vdb --persistent

# Get disk performance statistics
virsh domblkstat myvm vda

# Resize a disk (requires VM shutdown for safe resize)
virsh shutdown myvm
sudo qemu-img resize /var/lib/libvirt/images/myvm.qcow2 +20G
```

## Network Management

```bash
# List network interfaces for a VM
virsh domiflist myvm

# Add a network interface
virsh attach-interface myvm \
  --type network \
  --source default \
  --model virtio \
  --persistent

# Remove a network interface (specify MAC address)
virsh detach-interface myvm \
  --type network \
  --mac 52:54:00:ab:cd:ef \
  --persistent

# Get network I/O statistics
virsh domifstat myvm vnet0

# List all virtual networks
virsh net-list --all

# View network configuration
virsh net-dumpxml default

# Create a new virtual network
cat > /tmp/isolated-network.xml << 'EOF'
<network>
  <name>isolated</name>
  <bridge name='virbr1'/>
  <ip address='192.168.200.1' netmask='255.255.255.0'>
    <dhcp>
      <range start='192.168.200.100' end='192.168.200.200'/>
    </dhcp>
  </ip>
</network>
EOF
virsh net-define /tmp/isolated-network.xml
virsh net-start isolated
virsh net-autostart isolated
```

## Snapshot Management

```bash
# Create a snapshot (VM can be running for external snapshots)
virsh snapshot-create-as myvm \
  --name "before-upgrade" \
  --description "Snapshot before OS upgrade"

# List snapshots
virsh snapshot-list myvm

# Show snapshot details
virsh snapshot-info myvm before-upgrade

# Revert to a snapshot
virsh snapshot-revert myvm before-upgrade

# Delete a snapshot
virsh snapshot-delete myvm before-upgrade
```

## Cloning VMs

```bash
# Clone a shut-down VM
virsh shutdown myvm
virt-clone \
  --original myvm \
  --name myvm-clone \
  --auto-clone

# Clone to a specific disk location
virt-clone \
  --original myvm \
  --name myvm-clone2 \
  --file /var/lib/libvirt/images/myvm-clone2.qcow2
```

## Batch Operations with virsh

virsh is scriptable for managing multiple VMs:

```bash
# Shut down all running VMs
for vm in $(virsh list --name); do
    echo "Shutting down $vm"
    virsh shutdown "$vm"
done

# Wait for all VMs to stop
for vm in $(virsh list --name); do
    timeout 60 virsh wait "$vm" --state shutoff
    echo "$vm stopped"
done

# Start all VMs that have autostart disabled
for vm in $(virsh list --all --name); do
    virsh start "$vm" 2>/dev/null && echo "Started $vm" || true
done

# Backup all VM XML configurations
mkdir -p /backup/vm-configs
for vm in $(virsh list --all --name); do
    virsh dumpxml "$vm" > "/backup/vm-configs/${vm}.xml"
    echo "Saved config for $vm"
done
```

## Monitoring VM Performance

```bash
# Real-time stats for a specific VM
virsh domstats myvm

# CPU usage percentage
virsh domstats myvm --cpu-total

# Memory usage
virsh domstats myvm --balloon

# Block I/O stats
virsh domblkstat myvm

# Network stats
virsh domifstat myvm vnet0

# Install virt-top for a top-like view of all VMs
sudo apt install virt-top
virt-top
```

## Connecting to VM Console

```bash
# Connect to serial console (requires console configured in VM)
virsh console myvm

# Connect via VNC (get VNC display number)
virsh vncdisplay myvm
# Then: vncviewer localhost:<display>

# Get SPICE connection info
virsh domdisplay myvm
```

virsh covers the full lifecycle of virtual machine management from creation through deletion. Combined with shell scripting, it handles everything from simple single-VM administration to complex multi-host environments. The consistent syntax and XML-based configuration model make it reliable for automation in ways that GUI tools cannot match.
