# How to Clone a Virtual Machine on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, KVM, Clone, virt-clone, Virtual Machine, Virtualization, Linux

Description: Learn how to clone KVM virtual machines on RHEL using virt-clone and virt-sysprep, creating independent copies for testing, development, or deployment.

---

Cloning a virtual machine creates an independent copy with its own disk image and unique identifiers. This is faster than installing from scratch and useful for creating test environments, templates, or development copies.

## Cloning with virt-clone

The source VM must be shut down before cloning:

```bash
# Shut down the source VM
sudo virsh shutdown rhel9-vm

# Wait for it to fully stop
sudo virsh list --all | grep rhel9-vm

# Clone the VM
sudo virt-clone \
  --original rhel9-vm \
  --name rhel9-clone \
  --auto-clone

# --auto-clone automatically generates new disk paths and MAC addresses
```

## Cloning with Custom Disk Location

```bash
# Clone with a specific disk path
sudo virt-clone \
  --original rhel9-vm \
  --name rhel9-dev \
  --file /var/lib/libvirt/images/rhel9-dev.qcow2
```

## Cloning a VM with Multiple Disks

```bash
# Specify paths for each disk
sudo virt-clone \
  --original multi-disk-vm \
  --name multi-disk-clone \
  --file /var/lib/libvirt/images/clone-disk1.qcow2 \
  --file /var/lib/libvirt/images/clone-disk2.qcow2
```

## Preparing the Clone with virt-sysprep

After cloning, the clone has the same hostname, SSH keys, and machine ID as the original. Use `virt-sysprep` to clean up:

```bash
# Install libguestfs-tools if not present
sudo dnf install -y libguestfs-tools

# Run virt-sysprep on the cloned disk image
sudo virt-sysprep -d rhel9-clone

# This removes:
# - SSH host keys (regenerated on first boot)
# - Machine ID
# - DHCP leases
# - User accounts passwords (optional)
# - Log files
# - Temporary files
```

## Selective Cleanup with virt-sysprep

```bash
# List available operations
sudo virt-sysprep --list-operations

# Run only specific cleanup operations
sudo virt-sysprep -d rhel9-clone \
  --operations ssh-hostkeys,machine-id,net-hostname,logfiles

# Set a new hostname during sysprep
sudo virt-sysprep -d rhel9-clone \
  --hostname rhel9-clone.example.com
```

## Starting and Configuring the Clone

```bash
# Start the cloned VM
sudo virsh start rhel9-clone

# Connect to the console to verify
sudo virsh console rhel9-clone

# The clone will have a new MAC address and get a new DHCP lease
sudo virsh domifaddr rhel9-clone
```

## Creating a Template Workflow

```bash
# 1. Install and configure a base VM
# 2. Shut it down
sudo virsh shutdown rhel9-template

# 3. Sysprep the template
sudo virt-sysprep -d rhel9-template

# 4. Clone from the template whenever needed
sudo virt-clone --original rhel9-template --name new-vm --auto-clone

# 5. Start the new VM
sudo virsh start new-vm
```

Always run `virt-sysprep` on clones before starting them to avoid duplicate identifiers on your network. This prevents IP conflicts, SSH key warnings, and other issues caused by identical machine identities.
