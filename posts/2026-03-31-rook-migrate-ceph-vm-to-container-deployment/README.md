# How to Migrate Ceph from VM-Based to Container-Based Deployment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Migration, Kubernetes, Container

Description: Learn how to migrate a Ceph cluster running on bare VMs to a container-based deployment managed by Rook on Kubernetes.

---

Many organizations run Ceph directly on virtual machines. Migrating to Rook on Kubernetes provides automated lifecycle management, Kubernetes-native storage provisioning, and standardized operational practices.

## Assessing the Existing VM-Based Cluster

Document the current deployment:

```bash
ceph -s
ceph osd tree
ceph osd dump
ceph df
ceph mon dump
```

Record the Ceph version:

```bash
ceph version
```

## Migration Strategy

There are two main approaches:

1. **External cluster mode** - Connect Rook to the existing cluster for Kubernetes CSI access without containerizing daemons. This is the quickest path to Kubernetes-native storage.
2. **New Rook-managed cluster with incremental migration** - Deploy a new Rook-managed Ceph cluster on the same or new nodes, then migrate data and decommission old daemons incrementally.

For cross-datacenter data migration, use RGW multi-site and RBD mirroring as covered in datacenter migration guides.

## Deploying a New Rook-Managed Cluster on Existing Nodes

Rook does not directly adopt or import an existing Ceph cluster's daemons. Instead, you deploy a new Rook-managed Ceph cluster on the same nodes, then incrementally migrate data and decommission the old cluster.

### Step 1 - Deploy Rook Operator

```bash
kubectl apply -f https://raw.githubusercontent.com/rook/rook/master/deploy/examples/crds.yaml
kubectl apply -f https://raw.githubusercontent.com/rook/rook/master/deploy/examples/common.yaml
kubectl apply -f https://raw.githubusercontent.com/rook/rook/master/deploy/examples/operator.yaml
```

### Step 2 - Create CephCluster Resource

Create a new Rook-managed cluster. Use a separate `dataDirHostPath` from the existing Ceph installation to avoid conflicts (Rook defaults to `/var/lib/rook`):

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cephVersion:
    image: quay.io/ceph/ceph:v18.2.0
  dataDirHostPath: /var/lib/rook
  mon:
    count: 3
    allowMultiplePerNode: false
  storage:
    useAllNodes: true
    useAllDevices: false
    devices:
    - name: sdb
```

Ensure the devices listed under `storage` are not already in use by the existing Ceph cluster. Use separate disks for the new Rook-managed OSDs.

## Alternative: External Cluster Mode

Connect Rook to manage a pre-existing cluster without touching its daemons:

```bash
# Generate external cluster config (run on a Ceph node with admin access)
python3 create-external-cluster-resources.py \
  --rbd-data-pool-name=mypool \
  --namespace=rook-ceph-external \
  --format=bash

# Copy the output export statements and paste them into your shell, then run:
. import-external-cluster.sh
```

This provides CSI storage classes backed by the existing cluster without containerizing the Ceph daemons.

## Containerizing Daemons Incrementally

Containerize one service type at a time:

1. Start with MGR (lowest risk)
2. Then add new MONs and remove old ones one by one
3. Finally, migrate OSDs using the add-new / remove-old process

```bash
# Add containerized OSD
kubectl apply -f new-osd-deployment.yaml

# Wait for cluster to rebalance
watch ceph -s

# Remove VM-based OSD
ceph osd out osd.3
ceph osd purge 3 --yes-i-really-mean-it
```

## Verifying the Migration

```bash
kubectl -n rook-ceph get pods
ceph -s
ceph health
kubectl get storageclass
kubectl get pv
```

## Summary

Migrating from VM-based to container-based Ceph can be done by using Rook's external cluster mode to gain Kubernetes storage class benefits without immediately containerizing daemons, or by deploying a new Rook-managed cluster alongside the existing one and incrementally migrating services. The incremental daemon migration approach minimizes risk by containerizing one component at a time.
