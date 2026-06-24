# How to Configure CephX for RGW Authentication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephX, RGW, Authentication, S3

Description: Configure CephX authentication for the Ceph RADOS Gateway (RGW) in Rook, including daemon keys, admin user credentials, and S3 API access controls.

---

RGW uses CephX internally to authenticate with the rest of the Ceph cluster, while exposing S3 and Swift APIs externally. Understanding both authentication layers is important for securing object storage deployments.

## Two Authentication Layers in RGW

1. **CephX** - RGW daemon authenticates to Ceph cluster (internal)
2. **S3/Swift credentials** - End users authenticate to RGW (external, managed by `radosgw-admin`)

## RGW Daemon CephX Key

Rook automatically creates the RGW daemon's CephX key. Inspect it:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth get client.rgw.my-store.a
```

The output shows the key and its capabilities:

```text
[client.rgw.my-store.a]
    key = AQBxxxxxxxxxx==
    caps mon = "allow *"
    caps osd = "allow rwx tag rgw *=*"
    caps mgr = "allow rw"
```

## RGW Capability Requirements

RGW daemons require broad capabilities to manage S3 objects:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth get-or-create client.rgw.custom-store.a \
  mon 'allow *' \
  osd 'allow rwx tag rgw *=*' \
  mgr 'allow rw'
```

## CephObjectStore CRD and Automatic Key Creation

Rook automatically creates and manages CephX keys for each CephObjectStore. There is no CRD field to specify a custom key name. Define the object store and Rook handles the rest:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: custom-store
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 3
  dataPool:
    replicated:
      size: 3
  gateway:
    port: 80
    instances: 2
```

## Create S3 Users (Not CephX)

S3 user credentials are managed separately from CephX:

```bash
# Create an S3 user
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin user create \
  --uid=myapp \
  --display-name="My Application" \
  --access-key=MYACCESSKEY \
  --secret-key=MYSECRETKEY

# Limit S3 user permissions
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin user modify \
  --uid=myapp \
  --max-buckets=10
```

## Verify RGW Authentication

Test that the RGW daemon can authenticate to the cluster:

```bash
kubectl -n rook-ceph logs -l app=rook-ceph-rgw | \
  grep -E "auth|cephx|startup"
```

Test S3 API access with the created credentials:

```bash
AWS_ACCESS_KEY_ID=MYACCESSKEY \
AWS_SECRET_ACCESS_KEY=MYSECRETKEY \
aws s3 ls --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph:80
```

## Summary

RGW has two separate authentication systems: CephX for the daemon's own cluster authentication (managed automatically by Rook), and S3/Swift credentials for end-user access (managed via `radosgw-admin`). Keep these distinct in your security model - CephX keys should not be exposed to end users, while S3 credentials should be scoped per application with appropriate quota limits.
