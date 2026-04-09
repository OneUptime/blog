# How to Adopt an Existing Ceph Cluster into Kubernetes with Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Migration, Kubernetes, Cluster Adoption, Storage

Description: Adopt an existing bare-metal Ceph cluster into a new Kubernetes environment using Rook by migrating OSD data and configuring the Rook operator to manage the existing cluster.

---

## Overview

When migrating from a bare-metal Ceph deployment to Kubernetes, you can adopt your existing Ceph cluster into Rook without losing data. The adoption process involves configuring Rook to manage the existing OSD devices, importing monitor configurations, and transitioning management to the Rook operator.

## Prerequisites

- Existing Ceph cluster (Ceph Nautilus or later)
- New Kubernetes cluster with Rook operator deployed but no CephCluster created yet
- The OSD block devices accessible from the Kubernetes nodes (same physical hardware or migrated)
- Ceph admin keyring from the existing cluster

## Step 1 - Export Existing Cluster Configuration

From the existing Ceph admin node, export the monitor keyring and configuration:

```bash
# Get monitor map
ceph mon getmap -o /tmp/monmap

# Export admin keyring
ceph auth export client.admin -o /tmp/ceph.client.admin.keyring

# Get cluster FSID
ceph fsid
```

## Step 2 - Create Kubernetes Secrets from Existing Keys

Create the monitor endpoint ConfigMap and secrets in Kubernetes:

```bash
CLUSTER_FSID=$(ceph fsid)
MON_SECRET=$(cat /tmp/ceph.client.admin.keyring | grep key | awk '{print $3}')

kubectl -n rook-ceph create secret generic rook-ceph-mon \
  --from-literal=ceph-username=client.admin \
  --from-literal=ceph-secret=$MON_SECRET \
  --from-literal=fsid=$CLUSTER_FSID
```

## Step 3 - Create the Monitor Endpoint ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-ceph-mon-endpoints
  namespace: rook-ceph
data:
  csi-cluster-config-json: '[{"clusterID":"rook-ceph","monitors":["192.168.1.10:6789","192.168.1.11:6789","192.168.1.12:6789"]}]'
  data: a=192.168.1.10:6789,b=192.168.1.11:6789,c=192.168.1.12:6789
  mapping: '{"node":{}}'
  maxMonId: "2"
```

## Step 4 - Create CephCluster with Existing OSD Configuration

Configure the `CephCluster` CRD to manage the existing OSDs without reinitializing them. The `skipUpgradeChecks` flag prevents the operator from running upgrade checks during the adoption process:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cephVersion:
    image: quay.io/ceph/ceph:v18
    allowUnsupported: false
  dataDirHostPath: /var/lib/rook
  mon:
    count: 3
    allowMultiplePerNode: false
  mgr:
    count: 1
  storage:
    useAllNodes: true
    useAllDevices: false
    deviceFilter: "^sd[b-z]"
  skipUpgradeChecks: true
  continueUpgradeAfterChecksEvenIfNotHealthy: false
```

## Step 5 - Verify OSD Discovery

After applying the CephCluster, check that Rook discovers the existing OSDs:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-osd
```

The OSD pods should start and connect to the existing OSD data on disk.

Verify OSDs are recognized:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd status
```

## Step 6 - Migrate Monitors to Kubernetes

To run monitors as Kubernetes pods instead of bare-metal daemons, add the monitor IPs gradually:

1. Start new monitors in Kubernetes
2. Verify quorum with new monitors
3. Remove old bare-metal monitors

```bash
# Add a new monitor
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph mon add d 192.168.1.50:6789

# Check quorum
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph mon stat

# Remove old monitor
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph mon remove a
```

## Step 7 - Validate Cluster Health

After adoption:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph health detail
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph df
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd tree
```

## Summary

Adopting an existing Ceph cluster into Rook involves exporting existing credentials and monitor configuration, creating the corresponding Kubernetes secrets and ConfigMaps, and then deploying a `CephCluster` CRD configured to manage the existing OSD devices. Monitors can be migrated incrementally by adding new Kubernetes-hosted monitors to the quorum before removing the bare-metal ones, ensuring zero downtime during the transition.
