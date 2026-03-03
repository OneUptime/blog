# How to Migrate Virtual Machines Live Between KVM Hosts on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, KVM, Live Migration, Virtualization

Description: Learn how to perform live and offline migration of KVM virtual machines between Ubuntu hosts with shared storage and SSH transport configurations.

---

Live migration moves a running virtual machine from one KVM host to another with minimal downtime - often just a brief pause of a few hundred milliseconds. This is essential for maintenance operations, load balancing, and hardware upgrades without taking services offline. Offline migration is simpler and suitable for when brief downtime is acceptable.

## Prerequisites for Live Migration

Live migration has specific requirements:

1. **Compatible CPU types:** Source and destination CPUs must be compatible. Using `host-model` CPU type instead of `host-passthrough` gives the most flexibility.
2. **Shared storage:** Both hosts must access the same disk image, typically via NFS, GlusterFS, Ceph, or iSCSI.
3. **Matching libvirt versions:** Should be within one major version.
4. **Network connectivity:** Hosts must communicate with each other.
5. **Matching VM configurations:** Both hosts need the same bridge/network names.

Check CPU compatibility:

```bash
# On source host
virsh cpu-compare /etc/libvirt/qemu/myvm.xml

# Generate a compatible CPU model
virsh cpu-baseline --features /etc/libvirt/qemu/myvm.xml
```

## Setting Up Shared Storage with NFS

Both KVM hosts need access to the same disk images. NFS is the simplest shared storage option:

```bash
# === On NFS server (can be a third machine or one of the KVM hosts) ===

# Install NFS server
sudo apt install nfs-kernel-server

# Create shared storage directory
sudo mkdir -p /srv/kvm-images
sudo chown nobody:nogroup /srv/kvm-images
sudo chmod 755 /srv/kvm-images

# Export the directory
sudo nano /etc/exports
```

Add:

```text
/srv/kvm-images  192.168.1.0/24(rw,sync,no_subtree_check,no_root_squash)
```

```bash
sudo exportfs -a
sudo systemctl restart nfs-kernel-server
```

On each KVM host:

```bash
# Install NFS client
sudo apt install nfs-common

# Mount the shared storage
sudo mkdir -p /var/lib/libvirt/images/shared
sudo mount 192.168.1.50:/srv/kvm-images /var/lib/libvirt/images/shared

# Persistent mount in /etc/fstab
echo '192.168.1.50:/srv/kvm-images /var/lib/libvirt/images/shared nfs defaults,_netdev 0 0' | sudo tee -a /etc/fstab
```

Add shared storage as a libvirt storage pool:

```bash
sudo virsh pool-define-as shared dir - - - - /var/lib/libvirt/images/shared
sudo virsh pool-start shared
sudo virsh pool-autostart shared
```

## Configuring libvirt for Remote Access

Live migration requires libvirt on the destination to accept connections from the source:

### Using SSH Transport (Recommended)

SSH transport is the simplest and most secure approach:

```bash
# Set up SSH key authentication between KVM hosts
# On source host:
sudo ssh-keygen -t ed25519 -f /root/.ssh/kvm-migration -N ""
sudo ssh-copy-id -i /root/.ssh/kvm-migration.pub root@destination-host

# Test connectivity
sudo virsh -c qemu+ssh://root@destination-host/system list
```

### Configuring libvirt TCP Transport (Alternative)

For higher performance migrations, configure TLS or TCP transport:

```bash
# On destination host - configure libvirtd to listen on TCP
sudo nano /etc/libvirt/libvirtd.conf
```

Set these options:

```ini
# Listen for TCP connections
listen_tls = 0
listen_tcp = 1
tcp_port = "16509"
listen_addr = "0.0.0.0"

# For production, use TLS instead:
# listen_tls = 1
# tls_port = "16514"

# Authentication (sasl or none)
auth_tcp = "none"   # Use "sasl" in production
```

```bash
# Edit libvirtd startup to enable listening
sudo nano /etc/default/libvirtd
# Add:
LIBVIRTD_ARGS="--listen"

sudo systemctl restart libvirtd

# Allow through firewall
sudo ufw allow 16509/tcp
sudo ufw allow 49152:49261/tcp  # Migration data ports
```

## Preparing a VM for Migration

```bash
# Ensure VM disk is on shared storage
virsh domblklist myvm
# Check the Source path is on NFS mount

# Move disk to shared storage if needed
virsh shutdown myvm
sudo mv /var/lib/libvirt/images/myvm.qcow2 /var/lib/libvirt/images/shared/
# Update VM XML to point to new path:
virsh edit myvm
# Change source file path to /var/lib/libvirt/images/shared/myvm.qcow2
virsh start myvm
```

## Performing Live Migration

### Live Migration via SSH

```bash
# Migrate running VM to destination host
# The VM continues running during migration
sudo virsh migrate \
  --live \
  --persistent \
  --undefinesource \
  myvm \
  qemu+ssh://root@destination-host/system

# Flags explained:
# --live: perform live migration (VM keeps running)
# --persistent: define VM on destination after migration
# --undefinesource: remove VM definition from source after success
```

### Live Migration with Verbose Output

```bash
# Watch migration progress
sudo virsh migrate \
  --live \
  --persistent \
  --undefinesource \
  --verbose \
  myvm \
  qemu+ssh://root@destination-host/system

# In another terminal, monitor on destination
virsh -c qemu+ssh://root@destination-host/system domjobinfo myvm
```

### Checking Migration Progress

```bash
# Check migration status (run during migration)
virsh domjobinfo myvm

# Output shows:
# Job type:         Unbounded
# Time elapsed:     12345 ms
# Data processed:   1.234 GiB
# Data remaining:   4.567 GiB
# Memory total:     2.000 GiB
# Memory processed: 1.234 GiB
# Memory remaining: 768.000 MiB

# Cancel migration if needed
virsh migrate-setmaxdowntime myvm 500   # Set max 500ms downtime
virsh migrate-setspeed myvm 1000        # Limit to 1 Gbps
```

### Live Migration with Copy Storage (No Shared Storage)

If you do not have shared storage, use `--copy-storage-all` to copy disks during migration:

```bash
# Copy storage during live migration (slower, no shared storage needed)
sudo virsh migrate \
  --live \
  --persistent \
  --undefinesource \
  --copy-storage-all \
  myvm \
  qemu+ssh://root@destination-host/system
```

**Warning:** `--copy-storage-all` is slower and riskier than shared storage migration. It copies the entire disk during migration, which takes longer and increases the chance of failure.

## Offline (Cold) Migration

Offline migration involves shutting down the VM, copying the disk, and starting it on the destination:

```bash
# Save VM XML configuration
virsh dumpxml myvm > /tmp/myvm.xml

# Shut down the VM
virsh shutdown myvm

# Copy disk image to destination (if not shared storage)
rsync -avz --progress \
  /var/lib/libvirt/images/myvm.qcow2 \
  root@destination-host:/var/lib/libvirt/images/

# Copy XML to destination
scp /tmp/myvm.xml root@destination-host:/tmp/

# On destination host - define and start the VM
ssh root@destination-host
virsh define /tmp/myvm.xml
virsh start myvm

# Remove from source
virsh undefine myvm  # On source (disk file already moved)
```

## Troubleshooting Migration Issues

**"error: unable to connect to server" on destination:**

```bash
# Check libvirtd is listening
ssh root@destination-host "netstat -tlnp | grep 16509"

# Verify firewall allows migration ports
ssh root@destination-host "ufw status | grep 16509"
```

**"error: migration failed" with CPU incompatibility:**

```bash
# Use a more compatible CPU model in the VM XML
virsh edit myvm
# Change:
# <cpu mode='host-passthrough'>
# To:
# <cpu mode='host-model'>
```

**Migration takes too long:**

```bash
# Increase migration speed limit (in Mbps)
virsh migrate-setspeed myvm 0     # Remove limit

# Reduce memory dirtying by limiting VM CPU
virsh schedinfo myvm --set cpu_quota=50000
# Restore after migration:
virsh schedinfo myvm --set cpu_quota=-1
```

**VM unreachable after migration:**

```bash
# Check VM is running on destination
virsh -c qemu+ssh://root@destination-host/system list

# Check network config - bridge names must match on both hosts
virsh -c qemu+ssh://root@destination-host/system domiflist myvm

# If bridge name differs, update VM XML on destination
```

Live migration is a powerful capability that requires careful preparation. The overhead of setting up shared storage and ensuring host compatibility pays off every time you need to evacuate a host for maintenance without scheduling downtime for your services.
