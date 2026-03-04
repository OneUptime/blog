# How to Perform Live Migration of Virtual Machines on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, KVM, Live Migration, Virtualization, High Availability, Linux

Description: Learn how to perform live migration of KVM virtual machines between RHEL hosts with zero downtime using libvirt and shared storage.

---

Live migration moves a running virtual machine from one physical host to another without shutting it down. This is essential for hardware maintenance, load balancing, and high availability. The VM's memory state is transferred while the guest continues running.

## Prerequisites

Both hosts need:
- Same CPU architecture and compatible CPU features
- Shared storage (NFS, iSCSI, GlusterFS, or Ceph) accessible from both hosts
- Libvirt running on both hosts
- Network connectivity between hosts
- Matching libvirt version (or close)

```bash
# Verify libvirt is running on both hosts
sudo systemctl status libvirtd

# Check CPU compatibility
virsh capabilities | grep -A5 '<cpu'

# Ensure shared storage is mounted on both hosts
df -h /var/lib/libvirt/images
```

## Setting Up SSH Connectivity

```bash
# Live migration uses SSH or TLS for the transport
# Configure passwordless SSH between hosts
sudo ssh-keygen -t rsa -N "" -f /root/.ssh/id_rsa
sudo ssh-copy-id root@host2.example.com

# Test the connection
sudo ssh root@host2.example.com virsh list
```

## Performing Live Migration

```bash
# Migrate a VM from the current host to host2
sudo virsh migrate --live --persistent --undefinesource \
  rhel9-vm qemu+ssh://root@host2.example.com/system

# Options:
# --live: perform live migration (no downtime)
# --persistent: define the VM on the destination
# --undefinesource: remove the VM definition from the source
```

## Migration with Bandwidth Limit

```bash
# Limit migration bandwidth to avoid saturating the network
sudo virsh migrate --live --persistent \
  --bandwidth 100 \
  rhel9-vm qemu+ssh://root@host2.example.com/system

# The bandwidth is in MiB/s
```

## Monitoring Migration Progress

```bash
# From another terminal on the source host
sudo virsh domjobinfo rhel9-vm

# Watch migration stats in real time
watch -n 1 'sudo virsh domjobinfo rhel9-vm'
```

## Offline Migration

If live migration is not possible (e.g., incompatible CPUs):

```bash
# Offline migration (VM is paused during transfer)
sudo virsh migrate --offline --persistent \
  rhel9-vm qemu+ssh://root@host2.example.com/system
```

## Troubleshooting Migration Failures

```bash
# Check libvirt logs on both hosts
sudo journalctl -u libvirtd --since "10 minutes ago"

# Common issues:
# - Storage not accessible on destination
# - CPU model incompatibility
# - Firewall blocking libvirt ports

# Open firewall ports for migration
sudo firewall-cmd --permanent --add-port=49152-49215/tcp
sudo firewall-cmd --reload
```

## Post-Migration Verification

```bash
# On the destination host, verify the VM is running
sudo virsh list

# Check the VM is functioning correctly
sudo virsh dominfo rhel9-vm
```

Live migration requires shared storage so both hosts can access the same disk images. Without shared storage, you would need to copy the disk image separately, which does not support true live migration.
