# How to Manage KVM VMs with Proxmox on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Proxmox, KVM, Virtualization, Server Administration

Description: Learn how to create, configure, and manage KVM virtual machines with Proxmox VE, including VM lifecycle management, snapshots, and resource allocation from the CLI and web interface.

---

Proxmox VE provides an excellent web interface for managing KVM virtual machines, but understanding the underlying `qm` command-line tool gives you scripting capabilities and a deeper understanding of how everything works. This guide covers both approaches - the web UI for visual management and the `qm` CLI for automation.

## Understanding Proxmox VM IDs

Every VM and container in Proxmox has a numeric ID (VMID). IDs must be unique across the cluster and are used in all CLI commands. By convention:

- 100-199: Templates and golden images
- 200-299: Production VMs
- 300-399: Development/testing VMs

You can use any numbering scheme, but being consistent makes management easier.

## Creating a VM via the Web Interface

The web interface at `https://<proxmox-ip>:8006` provides a Create VM wizard:

1. **General**: Set VMID and Name
2. **OS**: Select the ISO image and OS type (helps Proxmox optimize defaults)
3. **System**: Leave defaults unless you need UEFI or a specific machine type
4. **Disks**: Choose disk size, format (qcow2 for snapshots, raw for performance), and storage pool
5. **CPU**: Set core count and CPU type (host = best performance, but reduces live migration compatibility)
6. **Memory**: Set RAM in MB
7. **Network**: Select the bridge (vmbr0 for network access) and model (virtio is fastest)

## Creating a VM via CLI

The `qm` command is the primary tool for VM management:

```bash
# Create a new VM with VMID 201
# This creates the VM configuration but doesn't start it yet
qm create 201 \
    --name ubuntu-web-server \
    --memory 2048 \
    --cores 2 \
    --net0 virtio,bridge=vmbr0 \
    --ostype l26

# Add a disk - create a 20GB virtio disk on the 'local-lvm' storage
qm set 201 --scsihw virtio-scsi-pci
qm set 201 --scsi0 local-lvm:20

# Add a CD drive with the Ubuntu ISO
qm set 201 --ide2 local:iso/ubuntu-22.04.4-live-server-amd64.iso,media=cdrom

# Set the boot order - boot from CD first, then disk
qm set 201 --boot order=ide2;scsi0

# Enable the QEMU guest agent (requires agent installed in VM later)
qm set 201 --agent enabled=1

# Add a serial console for emergency access
qm set 201 --serial0 socket --vga serial0
```

## VM Lifecycle Management

```bash
# Start a VM
qm start 201

# Stop a VM gracefully (sends ACPI shutdown signal)
qm shutdown 201

# Power off immediately (like pulling the plug)
qm stop 201

# Reboot
qm reboot 201

# Suspend to disk (saves state and stops the VM)
qm suspend 201

# Resume from suspend
qm resume 201

# Check VM status
qm status 201

# List all VMs and their states
qm list
```

## Connecting to VMs

### Via Web Console

In the Proxmox web interface, select the VM and click "Console". This opens a noVNC browser-based console - useful for initial setup and emergency access.

### Via SSH (After OS Installation)

Once the VM has an OS and SSH server running:

```bash
# Get the VM's IP address (requires QEMU agent)
qm agent 201 network-get-interfaces

# Connect via SSH normally
ssh user@<vm-ip>
```

### Via Serial Console

If you configured a serial console:

```bash
# Access the VM serial console from the Proxmox host
qm terminal 201
# Press Ctrl+O to exit
```

## VM Configuration Management

```bash
# View current VM configuration
qm config 201

# Example output shows all settings:
# boot: order=scsi0
# cores: 2
# memory: 2048
# name: ubuntu-web-server
# net0: virtio=BC:24:11:AA:BB:CC,bridge=vmbr0
# scsi0: local-lvm:vm-201-disk-0,size=20G

# Change CPU and memory (can be done while VM is stopped or with hotplug)
qm set 201 --cores 4 --memory 4096

# Add a second network interface
qm set 201 --net1 virtio,bridge=vmbr1

# Add additional disk storage
qm set 201 --scsi1 local-lvm:50

# Remove a device
qm set 201 --delete net1

# Set VM description/notes
qm set 201 --description "Ubuntu 22.04 web server - production"
```

## Working with Snapshots

Snapshots are one of the most valuable features of KVM virtualization. They let you capture a point-in-time state of a VM and roll back if needed.

```bash
# Create a snapshot (VM can be running or stopped)
# Include memory state with --vmstate 1 (only works when VM is running)
qm snapshot 201 before-update --description "Pre-update snapshot $(date)"

# List snapshots for a VM
qm listsnapshot 201

# Roll back to a snapshot (VM must be stopped)
qm stop 201
qm rollback 201 before-update

# Delete a snapshot
qm delsnapshot 201 before-update

# Delete all snapshots
qm listsnapshot 201 | awk '{print $2}' | grep -v '^$' | xargs -I{} qm delsnapshot 201 {}
```

## VM Cloning and Templates

### Creating a VM Template

Templates are read-only VMs used as a base for cloning. Convert a VM to a template after removing machine-specific configuration:

```bash
# First, prepare the VM for templating (from inside the VM)
# sudo cloud-init clean  (for cloud images)
# sudo truncate -s 0 /etc/machine-id
# sudo poweroff

# Convert VM to template (cannot be undone without cloning)
qm template 201
```

### Cloning VMs

```bash
# Full clone - completely independent copy
qm clone 201 301 --name web-server-clone --full

# Linked clone - shares base disk with template (faster, saves space)
# Requires the source to be a template
qm clone 101 202 --name web-from-template

# Clone with custom storage destination
qm clone 101 203 --name dev-server --storage local-lvm --full
```

## Resource Management and Monitoring

```bash
# View real-time resource usage for a VM
qm monitor 201
# Inside the monitor prompt, type 'info' for available commands

# Get CPU and memory stats (requires QEMU agent)
qm agent 201 get-vcpus
qm agent 201 get-memory-blocks

# Run arbitrary QEMU guest agent commands
qm agent 201 exec --command '{"execute":"guest-exec","arguments":{"path":"df","arg":["-h"],"capture-output":true}}'
```

From the Proxmox web interface, the Summary tab shows CPU, memory, disk I/O, and network usage over time.

## Backup and Restore

```bash
# Backup a VM to the backup storage (VM can be running - Proxmox handles snapshot)
vzdump 201 --storage local-backup --mode snapshot --compress zstd

# Schedule automated backups via web interface:
# Datacenter > Backup > Add
# Or via cron with vzdump

# Restore from backup
qmrestore /var/lib/vz/dump/vzdump-qemu-201-2026_03_02-10_00_00.vma.zst 201

# Restore to a different VMID
qmrestore /var/lib/vz/dump/vzdump-qemu-201-2026_03_02-10_00_00.vma.zst 205 --force
```

## Migrating VMs

Proxmox supports live migration between cluster nodes without downtime (with shared storage) or offline migration (with local storage):

```bash
# Online live migration to another node (requires shared storage or storage migration)
qm migrate 201 pve2 --online

# Offline migration with storage migration
qm migrate 201 pve2 --targetstorage local-lvm
```

## Scripting VM Deployments

Combine these commands to automate VM provisioning:

```bash
#!/bin/bash
# deploy-ubuntu-vm.sh - Quickly deploy Ubuntu VMs from a template

TEMPLATE_ID=101
BASE_ID=300

deploy_vm() {
    local name=$1
    local memory=$2
    local cores=$3

    # Find next available VMID
    local vmid=$(pvesh get /cluster/nextid)

    echo "Deploying $name as VMID $vmid..."

    # Clone from template
    qm clone "$TEMPLATE_ID" "$vmid" --name "$name" --full --storage local-lvm

    # Configure resources
    qm set "$vmid" --memory "$memory" --cores "$cores"

    # Start the VM
    qm start "$vmid"

    echo "VM $name ($vmid) deployed and started"
}

# Deploy several VMs
deploy_vm "web-01" 2048 2
deploy_vm "web-02" 2048 2
deploy_vm "db-01" 8192 4
```

## Summary

Proxmox VE's `qm` command and web interface together give you complete control over KVM VMs. The web interface is excellent for day-to-day management and visualization, while the CLI enables automation and scripting that isn't practical through a browser. Understanding both makes you effective whether you're managing a single dev server or a fleet of production VMs.
