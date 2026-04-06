# How to Create and Delete Buckets in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, S3, Object Storage

Description: Learn how to create and delete buckets in Ceph RGW using the S3 API, AWS CLI, radosgw-admin, and Rook ObjectBucketClaim resources for programmatic and manual bucket management.

---

## Bucket Management Options

Ceph RGW buckets can be managed through multiple interfaces:

1. **AWS CLI** - standard S3 API calls
2. **radosgw-admin** - Ceph admin CLI for privileged operations
3. **Rook ObjectBucketClaim** - Kubernetes-native bucket provisioning
4. **s3cmd** or **boto3** - alternative S3 clients

## Create a Bucket with AWS CLI

First, get the RGW endpoint and credentials:

```bash
# Get the RGW service endpoint
kubectl -n rook-ceph get service rook-ceph-rgw-my-store

# Get a user's access key and secret key
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin user info --uid=myuser | jq '.keys[0]'
```

Create a bucket using AWS CLI:

```bash
aws s3 mb s3://my-new-bucket \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc:80 \
  --region us-east-1

# List all buckets
aws s3 ls \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc:80
```

## Create a Bucket with the S3 API

Buckets in Ceph RGW are created via the S3 API (not `radosgw-admin`):

```bash
# Create a bucket
aws s3 mb s3://my-admin-bucket \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc:80

# List all buckets
aws s3 ls \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc:80

# Get bucket details
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  radosgw-admin bucket stats --bucket=my-admin-bucket
"
```

## Kubernetes-Native Bucket with ObjectBucketClaim

Use Rook's Object Bucket Claim (OBC) for automatic bucket creation with Kubernetes secrets:

```yaml
apiVersion: objectbucket.io/v1alpha1
kind: ObjectBucketClaim
metadata:
  name: my-app-bucket
  namespace: default
spec:
  bucketName: my-app-bucket
  storageClassName: rook-ceph-bucket
```

After creation, Rook creates a ConfigMap and Secret with connection details:

```bash
# Get bucket endpoint
kubectl get configmap my-app-bucket -o yaml

# Get credentials
kubectl get secret my-app-bucket -o yaml
```

Use these in your application:

```bash
ACCESS_KEY=$(kubectl get secret my-app-bucket -o jsonpath='{.data.AWS_ACCESS_KEY_ID}' | base64 --decode)
SECRET_KEY=$(kubectl get secret my-app-bucket -o jsonpath='{.data.AWS_SECRET_ACCESS_KEY}' | base64 --decode)
ENDPOINT=$(kubectl get configmap my-app-bucket -o jsonpath='{.data.BUCKET_HOST}')
```

## Delete a Bucket

### Using AWS CLI

```bash
# Remove all objects first (required if bucket has content)
aws s3 rm s3://my-new-bucket --recursive \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc:80

# Delete the empty bucket
aws s3 rb s3://my-new-bucket \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc:80
```

### Using radosgw-admin

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  # Remove bucket and all its objects
  radosgw-admin bucket rm --bucket=my-admin-bucket --purge-objects

  # Verify deletion
  radosgw-admin bucket list | grep my-admin-bucket
"
```

### Delete an ObjectBucketClaim

Deleting the OBC removes the bucket (and its objects if reclaimPolicy is Delete):

```bash
kubectl delete objectbucketclaim my-app-bucket -n default
```

## Verify Deletion

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  radosgw-admin bucket list
"
```

## Summary

Ceph RGW buckets can be created and deleted through multiple interfaces: the AWS CLI for standard S3 operations, `radosgw-admin` for privileged admin operations, and Rook ObjectBucketClaims for Kubernetes-native provisioning that automatically provides credentials as Secrets. Always empty a bucket before deletion, and use `--purge-objects` with `radosgw-admin` to delete buckets with content in a single operation.
