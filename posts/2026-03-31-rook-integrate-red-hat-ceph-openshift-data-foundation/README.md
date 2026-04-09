# How to Integrate Red Hat Ceph with OpenShift Data Foundation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, OpenShift, Storage, Integration, Kubernetes

Description: Learn how to connect Red Hat Ceph Storage with OpenShift Data Foundation to provide block, file, and object storage for OpenShift workloads.

---

OpenShift Data Foundation (ODF) is Red Hat's storage layer for OpenShift. When backed by an external Red Hat Ceph Storage (RHCS) cluster, ODF acts as a bridge that exposes Ceph's block, file, and object interfaces as native Kubernetes StorageClasses and ObjectBucketClaims.

## Architecture Overview

In the external mode, ODF runs its own set of operators inside OpenShift while all actual data is stored on a separate RHCS cluster. OpenShift uses:

- RBD for block (PersistentVolumeClaims)
- CephFS for shared file storage
- RGW for S3-compatible object storage

## Step 1 - Prepare the External Ceph Cluster

On the RHCS cluster, run the extraction script provided by ODF to create the required users and output connection details:

```bash
python3 ceph-external-cluster-details-exporter.py \
  --rbd-data-pool-name ocs-storagecluster-cephblockpool \
  --rgw-endpoint 192.168.1.20:80 \
  --monitoring-endpoint 192.168.1.10 \
  > external-cluster-details.json
```

## Step 2 - Install the ODF Operator

In the OpenShift console or via CLI, install the ODF operator:

```bash
oc apply -f - <<EOF
apiVersion: operators.coreos.com/v1alpha1
kind: Subscription
metadata:
  name: odf-operator
  namespace: openshift-storage
spec:
  channel: stable-4.15
  name: odf-operator
  source: redhat-operators
  sourceNamespace: openshift-marketplace
EOF
```

## Step 3 - Create the StorageCluster in External Mode

Import the connection details from step 1:

```bash
oc create secret generic rook-ceph-external-cluster-details \
  --from-file=external_cluster_details=external-cluster-details.json \
  -n openshift-storage
```

Then create the StorageCluster:

```yaml
apiVersion: ocs.openshift.io/v1
kind: StorageCluster
metadata:
  name: ocs-external-storagecluster
  namespace: openshift-storage
spec:
  externalStorage:
    enable: true
  managedResources:
    cephBlockPools:
      reconcileStrategy: ignore
    cephFilesystems:
      reconcileStrategy: ignore
```

```bash
oc apply -f storagecluster-external.yaml
```

## Step 4 - Verify StorageClasses

After the cluster reaches `Ready`, check the available StorageClasses:

```bash
oc get storageclass | grep ceph
```

You should see classes for RBD, CephFS, and RGW bucket provisioning.

## Step 5 - Test with a PVC

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-block-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: ocs-external-storagecluster-ceph-rbd
  resources:
    requests:
      storage: 5Gi
```

```bash
oc apply -f test-pvc.yaml
oc get pvc test-block-pvc
```

## Summary

Integrating RHCS with ODF in external mode lets you separate storage infrastructure from the OpenShift cluster while still exposing Ceph capabilities as native Kubernetes primitives. The key steps are extracting connection credentials from RHCS, installing the ODF operator, and creating a StorageCluster resource that points to the external cluster.
