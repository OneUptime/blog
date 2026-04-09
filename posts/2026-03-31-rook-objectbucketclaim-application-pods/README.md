# How to Use ObjectBucketClaims with Application Pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, ObjectBucketClaim, Kubernetes, S3, Application

Description: A complete walkthrough for wiring ObjectBucketClaims to application pods in Kubernetes, covering OBC creation, credential injection, and verifying connectivity.

---

## Overview

ObjectBucketClaims (OBCs) provide a Kubernetes-native way to provision S3-compatible object storage buckets for applications. Once created, Rook provisions the bucket in Ceph RGW and creates a Secret and ConfigMap that pods can consume. This guide walks through the full lifecycle from OBC creation to a running application pod that reads and writes to the bucket.

## Step 1: Create the StorageClass

First, verify your object store has a provisioner-enabled StorageClass:

```bash
kubectl get storageclass | grep rook-ceph
```

If not present, create one:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-bucket
provisioner: rook-ceph.ceph.rook.io/bucket
reclaimPolicy: Delete
parameters:
  objectStoreName: my-store
  objectStoreNamespace: rook-ceph
```

```bash
kubectl apply -f storageclass-bucket.yaml
```

## Step 2: Create the ObjectBucketClaim

```yaml
apiVersion: objectbucket.io/v1alpha1
kind: ObjectBucketClaim
metadata:
  name: app-data-bucket
  namespace: my-app
spec:
  generateBucketName: app-data
  storageClassName: rook-ceph-bucket
```

```bash
kubectl apply -f obc.yaml

# Wait for it to become Bound
kubectl get obc -n my-app app-data-bucket
```

## Step 3: Verify the Secret and ConfigMap

```bash
kubectl get secret app-data-bucket -n my-app
kubectl get configmap app-data-bucket -n my-app
```

Both resources should appear within a few seconds of the OBC reaching `Bound` state.

## Step 4: Deploy an Application Pod

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: s3-writer
  namespace: my-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: s3-writer
  template:
    metadata:
      labels:
        app: s3-writer
    spec:
      containers:
      - name: writer
        image: amazon/aws-cli:latest
        command: ["/bin/sh", "-c", "sleep infinity"]
        envFrom:
        - secretRef:
            name: app-data-bucket
        - configMapRef:
            name: app-data-bucket
        env:
        - name: AWS_DEFAULT_REGION
          value: us-east-1
```

```bash
kubectl apply -f deployment.yaml
```

## Step 5: Test Bucket Access from the Pod

```bash
POD=$(kubectl get pod -n my-app -l app=s3-writer -o jsonpath='{.items[0].metadata.name}')

kubectl exec -n my-app $POD -- \
  sh -c 'aws s3 ls s3://$BUCKET_NAME \
  --endpoint-url http://$BUCKET_HOST:$BUCKET_PORT \
  --no-verify-ssl'

# Upload a test file
kubectl exec -n my-app $POD -- \
  sh -c 'aws s3 cp /etc/hostname s3://$BUCKET_NAME/test.txt \
  --endpoint-url http://$BUCKET_HOST:$BUCKET_PORT'
```

## Step 6: Clean Up

When you delete the OBC, Rook handles cleanup based on the reclaim policy:

```bash
kubectl delete obc app-data-bucket -n my-app
```

With `reclaimPolicy: Delete`, Rook will delete the bucket and its contents. With `Retain`, the bucket persists in Ceph even after the OBC is removed.

## Common Issues

- **OBC stays in `Pending`**: Verify the StorageClass name matches and the RGW is running
- **Secret not appearing**: Check the object-bucket-provisioner logs in the rook-ceph namespace
- **Connection refused from pod**: Ensure the pod can reach the RGW service via DNS

## Summary

ObjectBucketClaims provide a clean, declarative interface for provisioning S3 buckets from Kubernetes workloads. By using `envFrom` to inject both the Secret and ConfigMap, application pods get all necessary credentials and endpoint information automatically. This pattern eliminates hardcoded credentials and makes bucket provisioning a first-class Kubernetes operation.
