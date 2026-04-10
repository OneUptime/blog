# How to Configure BucketClass for COSI in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, COSI, BucketClass, Kubernetes, Object Storage

Description: Learn how to configure BucketClass resources for the Container Object Storage Interface (COSI) standard in Rook-Ceph deployments.

---

## Overview

The Container Object Storage Interface (COSI) is a Kubernetes standard for object storage provisioning, similar to how CSI works for block and file storage. In Rook, a `BucketClass` is a COSI resource that defines how buckets should be provisioned - analogous to a StorageClass for PVCs. This guide covers creating and configuring BucketClass resources for Rook-Ceph.

## Prerequisites

Ensure COSI is enabled in your cluster:

```bash
# Check if the COSI controller is running
kubectl get pods -n container-object-storage-system

# Check if COSI CRDs are installed
kubectl get crd | grep objectstorage
```

## Installing the COSI Controller

If COSI is not yet installed:

```bash
kubectl apply -k github.com/kubernetes-sigs/container-object-storage-interface
```

## Installing the Rook-Ceph COSI Driver

```bash
kubectl apply -f https://raw.githubusercontent.com/rook/rook/master/deploy/examples/cosi/cephcosidriver.yaml
```

## Creating a BucketClass

A `BucketClass` specifies the driver and deletion policy for provisioned buckets:

```yaml
apiVersion: objectstorage.k8s.io/v1alpha1
kind: BucketClass
metadata:
  name: rook-ceph-bucketclass
driverName: rook-ceph.ceph.objectstorage.k8s.io
deletionPolicy: Delete
parameters:
  objectStoreUserSecretName: rook-ceph-object-user-my-store-cosi
  objectStoreUserSecretNamespace: rook-ceph
```

```bash
kubectl apply -f bucketclass.yaml
```

## BucketClass Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `objectStoreUserSecretName` | Name of the secret for the CephObjectStoreUser | `rook-ceph-object-user-my-store-cosi` |
| `objectStoreUserSecretNamespace` | Namespace of the CephObjectStoreUser secret | `rook-ceph` |

## BucketClass with Retain Policy

```yaml
apiVersion: objectstorage.k8s.io/v1alpha1
kind: BucketClass
metadata:
  name: rook-ceph-retain-bucketclass
driverName: rook-ceph.ceph.objectstorage.k8s.io
deletionPolicy: Retain
parameters:
  objectStoreUserSecretName: rook-ceph-object-user-my-store-cosi
  objectStoreUserSecretNamespace: rook-ceph
```

## Deletion Policy Options

- **`Delete`**: When a BucketClaim is deleted, Rook removes the bucket and all its contents from Ceph
- **`Retain`**: The bucket persists in Ceph even after the BucketClaim is removed; useful for compliance scenarios

```yaml
# Use Retain for production data
deletionPolicy: Retain
```

## Verifying the BucketClass

```bash
kubectl get bucketclass
kubectl describe bucketclass rook-ceph-bucketclass
```

## Using Multiple BucketClasses

You can create multiple BucketClasses for different object stores or configurations:

```bash
# List all available BucketClasses
kubectl get bucketclass

# NAME                        DRIVER                              AGE
# rook-ceph-bucketclass       rook-ceph.ceph.objectstorage.k8s.io             5m
# rook-ceph-archive           rook-ceph.ceph.objectstorage.k8s.io             2m
```

Different teams or applications can reference different classes based on their storage tier requirements.

## Summary

BucketClass is the COSI equivalent of a Kubernetes StorageClass, defining provisioning parameters and deletion policies for object storage buckets. In Rook-Ceph, you configure BucketClasses to reference CephObjectStoreUser secrets and set appropriate deletion policies. Creating well-named BucketClasses for different tiers (standard, archive, dev) makes self-service bucket provisioning safe and governed across your Kubernetes platform.
