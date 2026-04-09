# How to Import Ceph Config into a Rook Consumer Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, External Cluster, Consumer, Configuration

Description: Learn how to import Ceph configuration and credentials into a Rook consumer cluster to connect it to an existing external Ceph provider cluster.

---

## Overview

After exporting configuration from a Ceph provider cluster, you need to import it into the Rook consumer Kubernetes cluster. The import process involves creating Kubernetes secrets for keyrings, applying a CephCluster CRD in external mode, and configuring StorageClasses to provision volumes from the external pool. This guide covers the complete import workflow.

## Prerequisites

You should have the output of the `create-external-cluster-resources.py` script from the provider cluster, which contains monitor endpoints, FSID, and client keyrings as a shell script.

## Step 1 - Apply the Export Script on the Consumer Cluster

Switch kubectl context to the consumer cluster and run the exported script:

```bash
kubectl config use-context consumer-cluster

# Apply the exported configuration
bash external-cluster-config.sh
```

This creates the necessary Kubernetes secrets and ConfigMaps in the `rook-ceph-external` namespace.

## Step 2 - Create the External CephCluster CRD

The CephCluster resource in external mode tells Rook to connect to an existing Ceph cluster rather than deploy one:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph-external
  namespace: rook-ceph-external
spec:
  external:
    enable: true
  crashCollector:
    disable: true
  healthCheck:
    daemonHealth:
      mon:
        disabled: false
        interval: 45s
```

```bash
kubectl apply -f external-cephcluster.yaml
```

## Step 3 - Verify the Connection

Check the CephCluster status:

```bash
kubectl -n rook-ceph-external get cephcluster
kubectl -n rook-ceph-external describe cephcluster rook-ceph-external
```

The status phase should show `Connected` when the consumer successfully reaches the provider monitors:

```bash
kubectl -n rook-ceph-external get cephcluster -o jsonpath='{.items[0].status.phase}'
```

## Step 4 - Create StorageClasses for the External Pools

Create a StorageClass backed by the external RBD pool:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-ext-block
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph-external
  pool: replicapool
  imageFormat: "2"
  imageFeatures: layering
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph-external
  csi.storage.k8s.io/controller-expand-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/controller-expand-secret-namespace: rook-ceph-external
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph-external
reclaimPolicy: Delete
allowVolumeExpansion: true
```

```bash
kubectl apply -f external-storageclass.yaml
```

## Step 5 - Test Provisioning

Create a test PVC to verify provisioning works end-to-end:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-external-pvc
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
  storageClassName: rook-ceph-ext-block
```

```bash
kubectl apply -f test-pvc.yaml
kubectl get pvc test-external-pvc -w
```

The PVC should transition from `Pending` to `Bound` within a few seconds.

## Troubleshooting Import Issues

If the CephCluster status remains in `Connecting` state:

```bash
# Check the Rook operator logs
kubectl -n rook-ceph logs deploy/rook-ceph-operator | grep -i external

# Verify secrets were created
kubectl -n rook-ceph-external get secrets

# Test monitor connectivity from the operator pod
kubectl -n rook-ceph exec -it deploy/rook-ceph-operator -- \
  ceph -s --conf /dev/null --mon-host <monitor-ip>:6789 \
  --id healthchecker --key <keyring>
```

## Summary

Importing Ceph config into a Rook consumer cluster involves running the provider's export script, creating the external CephCluster CRD, and defining StorageClasses that reference the external pool. The consumer cluster does not run any Ceph daemons - it only runs the CSI driver and Rook operator in a reduced capacity. Always test PVC provisioning after import to confirm end-to-end connectivity before migrating workloads.
