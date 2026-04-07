# How to Set Up Red Hat Ceph Storage for OpenShift Container Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, OpenShift, Storage, Container, Kubernetes

Description: Configure Red Hat Ceph Storage as the backing store for OpenShift Container Storage, enabling persistent volumes for containerized workloads.

---

OpenShift Container Storage (OCS) - now called OpenShift Data Foundation - relies on Ceph under the hood. When running in internal mode, OCS deploys Rook-Ceph inside the OpenShift cluster. In external mode, it connects to an existing RHCS cluster. This guide covers the internal mode setup for a three-node OpenShift cluster.

## Prerequisites

- Three or more OpenShift worker nodes with raw block devices
- OCS operator subscription available in OperatorHub
- Each storage node labeled: `cluster.ocs.openshift.io/openshift-storage=""`

## Step 1 - Label Storage Nodes

```bash
oc label node worker1 cluster.ocs.openshift.io/openshift-storage=""
oc label node worker2 cluster.ocs.openshift.io/openshift-storage=""
oc label node worker3 cluster.ocs.openshift.io/openshift-storage=""
```

## Step 2 - Install the OCS Operator

```bash
oc apply -f - <<EOF
apiVersion: operators.coreos.com/v1alpha1
kind: Subscription
metadata:
  name: ocs-operator
  namespace: openshift-storage
spec:
  channel: stable-4.15
  name: ocs-operator
  source: redhat-operators
  sourceNamespace: openshift-marketplace
EOF
```

Wait for the operator to reach `Succeeded`:

```bash
oc get csv -n openshift-storage
```

## Step 3 - Create the StorageCluster

```yaml
apiVersion: ocs.openshift.io/v1
kind: StorageCluster
metadata:
  name: ocs-storagecluster
  namespace: openshift-storage
spec:
  storageDeviceSets:
    - name: ocs-deviceset
      count: 1
      replica: 3
      dataPVCTemplate:
        spec:
          accessModes:
            - ReadWriteOnce
          volumeMode: Block
          storageClassName: local-block
          resources:
            requests:
              storage: 500Gi
```

```bash
oc apply -f storagecluster.yaml
```

## Step 4 - Monitor Deployment Progress

```bash
oc get storagecluster -n openshift-storage
oc get pods -n openshift-storage -w
```

All OSD, MON, and MGR pods should reach `Running`. The StorageCluster status should show `Ready`.

## Step 5 - Verify Storage Classes

```bash
oc get storageclass
```

You should see:
- `ocs-storagecluster-ceph-rbd` - block storage
- `ocs-storagecluster-cephfs` - shared file storage
- `openshift-storage.noobaa.io` - object storage

## Step 6 - Create a Test PVC

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-ocs-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: ocs-storagecluster-ceph-rbd
  resources:
    requests:
      storage: 10Gi
```

```bash
oc apply -f test-pvc.yaml && oc get pvc test-ocs-pvc
```

## Summary

Setting up RHCS for OpenShift Container Storage in internal mode involves labeling storage nodes, installing the OCS operator, and creating a StorageCluster resource that defines the device sets. Once deployed, Ceph-backed StorageClasses are automatically available across the cluster for block, file, and object workloads.
