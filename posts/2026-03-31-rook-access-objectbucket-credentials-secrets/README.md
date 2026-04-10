# How to Access ObjectBucket Credentials from Kubernetes Secrets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, ObjectBucket, Kubernetes, Secret, S3

Description: Learn how to retrieve and use S3 credentials from Kubernetes Secrets and ConfigMaps created by Rook ObjectBucketClaims for application access.

---

## Overview

When you create an ObjectBucketClaim (OBC) in Rook, the operator automatically provisions two Kubernetes resources in the same namespace: a Secret containing the access key and secret key, and a ConfigMap with the bucket name and endpoint details. Understanding how to access these resources is essential for connecting applications to Ceph object storage.

## What Gets Created

After an OBC is bound, Rook creates:

1. A **Secret** named the same as the OBC with S3 credentials
2. A **ConfigMap** named the same as the OBC with endpoint and bucket info

```bash
# List the resources created by an OBC named "my-bucket"
kubectl get secret my-bucket -n my-app-namespace -o yaml
kubectl get configmap my-bucket -n my-app-namespace -o yaml
```

## Reading the Secret

```bash
# Get the AWS_ACCESS_KEY_ID
kubectl get secret my-bucket -n my-app-namespace \
  -o jsonpath='{.data.AWS_ACCESS_KEY_ID}' | base64 --decode

# Get the AWS_SECRET_ACCESS_KEY
kubectl get secret my-bucket -n my-app-namespace \
  -o jsonpath='{.data.AWS_SECRET_ACCESS_KEY}' | base64 --decode
```

## Reading the ConfigMap

```bash
# Get the bucket name
kubectl get configmap my-bucket -n my-app-namespace \
  -o jsonpath='{.data.BUCKET_NAME}'

# Get the endpoint
kubectl get configmap my-bucket -n my-app-namespace \
  -o jsonpath='{.data.BUCKET_HOST}'

# Get the port
kubectl get configmap my-bucket -n my-app-namespace \
  -o jsonpath='{.data.BUCKET_PORT}'
```

## Injecting Credentials into a Pod

The recommended pattern is to reference the Secret and ConfigMap directly in your pod spec:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: s3-app
  namespace: my-app-namespace
spec:
  containers:
  - name: app
    image: amazon/aws-cli:latest
    env:
    - name: AWS_ACCESS_KEY_ID
      valueFrom:
        secretKeyRef:
          name: my-bucket
          key: AWS_ACCESS_KEY_ID
    - name: AWS_SECRET_ACCESS_KEY
      valueFrom:
        secretKeyRef:
          name: my-bucket
          key: AWS_SECRET_ACCESS_KEY
    - name: BUCKET_NAME
      valueFrom:
        configMapKeyRef:
          name: my-bucket
          key: BUCKET_NAME
    - name: BUCKET_HOST
      valueFrom:
        configMapKeyRef:
          name: my-bucket
          key: BUCKET_HOST
```

## Using envFrom for Cleaner Pod Specs

```yaml
spec:
  containers:
  - name: app
    image: my-app:latest
    envFrom:
    - secretRef:
        name: my-bucket
    - configMapRef:
        name: my-bucket
```

This injects all keys from both resources as environment variables automatically.

## Constructing the S3 Endpoint URL

```bash
HOST=$(kubectl get configmap my-bucket -n my-app-namespace -o jsonpath='{.data.BUCKET_HOST}')
PORT=$(kubectl get configmap my-bucket -n my-app-namespace -o jsonpath='{.data.BUCKET_PORT}')
echo "http://${HOST}:${PORT}"
```

## Verifying Access with the AWS CLI

```bash
export AWS_ACCESS_KEY_ID=$(kubectl get secret my-bucket -n my-app-namespace \
  -o jsonpath='{.data.AWS_ACCESS_KEY_ID}' | base64 --decode)
export AWS_SECRET_ACCESS_KEY=$(kubectl get secret my-bucket -n my-app-namespace \
  -o jsonpath='{.data.AWS_SECRET_ACCESS_KEY}' | base64 --decode)
export BUCKET_NAME=$(kubectl get configmap my-bucket -n my-app-namespace \
  -o jsonpath='{.data.BUCKET_NAME}')

aws s3 ls s3://$BUCKET_NAME \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc:80
```

## Summary

Rook automatically provisions Kubernetes Secrets and ConfigMaps when ObjectBucketClaims are bound, following the lib-bucket-provisioner naming convention. Applications can inject these credentials directly using `envFrom` or individual `valueFrom` references, keeping S3 access keys out of application code. The OBC and consuming pod must be in the same namespace for this pattern to work.
