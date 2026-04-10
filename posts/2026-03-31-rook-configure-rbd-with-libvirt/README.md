# How to Configure RBD with libvirt

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, Libvirt, Virtualization

Description: Learn how to configure libvirt-managed virtual machines to use Ceph RBD images as storage in Rook-Ceph deployments.

---

## Why Use RBD with libvirt

libvirt is the most common management layer for QEMU/KVM virtualization. It natively supports Ceph RBD as a storage pool, enabling VM live migration, snapshot management, and storage operations through the standard `virsh` and `virt-manager` interfaces.

When combined with Rook-Ceph, VMs managed by libvirt get distributed, replicated storage without any NFS or iSCSI setup.

## Step 1 - Extract Ceph Credentials for libvirt

Get the admin keyring from Rook and configure it for libvirt use:

```bash
kubectl get secret rook-ceph-admin-keyring -n rook-ceph \
  -o jsonpath='{.data.keyring}' | base64 -d > /etc/ceph/ceph.client.admin.keyring
```

Store the Ceph monitor endpoints in `/etc/ceph/ceph.conf`:

```text
[global]
mon_host = [v2:192.168.1.10:3300/0,v1:192.168.1.10:6789/0]
auth_cluster_required = cephx
auth_service_required = cephx
auth_client_required = cephx
```

## Step 2 - Create a libvirt Secret for Ceph Auth

libvirt stores the Ceph client secret separately for security:

```bash
CEPH_KEY=$(ceph auth get-key client.admin)
cat > /tmp/ceph-secret.xml << EOF
<secret ephemeral='no' private='no'>
  <usage type='ceph'>
    <name>client.admin secret</name>
  </usage>
</secret>
EOF

SECRET_UUID=$(virsh secret-define /tmp/ceph-secret.xml | awk '{print $2}')
virsh secret-set-value $SECRET_UUID $CEPH_KEY
```

Note the UUID output - you will use it in volume and domain configurations.

## Step 3 - Define a libvirt RBD Storage Pool

Create a storage pool backed by Ceph RBD:

```xml
<pool type="rbd">
  <name>ceph-rbd-pool</name>
  <source>
    <host name="192.168.1.10" port="6789"/>
    <host name="192.168.1.11" port="6789"/>
    <host name="192.168.1.12" port="6789"/>
    <name>replicapool</name>
    <auth type="ceph" username="admin">
      <secret uuid="<your-secret-uuid>"/>
    </auth>
  </source>
</pool>
```

Define and start the pool:

```bash
virsh pool-define /tmp/ceph-pool.xml
virsh pool-start ceph-rbd-pool
virsh pool-autostart ceph-rbd-pool
```

## Step 4 - Create a VM Volume in the Pool

```bash
virsh vol-create-as ceph-rbd-pool vm-disk-01 20G --format raw
virsh vol-list ceph-rbd-pool
```

## Step 5 - Attach the Volume to a VM

Add the RBD volume as a disk in the VM domain XML:

```xml
<disk type='network' device='disk'>
  <driver name='qemu' type='raw' cache='writeback'/>
  <auth username='admin'>
    <secret type='ceph' uuid='<your-secret-uuid>'/>
  </auth>
  <source protocol='rbd' name='replicapool/vm-disk-01'>
    <host name='192.168.1.10' port='6789'/>
    <host name='192.168.1.11' port='6789'/>
  </source>
  <target dev='vda' bus='virtio'/>
</disk>
```

Save the XML above to a file (e.g., `/tmp/rbd-disk.xml`) and attach it to a running VM:

```bash
virsh attach-device myvm /tmp/rbd-disk.xml --config --live
```

## Step 6 - Enable Live Migration

With RBD-backed storage, live migrate a VM without shared storage:

```bash
virsh migrate --live --persistent myvm qemu+ssh://destination-host/system
```

## Summary

Configuring RBD with libvirt in Rook-Ceph environments provides VMs with distributed, replicated block storage managed through standard libvirt APIs. Define a libvirt secret for Ceph auth, create an RBD storage pool pointing to the Ceph cluster, and attach volumes to VMs via the domain XML. Live migration works out of the box since all VM disk data is stored in the shared Ceph cluster.
