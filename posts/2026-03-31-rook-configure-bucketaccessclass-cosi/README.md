# How to Configure BucketAccessClass for COSI in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, COSI, BucketAccessClass, Kubernetes, Object Storage

Description: Learn how to configure BucketAccessClass resources to control authentication and access policies for COSI buckets in Rook-Ceph.

---

## Overview

In the COSI (Container Object Storage Interface) framework, `BucketAccessClass` defines how applications authenticate to object storage buckets. While `BucketClass` controls bucket provisioning, `BucketAccessClass` governs the credential type and authentication mechanism. This separation allows platform teams to manage storage provisioning independently from access control.

## BucketAccessClass vs BucketClass

| Resource | Purpose |
|----------|---------|
| `BucketClass` | How buckets are created and deleted |
| `BucketAccessClass` | How applications get credentials to access buckets |

## Creating a BucketAccessClass

```yaml
apiVersion: objectstorage.k8s.io/v1alpha1
kind: BucketAccessClass
metadata:
  name: rook-ceph-access-class
driverName: rook-ceph.ceph.objectstorage.k8s.io
authenticationType: KEY
parameters:
  objectStoreUserSecretName: rook-ceph-object-user-my-store-cosi
  objectStoreUserSecretNamespace: rook-ceph
```

```bash
kubectl apply -f bucketaccessclass.yaml
```

## Authentication Types

The COSI specification defines two authentication types: `KEY` and `IAM`. Rook-Ceph currently supports `KEY`-based authentication.

### Key-based Authentication (AWS-style)

```yaml
apiVersion: objectstorage.k8s.io/v1alpha1
kind: BucketAccessClass
metadata:
  name: rook-key-access
driverName: rook-ceph.ceph.objectstorage.k8s.io
authenticationType: KEY
parameters:
  objectStoreUserSecretName: rook-ceph-object-user-my-store-cosi
  objectStoreUserSecretNamespace: rook-ceph
```

The driver will generate S3 credentials (access key and secret key) and store them in a Kubernetes Secret.

## Verifying a BucketAccessClass

```bash
kubectl get bucketaccessclass
kubectl describe bucketaccessclass rook-ceph-access-class
```

## How It Works in Practice

When a `BucketAccess` object references a `BucketAccessClass`, Rook:

1. Uses the CephObjectStoreUser referenced by the secret in the parameters
2. Generates S3 credentials (access key ID and secret access key)
3. Stores the credentials in a Kubernetes Secret in the requesting namespace
4. Grants the application access to the specified bucket

```bash
# After creating a BucketAccess, find the credential secret
kubectl get secrets -n my-app | grep bucket-access
```

## Role-Based Access Patterns

Create separate BucketAccessClasses backed by different CephObjectStoreUsers with different permission levels:

```yaml
# Read-only access class (backed by a restricted CephObjectStoreUser)
apiVersion: objectstorage.k8s.io/v1alpha1
kind: BucketAccessClass
metadata:
  name: rook-readonly-access
driverName: rook-ceph.ceph.objectstorage.k8s.io
authenticationType: KEY
parameters:
  objectStoreUserSecretName: rook-ceph-object-user-my-store-readonly
  objectStoreUserSecretNamespace: rook-ceph
```

```yaml
# Full access class (backed by a CephObjectStoreUser with full permissions)
apiVersion: objectstorage.k8s.io/v1alpha1
kind: BucketAccessClass
metadata:
  name: rook-full-access
driverName: rook-ceph.ceph.objectstorage.k8s.io
authenticationType: KEY
parameters:
  objectStoreUserSecretName: rook-ceph-object-user-my-store-admin
  objectStoreUserSecretNamespace: rook-ceph
```

To enforce different permission levels, create separate `CephObjectStoreUser` resources with appropriate capabilities, then reference their secrets in the corresponding BucketAccessClass.

## Listing All Access Classes

```bash
kubectl get bucketaccessclass
```

## Summary

BucketAccessClass is a COSI resource that defines how applications receive credentials to access object storage buckets in Rook-Ceph. By separating access configuration from bucket provisioning, platform teams can enforce consistent authentication policies while allowing application teams to self-provision storage. Creating tiered access classes (read-only, read-write, admin) provides fine-grained control over Ceph RGW access without manual credential management.
