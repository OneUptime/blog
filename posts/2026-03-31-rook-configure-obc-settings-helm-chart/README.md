# How to Configure OBC Settings in Rook Helm Chart

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, Helm, OBC, Object Storage

Description: Configure ObjectBucketClaim (OBC) settings in the Rook-Ceph Helm chart to enable automated S3-compatible bucket provisioning for applications.

---

## Overview

ObjectBucketClaims (OBCs) provide a Kubernetes-native way for applications to request S3-compatible buckets, similar to how PersistentVolumeClaims work for block storage. The Rook-Ceph operator installs the OBC provisioner as part of the Helm chart. Several Helm values control OBC behavior.

## Enabling the OBC Provisioner

The OBC provisioner is enabled by default when the operator chart is installed. To verify or explicitly enable:

```yaml
# In rook-operator chart values
# OBC provisioner is automatically enabled
# when the operator is deployed
```

Check that the operator deployment includes the OBC controller:

```bash
kubectl get deployment -n rook-ceph rook-ceph-operator \
  -o jsonpath='{.spec.template.spec.containers[0].args}'
```

## Applying via Helm

```bash
helm upgrade rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  -f rook-obc-values.yaml
```

## Creating a BucketClass (StorageClass for Buckets)

OBCs require a `StorageClass` pointing to the Ceph object store:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-bucket
provisioner: rook-ceph.ceph.rook.io/bucket
reclaimPolicy: Delete
parameters:
  objectStoreName: ceph-objectstore
  objectStoreNamespace: rook-ceph
```

## Creating an ObjectBucketClaim

Applications request buckets using OBCs:

```yaml
apiVersion: objectbucket.io/v1alpha1
kind: ObjectBucketClaim
metadata:
  name: my-app-bucket
  namespace: default
spec:
  bucketName: my-unique-bucket-name
  storageClassName: rook-ceph-bucket
```

```bash
kubectl apply -f obc.yaml
kubectl get obc my-app-bucket
```

## Consuming the Bucket in an Application

When an OBC is bound, Rook creates a ConfigMap and Secret with connection details:

```bash
kubectl get configmap my-app-bucket -o yaml
kubectl get secret my-app-bucket -o yaml
```

Reference them in a pod:

```yaml
spec:
  containers:
    - name: app
      envFrom:
        - configMapRef:
            name: my-app-bucket
        - secretRef:
            name: my-app-bucket
```

Environment variables available: `BUCKET_HOST`, `BUCKET_PORT`, `BUCKET_NAME`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`.

## OBC with Quota Settings

Limit bucket capacity and object count:

```yaml
apiVersion: objectbucket.io/v1alpha1
kind: ObjectBucketClaim
metadata:
  name: quota-bucket
  namespace: default
spec:
  storageClassName: rook-ceph-bucket
  additionalConfig:
    maxSize: "10Gi"
    maxObjects: "10000"
```

## Summary

OBC settings in the Rook Helm chart enable the operator to function as an S3 bucket provisioner. The StorageClass defines which object store backs the buckets, while OBCs provide a self-service mechanism for applications to request storage. Connection credentials and endpoints are delivered automatically via ConfigMap and Secret resources.
