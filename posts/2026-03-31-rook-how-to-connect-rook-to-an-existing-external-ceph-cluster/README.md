# How to Connect Rook to an Existing External Ceph Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, External Cluster, Storage

Description: Learn how to configure Rook to connect to an existing external Ceph cluster instead of deploying a new one inside Kubernetes.

---

## Overview

Rook can operate in two modes: it can deploy and manage a Ceph cluster entirely within Kubernetes, or it can connect to an existing external Ceph cluster that runs outside of Kubernetes. The external mode is useful when you already have a production Ceph cluster and want Kubernetes workloads to consume storage from it using the Rook CSI driver.

## Prerequisites

Before connecting Rook to an external Ceph cluster, ensure you have:

- A running Ceph cluster (Ceph Pacific v16.2.x or later)
- `kubectl` access to your Kubernetes cluster
- Rook operator deployed in your Kubernetes cluster
- Network connectivity between Kubernetes nodes and Ceph monitors

## Export Ceph Cluster Information

On your existing Ceph cluster, use the Rook script to generate the required configuration:

```bash
python3 create-external-cluster-resources.py \
  --namespace rook-ceph \
  --rbd-data-pool-name replicapool \
  --cephfs-filesystem-name myfs \
  --rgw-endpoint 192.168.1.10:80 \
  --format bash
```

This script generates a shell script with all the required secrets and configuration. Run the generated script on your Kubernetes cluster to create the necessary resources.

## Create the CephCluster CRD for External Mode

Create a `CephCluster` manifest with `external.enable: true`:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph-external
  namespace: rook-ceph
spec:
  external:
    enable: true
  dataDirHostPath: /var/lib/rook
  crashCollector:
    disable: true
  cephVersion:
    image: quay.io/ceph/ceph:v18
```

Apply it to your cluster:

```bash
kubectl apply -f external-cluster.yaml
```

## Verify the Connection

Check that Rook has successfully connected to the external cluster:

```bash
kubectl -n rook-ceph get cephcluster rook-ceph-external
```

The output should show `HEALTH` as `HEALTH_OK` and `PHASE` as `Connected`:

```text
NAME                 DATADIRHOSTPATH   MONCOUNT   AGE   PHASE      MESSAGE
rook-ceph-external   /var/lib/rook                5m    Connected  Cluster connected successfully
```

## Configure StorageClasses

After connecting, you can create StorageClasses that point to pools on the external cluster:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-block-external
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: replicapool
  imageFormat: "2"
  imageFeatures: layering
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/controller-expand-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/controller-expand-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
allowVolumeExpansion: true
```

## Troubleshooting

If the cluster shows a `Connecting` state for too long, check the Rook operator logs:

```bash
kubectl -n rook-ceph logs deploy/rook-ceph-operator | grep -i external
```

Also verify that the monitor endpoints are reachable from within the Kubernetes cluster:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-operator -- \
  ceph -c /var/lib/rook/rook-ceph/rook-ceph.config health
```

## Summary

Connecting Rook to an external Ceph cluster allows you to leverage existing storage infrastructure without redeploying Ceph inside Kubernetes. The `create-external-cluster-resources.py` script automates credential export, and the `CephCluster` CRD with `external.enable: true` establishes the connection. Once connected, you create StorageClasses as normal and Kubernetes workloads transparently use the external cluster.
