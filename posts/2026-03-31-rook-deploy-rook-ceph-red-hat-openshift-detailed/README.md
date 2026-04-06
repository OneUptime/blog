# How to Deploy Rook-Ceph on Red Hat OpenShift (Detailed)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, OpenShift, Red Hat, Kubernetes, Storage, OCP

Description: Comprehensive guide to deploying Rook-Ceph on Red Hat OpenShift with SCC configuration, OperatorHub installation, and storage class setup.

---

## Overview

Red Hat OpenShift adds security layers on top of Kubernetes, including Security Context Constraints (SCCs) that restrict what privileged operations containers can perform. Deploying Rook-Ceph on OpenShift requires explicit SCC configuration and awareness of OpenShift's namespace policies. This guide covers the complete OpenShift-specific deployment process.

## Prerequisites

- An OpenShift Container Platform (OCP) 4.x cluster
- 3+ worker nodes with additional raw disks for OSDs
- `oc` CLI with cluster-admin privileges
- Helm or OperatorHub access

## Step 1 - Configure Security Context Constraints

Rook-Ceph requires privileged access. Create the necessary SCC bindings:

```bash
# Create a privileged SCC for Rook
oc adm policy add-scc-to-user privileged \
  system:serviceaccount:rook-ceph:rook-ceph-operator

oc adm policy add-scc-to-user privileged \
  system:serviceaccount:rook-ceph:rook-ceph-default

oc adm policy add-scc-to-user privileged \
  system:serviceaccount:rook-ceph:rook-ceph-mgr

oc adm policy add-scc-to-user privileged \
  system:serviceaccount:rook-ceph:rook-ceph-osd
```

## Step 2 - Install Rook via OperatorHub

In the OpenShift web console:

1. Navigate to Operators > OperatorHub
2. Search for "Rook-Ceph"
3. Select the community or certified operator
4. Install into the `rook-ceph` namespace

Or install via CLI:

```yaml
# rook-subscription.yaml
apiVersion: operators.coreos.com/v1alpha1
kind: Subscription
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  channel: stable-1.13
  name: rook-ceph
  source: community-operators
  sourceNamespace: openshift-marketplace
```

```bash
oc apply -f rook-subscription.yaml
```

## Step 3 - Create a Namespace with Appropriate Labels

OpenShift's namespace security admission requires labels for privileged workloads:

```bash
oc create namespace rook-ceph

oc label namespace rook-ceph \
  pod-security.kubernetes.io/enforce=privileged \
  pod-security.kubernetes.io/warn=privileged \
  pod-security.kubernetes.io/audit=privileged
```

## Step 4 - Deploy the Ceph Cluster

```yaml
# cluster-openshift.yaml
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
  mgr:
    count: 2
  dashboard:
    enabled: true
    ssl: true
  storage:
    useAllNodes: true
    useAllDevices: false
    deviceFilter: "^vd[b-z]$"
  security:
    kms:
      enabled: false
```

```bash
oc apply -f cluster-openshift.yaml
```

## Step 5 - Create OCP-Compatible StorageClass

```yaml
# storageclass-ocp.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-block
  annotations:
    storageclass.kubernetes.io/is-default-class: "false"
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

```bash
oc apply -f storageclass-ocp.yaml
```

## Step 6 - Verify with OC Commands

```bash
oc -n rook-ceph get pods
oc -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status
oc get storageclass
```

## Summary

Deploying Rook-Ceph on OpenShift requires granting privileged SCCs to Rook's service accounts, labeling the namespace for privileged pod security admission, and optionally using OperatorHub for simplified operator lifecycle management. Once the security configurations are in place, the deployment follows standard Rook patterns with OpenShift-compatible StorageClass secrets for CSI driver authentication.
