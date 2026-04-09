# How to Configure Live VM Migration with Ceph RBD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, Live Migration, KVM, Libvirt, Virtualization

Description: Configure live VM migration between KVM hypervisors using Ceph RBD shared storage, eliminating disk data transfer and enabling near-zero downtime migration.

---

## Overview

Live VM migration allows running virtual machines to move between hypervisor hosts with minimal downtime. When VM disks are stored in Ceph RBD, migration only transfers CPU and memory state - the disk data stays in place in Ceph, making migrations much faster.

## How Live Migration Works with Ceph

Without shared storage, live migration must copy the entire disk to the destination. With Ceph RBD, both source and destination hypervisors access the same RBD image simultaneously. Migration transfers only:
- CPU state
- Memory pages (using pre-copy or post-copy)
- Device state

## Prerequisites

- Rook-Ceph cluster with VMs running on RBD images
- Two or more KVM hypervisors with access to the same Ceph cluster
- libvirtd configured with migration support
- SSH key-based authentication between hypervisor nodes

## Step 1 - Configure libvirt for Remote Migration

On each hypervisor, configure libvirt to allow remote connections:

```bash
# Enable TCP transport for libvirt
cat >> /etc/libvirt/libvirtd.conf << 'EOF'
listen_tls = 0
listen_tcp = 1
tcp_port = "16509"
auth_tcp = "none"
EOF

# Enable libvirt listening
sed -i 's/#LIBVIRTD_ARGS=""/LIBVIRTD_ARGS="--listen"/' /etc/default/libvirtd
systemctl restart libvirtd
```

## Step 2 - Verify Ceph Access from Both Hypervisors

```bash
# On source hypervisor
rbd ls vms --id libvirt

# On destination hypervisor
rbd ls vms --id libvirt
```

Both should list the same images confirming shared access.

## Step 3 - Perform a Live Migration

```bash
# Live migration with shared storage (no disk copy)
virsh migrate --live myvm \
  qemu+tcp://hypervisor2/system \
  --verbose

# Check migration progress
virsh domjobinfo myvm
```

## Step 4 - Live Migration with Tunnel (Secure)

```bash
# Use SSH tunnel for secure migration
virsh migrate --live --p2p --tunnelled myvm \
  qemu+ssh://hypervisor2/system \
  --verbose
```

## Step 5 - Post-Copy Migration

For memory-heavy VMs, use post-copy migration which switches the VM to the destination before all memory is transferred:

```bash
# Start with pre-copy, then trigger post-copy
virsh migrate --live --postcopy myvm \
  qemu+tcp://hypervisor2/system &

# When VM is running on destination in pre-copy mode
virsh migrate-setmaxdowntime myvm 500
virsh migrate-start-postcopy myvm
```

## Step 6 - Automate Migration with Scripts

```bash
#!/bin/bash
SRC_HOST=$1
DST_HOST=$2
VM=$3

echo "Migrating $VM from $SRC_HOST to $DST_HOST"

virsh -c qemu+tcp://${SRC_HOST}/system migrate \
  --live \
  --timeout 300 \
  $VM \
  qemu+tcp://${DST_HOST}/system

if [ $? -eq 0 ]; then
  echo "Migration successful"
else
  echo "Migration failed"
  exit 1
fi
```

## Step 7 - Verify After Migration

```bash
# On destination hypervisor
virsh list --all | grep myvm

# Verify RBD image is accessible
rbd status vms/myvm-disk
```

The `rbd status` command shows which host currently has the image locked.

## Troubleshooting

If migration fails with "Unable to read from monitor":

```bash
# Check monitor connectivity from both hypervisors
ceph health
ceph mon stat
```

If migration stalls due to dirty memory pages:

```bash
virsh migrate-setmaxdowntime myvm 5000
virsh migrate-setspeed myvm 8192  # 8 GiB/s
```

## Summary

Ceph RBD as shared storage fundamentally changes live migration from a slow disk-copy operation to a fast memory-state transfer. By ensuring both hypervisors have the same Ceph configuration and access credentials, live migrations complete proportional to VM memory size rather than disk size. This enables maintenance operations on hypervisor nodes without scheduling VM downtime.
