# How to Create BucketClaims with COSI in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, COSI, BucketClaim, Kubernetes, Object Storage

Description: Learn how to create and manage BucketClaim resources using the COSI standard in Rook-Ceph to provision S3-compatible buckets for Kubernetes applications.

---

## Overview

A `BucketClaim` is the COSI (Container Object Storage Interface) equivalent of a PersistentVolumeClaim - it requests a bucket from a `BucketClass`. When you create a BucketClaim, the COSI controller calls the Rook-Ceph driver to provision a new bucket in Ceph RGW. The claim then transitions to a `Bound` state once provisioning succeeds.

## Prerequisites

Before creating BucketClaims, verify the following are in place:

```bash
# 1. COSI controller is running
kubectl get pods -n container-object-storage-system

# 2. Rook COSI driver is running
kubectl get pods -n rook-ceph -l app=rook-ceph-cosi-driver

# 3. A BucketClass exists
kubectl get bucketclass
```

## Creating a Basic BucketClaim

```yaml
apiVersion: objectstorage.k8s.io/v1alpha1
kind: BucketClaim
metadata:
  name: my-app-bucket
  namespace: my-app
spec:
  bucketClassName: rook-ceph-bucketclass
  protocols:
  - s3
```

```bash
kubectl apply -f bucketclaim.yaml

# Watch the claim status
kubectl get bucketclaim -n my-app my-app-bucket -w
```

## BucketClaim Spec Fields

```yaml
spec:
  # Reference to the BucketClass
  bucketClassName: rook-ceph-bucketclass

  # Storage protocols this claim requires
  protocols:
  - s3

  # Optional: request an existing bucket by name
  existingBucketName: ""
```

## Checking BucketClaim Status

```bash
kubectl describe bucketclaim -n my-app my-app-bucket
```

Key status fields:
- `bucketReady: true` - bucket has been successfully provisioned
- `bucketName` - the actual bucket name created in Ceph

## Listing BucketClaims

```bash
# List all BucketClaims in a namespace
kubectl get bucketclaim -n my-app

# List cluster-wide
kubectl get bucketclaim -A
```

## Claiming an Existing Bucket

If a bucket already exists in Ceph RGW and you want to represent it as a BucketClaim:

```bash
# First get the bucket ID from the Bucket object
kubectl get bucket

# Then reference it in your claim
```

```yaml
apiVersion: objectstorage.k8s.io/v1alpha1
kind: BucketClaim
metadata:
  name: existing-bucket-claim
  namespace: my-app
spec:
  bucketClassName: rook-ceph-bucketclass
  existingBucketName: "ceph-bucket-abc123"
  protocols:
  - s3
```

## Multi-Protocol Claims

The COSI specification defines three protocols: `s3`, `azure`, and `gcs`. Ceph RGW's COSI driver currently only supports the S3 protocol:

```yaml
spec:
  bucketClassName: rook-ceph-bucketclass
  protocols:
  - s3
```

## Deleting a BucketClaim

```bash
kubectl delete bucketclaim -n my-app my-app-bucket
```

The bucket in Ceph will be deleted or retained based on the `deletionPolicy` of the BucketClass:
- `Delete` - removes the bucket and all objects
- `Retain` - keeps the bucket intact in Ceph

## Troubleshooting

```bash
# Check COSI controller logs
kubectl logs -n container-object-storage-system deploy/controller-manager

# Check Rook COSI driver logs
kubectl logs -n rook-ceph deploy/rook-ceph-cosi-driver
```

## Summary

BucketClaims provide a Kubernetes-native mechanism for provisioning object storage buckets through the COSI standard. By referencing a BucketClass, application teams can request buckets without needing to understand Ceph RGW internals. The claim lifecycle mirrors PVC semantics, making COSI bucket management intuitive for Kubernetes operators already familiar with persistent volume workflows.
