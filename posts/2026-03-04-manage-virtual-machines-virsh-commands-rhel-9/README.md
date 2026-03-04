# How to Manage Virtual Machines with virsh Commands on RHEL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, KVM, virsh, Virtualization, Management, Linux

Description: Learn the essential virsh commands for managing KVM virtual machine lifecycle, configuration, and monitoring on RHEL.

---

The `virsh` command is the primary CLI tool for managing KVM virtual machines on RHEL. It provides complete control over VM lifecycle, configuration, storage, networking, and monitoring. This guide covers the most important virsh commands for daily VM administration.

## VM Lifecycle Commands

### Listing VMs

```bash
# List running VMs
sudo virsh list

# List all VMs (including stopped)
sudo virsh list --all

# List with details
sudo virsh list --all --title
```

### Starting and Stopping

```bash
# Start a VM
sudo virsh start vmname

# Graceful shutdown (ACPI signal)
sudo virsh shutdown vmname

# Force power off
sudo virsh destroy vmname

# Reboot
sudo virsh reboot vmname

# Suspend (pause)
sudo virsh suspend vmname

# Resume
sudo virsh resume vmname
```

### Autostart

```bash
# Enable autostart
sudo virsh autostart vmname

# Disable autostart
sudo virsh autostart --disable vmname
```

## VM Information

```bash
# General info
sudo virsh dominfo vmname

# Detailed XML configuration
sudo virsh dumpxml vmname

# State
sudo virsh domstate vmname

# OS information
sudo virsh domostype vmname
```

## Configuration Management

### Editing VM Configuration

```bash
sudo virsh edit vmname
```

This opens the VM's XML in your editor. Changes take effect after the next boot.

### Renaming a VM

```bash
# VM must be shut down
sudo virsh domrename oldname newname
```

### Undefining (Deleting) a VM

```bash
# Delete VM definition (keeps disks)
sudo virsh undefine vmname

# Delete VM and its disks
sudo virsh undefine vmname --remove-all-storage

# Delete VM with UEFI/NVRAM
sudo virsh undefine vmname --nvram
```

## Resource Management

```bash
# Set vCPUs
sudo virsh setvcpus vmname 4 --live

# Set memory
sudo virsh setmem vmname 4G --live

# View CPU info
sudo virsh vcpuinfo vmname

# View memory stats
sudo virsh dommemstat vmname
```

## Network Management

```bash
# List VM interfaces
sudo virsh domiflist vmname

# Get VM IP addresses
sudo virsh domifaddr vmname

# Interface statistics
sudo virsh domifstat vmname vnet0

# Attach a new interface
sudo virsh attach-interface vmname --type network --source default --model virtio --persistent

# Detach an interface
sudo virsh detach-interface vmname --type network --mac 52:54:00:00:00:01
```

## Storage Management

```bash
# List VM disks
sudo virsh domblklist vmname

# Disk info
sudo virsh domblkinfo vmname vda

# Disk statistics
sudo virsh domblkstat vmname vda

# Attach a disk
sudo virsh attach-disk vmname /path/to/disk.qcow2 vdb --driver qemu --subdriver qcow2 --persistent

# Detach a disk
sudo virsh detach-disk vmname vdb --persistent
```

## Console Access

```bash
# Serial console
sudo virsh console vmname

# Open graphical viewer
sudo virsh domdisplay vmname
```

## Snapshots

```bash
# Create snapshot
sudo virsh snapshot-create-as vmname snap1 --description "Before update"

# List snapshots
sudo virsh snapshot-list vmname

# Revert to snapshot
sudo virsh snapshot-revert vmname snap1

# Delete snapshot
sudo virsh snapshot-delete vmname snap1
```

## Monitoring

```bash
# CPU statistics
sudo virsh domstats --vcpu

# Memory statistics
sudo virsh domstats --balloon

# Block I/O statistics
sudo virsh domstats --block

# All statistics
sudo virsh domstats vmname

# Real-time monitoring
sudo virt-top
```

## Bulk Operations

```bash
# Shutdown all running VMs
for VM in $(sudo virsh list --name); do
    sudo virsh shutdown "$VM"
done

# Start all VMs
for VM in $(sudo virsh list --all --name); do
    sudo virsh start "$VM" 2>/dev/null
done
```

## Summary

The `virsh` command on RHEL provides comprehensive KVM VM management. Use lifecycle commands for start/stop/reboot, `virsh edit` for configuration changes, attach/detach commands for dynamic resource management, and domstats for monitoring. For complex operations, combine virsh with shell scripting for automation.
