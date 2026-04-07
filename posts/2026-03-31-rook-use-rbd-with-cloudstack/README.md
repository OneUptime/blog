# How to Use RBD with CloudStack

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, CloudStack, Cloud

Description: Learn how to integrate Apache CloudStack with Ceph RBD as a primary storage backend to provide block storage for virtual machines.

---

## CloudStack and Ceph RBD Integration

Apache CloudStack supports Ceph RBD as a primary storage zone, enabling virtual machine disks to be stored directly in a Ceph cluster. When integrated with Rook-Ceph, CloudStack can provision VM disks from the same Ceph cluster used for Kubernetes workloads, creating a unified storage tier.

Benefits of this integration:
- VM live migration without shared NFS
- Snapshot-based VM templates
- Thin-provisioned VM disks via RBD cloning
- Replication and high availability from Ceph

## Step 1 - Prepare Ceph for CloudStack

Create a dedicated pool for CloudStack:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  ceph osd pool create cloudstack 128 replicated

kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  rbd pool init cloudstack
```

Create a dedicated Ceph user for CloudStack:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  ceph auth get-or-create client.cloudstack \
  mon 'profile rbd' \
  osd 'profile rbd pool=cloudstack' \
  -o /etc/ceph/ceph.client.cloudstack.keyring
```

## Step 2 - Extract Credentials for CloudStack

Get the key for the CloudStack user:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  ceph auth get-key client.cloudstack
```

Get the monitor addresses:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  ceph mon dump | grep "mon\."
```

## Step 3 - Configure KVM Hosts for Ceph

On each KVM host managed by CloudStack, install Ceph client packages and configure authentication:

```bash
apt-get install -y ceph-common

# Create /etc/ceph/ceph.conf with monitor addresses
cat > /etc/ceph/ceph.conf << EOF
[global]
mon_host = 192.168.1.10:6789,192.168.1.11:6789,192.168.1.12:6789
auth_cluster_required = cephx
auth_service_required = cephx
auth_client_required = cephx
EOF

# Store the keyring
echo "[client.cloudstack]
    key = <ceph-key>" > /etc/ceph/ceph.client.cloudstack.keyring
chmod 600 /etc/ceph/ceph.client.cloudstack.keyring
```

## Step 4 - Add Ceph as Primary Storage in CloudStack

In the CloudStack Admin UI, navigate to Infrastructure > Primary Storage > Add Primary Storage:

```text
Protocol: RBD
Name: ceph-primary
Server: 192.168.1.10
Port: 6789
Pool: cloudstack
Username: cloudstack
AuthSecret: <ceph-key>
```

Or use CloudMonkey (`cmk`), the CloudStack CLI:

```bash
cmk create storagepool \
  name=ceph-primary \
  zoneid=<zone-id> \
  podid=<pod-id> \
  clusterid=<cluster-id> \
  url="rbd://192.168.1.10/cloudstack" \
  provider=DefaultPrimary
```

## Step 5 - Verify VM Disk Creation

After adding primary storage, deploy a VM and verify its disk is created in the Ceph pool:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  rbd ls cloudstack
```

CloudStack names RBD images using the volume UUID.

## Step 6 - Enable Fast VM Cloning

CloudStack uses RBD clone operations for fast template-based VM provisioning. Ensure the image feature `layering` is enabled on all template images:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  rbd feature enable cloudstack/<template-image> layering
```

## Summary

Integrating Apache CloudStack with Ceph RBD provides a distributed, high-availability primary storage backend for virtual machines. Create a dedicated Ceph pool and user for CloudStack, configure KVM hosts with the Ceph keyring, and add the pool as primary storage in the CloudStack UI. VM disks are provisioned as RBD images, enabling live migration, snapshot-based templates, and thin provisioning.
