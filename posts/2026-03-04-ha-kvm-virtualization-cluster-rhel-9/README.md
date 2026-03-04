# How to Set Up a High-Availability KVM Virtualization Cluster on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, KVM, Virtualization, High Availability, Pacemaker, Cluster, Linux

Description: Learn how to set up a high-availability KVM virtualization cluster on RHEL with Pacemaker for automatic VM failover.

---

A high-availability KVM cluster on RHEL uses Pacemaker to manage virtual machines across multiple hypervisor hosts. When a host fails, its VMs automatically restart on a surviving host, minimizing downtime.

## Prerequisites

- Two or more RHEL servers with KVM virtualization support
- Shared storage accessible from all hosts (NFS, iSCSI, or GFS2)
- A running Pacemaker cluster with STONITH fencing
- Libvirt and KVM packages installed

## Step 1: Install KVM on All Nodes

On all nodes:

```bash
sudo dnf install qemu-kvm libvirt virt-install -y
sudo systemctl enable --now libvirtd
```

## Step 2: Configure Shared Storage

VMs must be stored on shared storage so any node can run them. Using NFS as an example:

```bash
sudo mkdir -p /var/lib/libvirt/images
```

Mount the NFS share on all nodes:

```bash
echo "nfs-server:/vm-storage /var/lib/libvirt/images nfs defaults 0 0" | sudo tee -a /etc/fstab
sudo mount -a
```

## Step 3: Create a VM on Shared Storage

Create a VM with its disk on shared storage:

```bash
sudo virt-install \
    --name testvm \
    --memory 2048 \
    --vcpus 2 \
    --disk /var/lib/libvirt/images/testvm.qcow2,size=20 \
    --os-variant rhel9.0 \
    --cdrom /path/to/rhel9.iso \
    --network bridge=br0
```

After installation, stop the VM (Pacemaker will manage it):

```bash
sudo virsh shutdown testvm
```

## Step 4: Export the VM Configuration

Dump the VM XML definition and make it available on all nodes:

```bash
sudo virsh dumpxml testvm > /var/lib/libvirt/images/testvm.xml
```

Define the VM on all nodes:

```bash
sudo virsh define /var/lib/libvirt/images/testvm.xml
```

## Step 5: Create a Pacemaker Resource for the VM

```bash
sudo pcs resource create vm-testvm ocf:heartbeat:VirtualDomain \
    hypervisor="qemu:///system" \
    config="/var/lib/libvirt/images/testvm.xml" \
    migration_transport="ssh" \
    op start timeout=120s \
    op stop timeout=120s \
    op monitor interval=30s timeout=60s \
    meta allow-migrate=true
```

The `allow-migrate=true` enables live migration when moving the VM between nodes.

## Step 6: Configure Migration

For live migration, set up passwordless SSH between nodes for the root user:

```bash
# On node1
sudo ssh-keygen -t rsa -N ""
sudo ssh-copy-id root@node2

# On node2
sudo ssh-keygen -t rsa -N ""
sudo ssh-copy-id root@node1
```

Configure libvirt to allow migration:

```bash
sudo tee /etc/libvirt/libvirtd.conf << 'CONF'
listen_tls = 0
listen_tcp = 1
tcp_port = "16509"
auth_tcp = "none"
CONF

sudo systemctl restart libvirtd
```

Open firewall ports:

```bash
sudo firewall-cmd --permanent --add-port=16509/tcp
sudo firewall-cmd --permanent --add-port=49152-49215/tcp
sudo firewall-cmd --reload
```

## Step 7: Test VM Failover

Put the node running the VM in standby:

```bash
sudo pcs node standby node1
```

Verify the VM moved to node2:

```bash
sudo pcs status
sudo virsh list --all
```

Bring node1 back:

```bash
sudo pcs node unstandby node1
```

## Step 8: Test Live Migration

Manually trigger a live migration:

```bash
sudo pcs resource move vm-testvm node2
sudo pcs resource clear vm-testvm
```

The VM should migrate with minimal downtime.

## Managing Multiple VMs

Create a resource for each VM:

```bash
for vm in vm1 vm2 vm3; do
    sudo pcs resource create $vm ocf:heartbeat:VirtualDomain \
        hypervisor="qemu:///system" \
        config="/var/lib/libvirt/images/${vm}.xml" \
        migration_transport="ssh" \
        op monitor interval=30s \
        meta allow-migrate=true
done
```

## Conclusion

A high-availability KVM cluster on RHEL with Pacemaker provides automatic VM failover and live migration. Store VM disks on shared storage, configure the VirtualDomain resource agent, and enable SSH-based migration for seamless VM mobility between hosts.
