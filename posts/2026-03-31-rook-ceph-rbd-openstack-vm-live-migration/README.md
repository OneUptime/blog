# How to Set Up Ceph RBD for OpenStack VM Live Migration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, OpenStack, Nova, Live Migration, RBD, High Availability

Description: Configure Ceph RBD to enable seamless OpenStack VM live migration between compute nodes without shared storage or downtime.

---

OpenStack live migration moves running VMs between compute nodes with minimal interruption. When instance disks are stored in Ceph RBD, live migration works across any compute node in the cluster without requiring shared NFS or SAN storage. This guide covers the end-to-end setup.

## How Ceph Enables Live Migration

Without shared storage, Nova defaults to block migration which copies the entire disk - a slow process proportional to disk size. With Ceph RBD disks, the disk stays in Ceph during migration. Only the running VM state (memory, CPU registers) is transferred over the network, making migration time nearly constant regardless of disk size.

## Prerequisites

- Nova compute nodes configured with `images_type = rbd` (see the Nova Ephemeral guide)
- libvirt secret configured on all compute nodes with the same UUID
- Direct network connectivity between compute nodes on port 16514 (libvirt migration)
- Compute nodes can all reach the Ceph cluster

## Step 1: Verify libvirt Migration Settings

On each compute node, check nova.conf includes the correct live migration flags:

```ini
[libvirt]
live_migration_scheme = tcp
live_migration_tunnelled = false
live_migration_completion_timeout = 800
live_migration_timeout_action = abort
```

## Step 2: Configure libvirtd for TCP Migration

On each compute node, enable libvirt remote connections:

```bash
# Set authentication for TCP connections
cat >> /etc/libvirt/libvirtd.conf <<EOF
auth_tcp = "none"
EOF

# Enable libvirtd TCP socket for live migration (uses systemd socket activation)
systemctl enable --now libvirtd-tcp.socket
systemctl restart libvirtd
```

## Step 3: Open Required Firewall Ports

```bash
# Allow libvirt migration port
firewall-cmd --permanent --add-port=16514/tcp
# Allow QEMU migration ports
firewall-cmd --permanent --add-port=49152-49261/tcp
firewall-cmd --reload
```

## Step 4: Perform a Live Migration

```bash
# List compute hosts
openstack compute service list --service nova-compute

# Live migrate an instance
openstack server migrate \
  --live-migration \
  --host compute2 \
  my-instance

# Monitor migration status
watch -n 2 "openstack server show my-instance \
  -c status -c OS-EXT-SRV-ATTR:host -c OS-EXT-STS:task_state"
```

## Step 5: Verify Migration Completed

```bash
# After migration, instance should be ACTIVE on compute2
openstack server show my-instance \
  -c status \
  -c OS-EXT-SRV-ATTR:host

# The RBD disk stays in the same location - no data moved
INSTANCE_ID=$(openstack server show my-instance -f value -c id)
rbd info vms/${INSTANCE_ID}_disk | grep -E "block_name_prefix|size"
```

## Troubleshooting Live Migration

If migration gets stuck in `MIGRATING` state:

```bash
# Check nova-compute logs on the source host
journalctl -u nova-compute --since "10 minutes ago" | grep -i migration

# Check libvirt connectivity from source to destination
virsh -c qemu+tcp://compute2/system list

# List active migrations to get the migration ID
openstack server migration list my-instance

# Abort a stuck migration using its ID
openstack server migration abort my-instance <migration-id>
```

## Summary

Ceph RBD is the key enabler for efficient OpenStack live migration because the VM disk never moves - only the in-memory state is transferred between compute nodes. After configuring libvirt migration ports, firewall rules, and the correct nova.conf live migration settings, migrations complete in seconds and are limited only by RAM size, not disk size. This dramatically improves cluster maintenance flexibility and VM availability during node maintenance.
