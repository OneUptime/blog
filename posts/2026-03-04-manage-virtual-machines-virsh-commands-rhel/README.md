# How to Manage Virtual Machines with virsh Commands on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, KVM, virsh, Virtual Machine, libvirt, Virtualization, Linux

Description: Learn the essential virsh commands for managing KVM virtual machines on RHEL, covering lifecycle management, configuration, monitoring, and troubleshooting.

---

`virsh` is the primary command-line tool for managing KVM virtual machines through libvirt on RHEL. It provides complete control over VM lifecycle, configuration, and monitoring. This guide covers the most commonly used commands.

## VM Lifecycle Management

```bash
# List running VMs
sudo virsh list

# List all VMs (including stopped)
sudo virsh list --all

# Start a VM
sudo virsh start rhel9-vm

# Shut down a VM gracefully (sends ACPI shutdown)
sudo virsh shutdown rhel9-vm

# Force stop a VM (like pulling the power cord)
sudo virsh destroy rhel9-vm

# Reboot a VM
sudo virsh reboot rhel9-vm

# Pause (suspend) a VM
sudo virsh suspend rhel9-vm

# Resume a paused VM
sudo virsh resume rhel9-vm

# Set a VM to auto-start on host boot
sudo virsh autostart rhel9-vm

# Disable auto-start
sudo virsh autostart --disable rhel9-vm
```

## VM Information and Monitoring

```bash
# Show detailed VM information
sudo virsh dominfo rhel9-vm

# View VM XML configuration
sudo virsh dumpxml rhel9-vm

# Check VM state
sudo virsh domstate rhel9-vm

# View CPU usage statistics
sudo virsh cpu-stats rhel9-vm

# View memory statistics
sudo virsh dommemstat rhel9-vm

# List network interfaces and their MAC addresses
sudo virsh domiflist rhel9-vm

# Get IP address of a VM
sudo virsh domifaddr rhel9-vm

# List block devices
sudo virsh domblklist rhel9-vm

# View block I/O statistics
sudo virsh domblkstat rhel9-vm vda
```

## Configuration Management

```bash
# Edit a VM's XML configuration
sudo virsh edit rhel9-vm

# Define a VM from an XML file
sudo virsh define /path/to/vm.xml

# Undefine (delete) a VM definition
sudo virsh undefine rhel9-vm

# Undefine and remove all storage
sudo virsh undefine rhel9-vm --remove-all-storage

# Rename a VM (must be shut down)
sudo virsh domrename old-name new-name
```

## Console Access

```bash
# Open a serial console to a VM
sudo virsh console rhel9-vm

# Open a graphical console
sudo virsh domdisplay rhel9-vm
# Returns the VNC/SPICE connection URI
```

## Resource Management on the Fly

```bash
# Change memory allocation (live)
sudo virsh setmem rhel9-vm 4G --live

# Change vCPU count (live)
sudo virsh setvcpus rhel9-vm 4 --live

# Pin a vCPU to a physical CPU
sudo virsh vcpupin rhel9-vm 0 2
```

## Useful Batch Operations

```bash
# Shut down all running VMs
for vm in $(sudo virsh list --name); do
    sudo virsh shutdown "$vm"
done

# Start all VMs that are configured for autostart
for vm in $(sudo virsh list --autostart --name --all); do
    sudo virsh start "$vm" 2>/dev/null
done
```

The `virsh` command supports tab completion on most RHEL installations. Use `virsh help` to see all available command categories and `virsh help <command>` for detailed usage of any specific command.
