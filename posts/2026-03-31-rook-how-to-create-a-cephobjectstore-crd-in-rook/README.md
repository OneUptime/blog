# How to Create a CephObjectStore CRD in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Object Storage, S3, Kubernetes, RGW

Description: Learn how to create a CephObjectStore CRD in Rook to deploy an S3-compatible object storage endpoint backed by Ceph RADOS Gateway.

---

## Overview

The `CephObjectStore` CRD in Rook deploys and manages Ceph RADOS Gateway (RGW) instances, providing S3-compatible object storage. Once deployed, you can use standard S3 clients, SDKs, and tools to interact with your Ceph cluster through the object storage interface.

## Creating a Basic CephObjectStore

Define a minimal CephObjectStore manifest:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: my-store
  namespace: rook-ceph
spec:
  metadataPool:
    failureDomain: host
    replicated:
      size: 3
  dataPool:
    failureDomain: host
    erasureCoded:
      dataChunks: 2
      codingChunks: 1
  preservePoolsOnDelete: true
  gateway:
    sslCertificateRef:
    port: 80
    instances: 2
    priorityClassName: system-cluster-critical
```

Apply the manifest:

```bash
kubectl apply -f object-store.yaml
```

## Verifying the Object Store

Check the CephObjectStore status:

```bash
kubectl -n rook-ceph get cephobjectstore my-store
```

Wait for the status to become `Ready`:

```text
NAME       PHASE
my-store   Ready
```

Verify the RGW pods are running:

```bash
kubectl -n rook-ceph get pod -l app=rook-ceph-rgw
```

## Accessing the Object Store

By default, Rook creates a Kubernetes Service for the RGW endpoint. Get the service details:

```bash
kubectl -n rook-ceph get svc rook-ceph-rgw-my-store
```

For external access, you can add service annotations in the CephObjectStore spec to configure a cloud load balancer:

```yaml
spec:
  gateway:
    port: 80
    instances: 2
    service:
      annotations:
        service.beta.kubernetes.io/aws-load-balancer-type: nlb
```

Alternatively, patch the RGW service directly to use a NodePort:

```bash
kubectl -n rook-ceph patch svc rook-ceph-rgw-my-store \
  --type merge \
  -p '{"spec":{"type":"NodePort"}}'
```

## Creating Object Store Users

Create an object store user to generate S3 credentials:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStoreUser
metadata:
  name: my-user
  namespace: rook-ceph
spec:
  store: my-store
  displayName: "My S3 User"
  capabilities:
    user: "*"
    bucket: "*"
    metadata: "*"
    usage: "*"
    zone: "*"
```

Apply and retrieve credentials:

```bash
kubectl apply -f object-store-user.yaml
kubectl -n rook-ceph get secret rook-ceph-object-user-my-store-my-user -o yaml
```

Decode the credentials:

```bash
AWS_ACCESS_KEY=$(kubectl -n rook-ceph get secret rook-ceph-object-user-my-store-my-user \
  -o jsonpath='{.data.AccessKey}' | base64 --decode)
AWS_SECRET_KEY=$(kubectl -n rook-ceph get secret rook-ceph-object-user-my-store-my-user \
  -o jsonpath='{.data.SecretKey}' | base64 --decode)
```

## Testing with the AWS CLI

Configure the AWS CLI to use the Ceph endpoint:

```bash
aws configure set aws_access_key_id $AWS_ACCESS_KEY
aws configure set aws_secret_access_key $AWS_SECRET_KEY

# List buckets
aws --endpoint-url http://<rgw-service-ip>:80 s3 ls

# Create a bucket
aws --endpoint-url http://<rgw-service-ip>:80 s3 mb s3://my-bucket

# Upload a file
aws --endpoint-url http://<rgw-service-ip>:80 s3 cp myfile.txt s3://my-bucket/
```

## Scaling RGW Instances

Adjust the number of RGW instances for higher throughput:

```bash
kubectl -n rook-ceph patch cephobjectstore my-store \
  --type merge \
  -p '{"spec":{"gateway":{"instances":4}}}'
```

## Summary

Creating a CephObjectStore CRD in Rook deploys Ceph RGW instances that provide S3-compatible object storage. The CRD configures metadata and data pools, the number of gateway instances, and service exposure. After creating the object store, deploy CephObjectStoreUser CRDs to generate S3 credentials, then use standard S3 clients to interact with the storage endpoint.
