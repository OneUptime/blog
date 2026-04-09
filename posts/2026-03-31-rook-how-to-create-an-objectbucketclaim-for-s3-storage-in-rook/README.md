# How to Create an ObjectBucketClaim for S3 Storage in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, S3, Object Storage, Kubernetes

Description: Learn how to provision S3-compatible object storage buckets in Rook-Ceph using ObjectBucketClaims and access them from Kubernetes applications.

---

## What is an ObjectBucketClaim

An ObjectBucketClaim (OBC) is a Kubernetes custom resource provided by Rook that allows applications to dynamically provision S3-compatible object storage buckets. Similar to how PersistentVolumeClaims work for block/file storage, OBCs provide a declarative way to request buckets from a Ceph Object Store.

When an OBC is created, Rook automatically:
- Creates the bucket in Ceph RGW
- Creates a Secret with S3 credentials (access key and secret key)
- Creates a ConfigMap with bucket connection details

## Prerequisites

Before creating OBCs, ensure you have a running CephObjectStore:

```bash
kubectl -n rook-ceph get cephobjectstores
```

Output:

```text
NAME          PHASE
my-store      Ready
```

And an ObjectBucketClass (StorageClass for buckets):

```bash
kubectl get storageclass | grep bucket
```

Output:

```text
rook-ceph-bucket   Delete   1m
```

## Creating a Basic ObjectBucketClaim

```yaml
apiVersion: objectbucket.io/v1alpha1
kind: ObjectBucketClaim
metadata:
  name: my-app-bucket
  namespace: my-app
spec:
  generateBucketName: my-app-bucket
  storageClassName: rook-ceph-bucket
```

Apply it:

```bash
kubectl apply -f obc.yaml
kubectl -n my-app get objectbucketclaim my-app-bucket
```

Output:

```text
NAME            STORAGE-CLASS      PHASE   AGE
my-app-bucket   rook-ceph-bucket   Bound   30s
```

## Accessing the Created Secret and ConfigMap

When the OBC reaches Bound state, Rook creates a Secret and ConfigMap with the same name:

```bash
kubectl -n my-app get secret my-app-bucket -o jsonpath='{.data}' | python3 -c "import sys,json,base64; d=json.load(sys.stdin); print({k: base64.b64decode(v).decode() for k,v in d.items()})"
```

Output:

```text
{
  "AWS_ACCESS_KEY_ID": "AKIAIOSFODNN7EXAMPLE",
  "AWS_SECRET_ACCESS_KEY": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
}
```

```bash
kubectl -n my-app get configmap my-app-bucket -o yaml
```

Output:

```text
data:
  BUCKET_HOST: rook-ceph-rgw-my-store.rook-ceph.svc
  BUCKET_NAME: my-app-bucket-abc123
  BUCKET_PORT: "80"
  BUCKET_REGION: us-east-1
  BUCKET_SUBREGION: ""
```

## Using OBC Credentials in a Pod

Mount the Secret and ConfigMap as environment variables in your application:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: s3-app
  namespace: my-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: s3-app
  template:
    metadata:
      labels:
        app: s3-app
    spec:
      containers:
      - name: app
        image: amazon/aws-cli:latest
        command: ["sleep", "infinity"]
        envFrom:
        - configMapRef:
            name: my-app-bucket
        - secretRef:
            name: my-app-bucket
        env:
        - name: AWS_DEFAULT_REGION
          value: us-east-1
```

Test S3 access from within the pod:

```bash
kubectl -n my-app exec -it deploy/s3-app -- sh -c 'aws s3 ls --endpoint-url http://$BUCKET_HOST:$BUCKET_PORT'
```

## Creating an OBC with Quota Limits

Enforce storage quotas when creating the OBC:

```yaml
apiVersion: objectbucket.io/v1alpha1
kind: ObjectBucketClaim
metadata:
  name: quota-limited-bucket
  namespace: my-app
spec:
  generateBucketName: quota-bucket
  storageClassName: rook-ceph-bucket
  additionalConfig:
    maxSize: "10Gi"
    maxObjects: "10000"
```

## Creating an OBC with a Fixed Bucket Name

To use a fixed bucket name instead of a generated one, set `bucketName` in the spec. Note that Rook recommends using `generateBucketName` for new buckets since bucket names must be unique across the entire object store:

```yaml
apiVersion: objectbucket.io/v1alpha1
kind: ObjectBucketClaim
metadata:
  name: fixed-name-bucket
  namespace: my-app
spec:
  bucketName: my-specific-bucket-name
  storageClassName: rook-ceph-bucket
```

## Deleting an OBC and Its Resources

When you delete an OBC, Rook handles cleanup based on the StorageClass reclaim policy:

```bash
kubectl -n my-app delete objectbucketclaim my-app-bucket
```

- With Delete reclaim policy: the bucket, Secret, and ConfigMap are all deleted
- With Retain reclaim policy: the bucket data is preserved, but the OBC, Secret, and ConfigMap are removed

## Summary

ObjectBucketClaims provide a Kubernetes-native way to provision S3-compatible buckets from Rook-Ceph object stores. Once bound, Rook automatically creates Secrets and ConfigMaps containing all connection details, which can be injected into applications as environment variables. OBCs support quota enforcement and both generated and fixed bucket names to suit various application requirements.
