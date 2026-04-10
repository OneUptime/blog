# How to Connect to an External Object Store in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Object Storage, External, Kubernetes

Description: Learn how to connect Rook to an existing external Ceph object store, enabling Kubernetes workloads to use S3-compatible storage from a remote Ceph cluster.

---

## Why Connect to an External Object Store

In some architectures, a Ceph cluster is shared across multiple Kubernetes clusters or managed separately from the workloads that consume it. Rather than deploying a full Ceph cluster inside Kubernetes, Rook can connect to an external Ceph instance and expose its RGW endpoint as a Kubernetes-native service.

This allows you to:
- Use an existing enterprise Ceph cluster as the backing for Kubernetes S3 workloads
- Separate storage administration from application teams
- Avoid duplicating Ceph infrastructure across environments

## Setting Up the External CephObjectStore

Create a `CephObjectStore` with the `externalRgwEndpoints` field pointing to your external RGW:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: external-store
  namespace: rook-ceph
spec:
  gateway:
    port: 80
    externalRgwEndpoints:
      - ip: "192.168.10.50"
    instances: 0
```

Setting `instances: 0` means Rook will not deploy any RGW pods. Traffic goes directly to the external endpoints.

> **Note:** Multiple endpoints can be listed under `externalRgwEndpoints`, but only the first endpoint is advertised to consuming resources like ObjectBucketClaims. For high availability, use a single load balancer IP as the endpoint.

## Creating the Kubernetes Service

Rook creates a `Service` and `Endpoints` object that proxies to the external RGW. Confirm it was created:

```bash
kubectl -n rook-ceph get service rook-ceph-rgw-external-store
kubectl -n rook-ceph get endpoints rook-ceph-rgw-external-store
```

The service can be used by in-cluster workloads just like an internal object store service.

## Configuring Credentials

External object store users are managed on the external Ceph cluster. First, create an admin ops user on the remote cluster with the required capabilities for Rook to manage buckets and users:

```bash
# On the external Ceph cluster
radosgw-admin user create --uid=rgw-admin-ops-user --display-name="RGW Admin Ops User" \
  --caps="buckets=*;users=*;usage=read;metadata=read;zone=read"
```

Store the admin ops credentials as a Rook-typed secret in the Rook namespace:

```bash
kubectl -n rook-ceph create secret generic --type="kubernetes.io/rook" rgw-admin-ops-user \
  --from-literal=accessKey=<admin-access-key> --from-literal=secretKey=<admin-secret-key>
```

This secret is required for the Rook operator to provision buckets via ObjectBucketClaims.

Next, create an application user for your workloads:

```bash
# On the external Ceph cluster
radosgw-admin user create --uid=k8s-user --display-name="Kubernetes User" \
  --access-key=MYACCESSKEY --secret-key=MYSECRETKEY
```

Create the secret in Kubernetes:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: external-rgw-creds
  namespace: my-app
type: Opaque
stringData:
  AWS_ACCESS_KEY_ID: "MYACCESSKEY"
  AWS_SECRET_ACCESS_KEY: "MYSECRETKEY"
  BUCKET_HOST: "rook-ceph-rgw-external-store.rook-ceph.svc"
  BUCKET_PORT: "80"
```

## Using ObjectBucketClaims with External Stores

Create a StorageClass that references the external store:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-external-bucket
provisioner: rook-ceph.ceph.rook.io/bucket
parameters:
  objectStoreName: external-store
  objectStoreNamespace: rook-ceph
reclaimPolicy: Delete
```

Then claim a bucket:

```yaml
apiVersion: objectbucket.io/v1alpha1
kind: ObjectBucketClaim
metadata:
  name: my-ext-bucket
  namespace: my-app
spec:
  generateBucketName: my-ext-bucket
  storageClassName: rook-ceph-external-bucket
```

## Testing Connectivity

Verify the connection from inside the cluster:

```bash
kubectl run -it --rm test-s3 --image=amazon/aws-cli --restart=Never -- \
  s3 ls --endpoint-url http://rook-ceph-rgw-external-store.rook-ceph.svc:80
```

## Summary

Connecting Rook to an external Ceph object store is done by setting `externalRgwEndpoints` in the `CephObjectStore` CRD with `instances: 0`. Rook creates a Kubernetes service pointing to the external IPs. Credentials from the external cluster are stored as secrets and used by workloads. ObjectBucketClaims work identically whether the store is internal or external, enabling seamless integration with pre-existing Ceph infrastructure.
