# How to Create BucketAccess with COSI in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, COSI, BucketAccess, Kubernetes, Object Storage

Description: Learn how to create BucketAccess resources in COSI to grant application pods S3 credentials for accessing provisioned buckets in Rook-Ceph.

---

## Overview

In the COSI (Container Object Storage Interface) framework, `BucketAccess` is the resource that binds an application namespace to a provisioned bucket with specific credentials. While a `BucketClaim` provisions the bucket, a `BucketAccess` grants access to it - producing a Kubernetes Secret with S3 credentials that your pods can consume.

## The Relationship Between COSI Resources

```text
BucketClass          BucketAccessClass
     |                      |
     v                      v
BucketClaim  -------> BucketAccess
     |                      |
     v                      v
  Bucket (Ceph)       Secret (credentials)
```

## Prerequisites

```bash
# Verify a BucketClaim exists and is bound
kubectl get bucketclaim -n my-app
# NAME             STATUS
# my-app-bucket    Bound

# Verify a BucketAccessClass exists
kubectl get bucketaccessclass
```

## Creating a BucketAccess

```yaml
apiVersion: objectstorage.k8s.io/v1alpha1
kind: BucketAccess
metadata:
  name: my-app-bucket-access
  namespace: my-app
spec:
  bucketClaimName: my-app-bucket
  protocol: S3
  bucketAccessClassName: rook-ceph-access-class
  credentialsSecretName: my-bucket-credentials
```

```bash
kubectl apply -f bucketaccess.yaml

# Wait for it to become Ready
kubectl get bucketaccess -n my-app my-app-bucket-access -w
```

## BucketAccess Spec Fields

| Field | Required | Description |
|-------|----------|-------------|
| `bucketClaimName` | Yes | Name of the BucketClaim to access (must be in the same namespace) |
| `protocol` | No | `S3`, `Azure`, or `GCP`. If omitted, defaults to the protocol supported by the bucket |
| `bucketAccessClassName` | Yes | Authentication class to use |
| `credentialsSecretName` | Yes | Name for the generated Secret |
| `serviceAccountName` | No | For IAM-style auth |

## Checking BucketAccess Status

```bash
kubectl describe bucketaccess -n my-app my-app-bucket-access
```

Status fields to look for:
- `accessGranted: true` - credentials have been issued
- `accountID` - the Ceph user created for this access

## Using the Generated Secret

After BucketAccess is ready, a Secret named `my-bucket-credentials` is created:

```bash
kubectl get secret -n my-app my-bucket-credentials -o yaml
```

The Secret contains a single key `BucketInfo` whose value is a JSON-serialized object with the following structure:

```json
{
  "spec": {
    "bucketName": "my-app-bucket-xxxx",
    "authenticationType": "KEY",
    "protocols": ["S3"],
    "secretS3": {
      "endpoint": "http://rook-ceph-rgw-my-store.rook-ceph.svc:80",
      "region": "",
      "accessKeyID": "EXAMPLE_ACCESS_KEY",
      "accessSecretKey": "EXAMPLE_SECRET_KEY"
    }
  }
}
```

To use it in a pod, mount the Secret and parse the JSON. For example, using an init container to extract the credentials:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: s3-consumer
  namespace: my-app
spec:
  initContainers:
  - name: extract-creds
    image: busybox:latest
    command: ["/bin/sh", "-c"]
    args:
    - |
      cat /cosi/BucketInfo | sed 's/.*accessKeyID":"//' | sed 's/".*//' > /shared/access-key-id
      cat /cosi/BucketInfo | sed 's/.*accessSecretKey":"//' | sed 's/".*//' > /shared/access-secret-key
      cat /cosi/BucketInfo | sed 's/.*endpoint":"//' | sed 's/".*//' > /shared/endpoint
      cat /cosi/BucketInfo | sed 's/.*bucketName":"//' | sed 's/".*//' > /shared/bucket-name
    volumeMounts:
    - name: cosi-secret
      mountPath: /cosi
    - name: shared
      mountPath: /shared
  containers:
  - name: app
    image: amazon/aws-cli:latest
    command: ["/bin/sh", "-c"]
    args:
    - |
      export AWS_ACCESS_KEY_ID=$(cat /shared/access-key-id)
      export AWS_SECRET_ACCESS_KEY=$(cat /shared/access-secret-key)
      export AWS_ENDPOINT_URL=$(cat /shared/endpoint)
      aws s3 ls --endpoint-url $AWS_ENDPOINT_URL
      sleep infinity
    volumeMounts:
    - name: shared
      mountPath: /shared
  volumes:
  - name: cosi-secret
    secret:
      secretName: my-bucket-credentials
  - name: shared
    emptyDir: {}
```

## Granting Multiple Applications Access to the Same Bucket

You can create multiple BucketAccess objects pointing to the same BucketClaim within the same namespace. Note that BucketAccess resolves `bucketClaimName` in its own namespace, so cross-namespace references are not supported.

```yaml
# Access for service A (same namespace as the BucketClaim)
apiVersion: objectstorage.k8s.io/v1alpha1
kind: BucketAccess
metadata:
  name: service-a-access
  namespace: my-app
spec:
  bucketClaimName: shared-bucket
  protocol: S3
  bucketAccessClassName: rook-ceph-access-class
  credentialsSecretName: service-a-creds

---
# Access for service B (separate credentials, same namespace)
apiVersion: objectstorage.k8s.io/v1alpha1
kind: BucketAccess
metadata:
  name: service-b-access
  namespace: my-app
spec:
  bucketClaimName: shared-bucket
  protocol: S3
  bucketAccessClassName: rook-ceph-access-class
  credentialsSecretName: service-b-creds
```

Each service gets its own Ceph user credentials while accessing the same underlying bucket. The credential Secrets are created in the same namespace and can be referenced by pods deployed there.

## Summary

BucketAccess is the COSI resource that completes the object storage provisioning workflow by issuing credentials for a specific bucket claim. It creates isolated Ceph RGW user accounts and stores the resulting S3 credentials in a named Kubernetes Secret. This design allows multiple services to independently access the same bucket with separate credential lifecycles, improving security isolation in multi-tenant Kubernetes environments.
