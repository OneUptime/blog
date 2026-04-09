# How to Configure Swift API Settings in Rook Object Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Swift, Object Storage, RGW, Kubernetes

Description: Configure OpenStack Swift API settings in Rook CephObjectStore to enable Swift-compatible access alongside the S3 API for object storage workloads.

---

## Overview

Ceph's RADOS Gateway (RGW) supports both the S3 and OpenStack Swift APIs. Rook exposes Swift configuration through the `CephObjectStore` CRD's `protocols` spec. This allows applications built for OpenStack Swift to access Ceph object storage without any changes.

## Enable Swift API in CephObjectStore

Configure the Swift API in the `protocols` section of your `CephObjectStore`:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: my-store
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 3
  dataPool:
    replicated:
      size: 3
  preservePoolsOnDelete: true
  gateway:
    port: 80
    instances: 1
    priorityClassName: system-cluster-critical
  protocols:
    swift:
      accountInUrl: true
      urlPrefix: swift
      versioningEnabled: true
```

Apply the configuration:

```bash
kubectl apply -f object-store-swift.yaml
```

## Swift Protocol Options

### accountInUrl

When set to `true`, the Swift account name is included in the URL path:

```text
http://rgw-endpoint/swift/v1/AUTH_<account>/<container>/<object>
```

When `false`, the account is derived from the authentication credentials:

```yaml
protocols:
  swift:
    accountInUrl: false
```

### urlPrefix

Sets the path prefix for Swift API endpoints. Default is `swift`:

```yaml
protocols:
  swift:
    urlPrefix: swift
```

### versioningEnabled

Enables Swift-style object versioning support:

```yaml
protocols:
  swift:
    versioningEnabled: true
```

## Create a Swift User

Create an RGW user with Swift subuser credentials:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin user create \
  --uid=swift-user \
  --display-name="Swift User" \
  --email=swift@example.com

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin subuser create \
  --uid=swift-user \
  --subuser=swift-user:swift \
  --access=full
```

Generate a Swift key:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin key create \
  --subuser=swift-user:swift \
  --key-type=swift
```

## Test Swift Access

Use the `python-swiftclient` to test the connection:

```bash
swift -A http://<rgw-endpoint>/auth/1.0 \
  -U swift-user:swift \
  -K <swift-key> \
  list
```

Create a container and upload an object:

```bash
swift -A http://<rgw-endpoint>/auth/1.0 \
  -U swift-user:swift \
  -K <swift-key> \
  post my-container

swift -A http://<rgw-endpoint>/auth/1.0 \
  -U swift-user:swift \
  -K <swift-key> \
  upload my-container /local/path/to/file.txt
```

## Keystone Integration

For production environments, integrate Swift with OpenStack Keystone authentication:

```yaml
spec:
  gateway:
    port: 80
    instances: 2
  protocols:
    swift:
      accountInUrl: true
      urlPrefix: swift
```

Then configure Keystone endpoints in the Ceph configuration via `CephCluster` spec.

## Summary

Rook exposes Swift API configuration through the `protocols.swift` section of `CephObjectStore`. Key options include `accountInUrl` for URL structure, `urlPrefix` for the API path, and `versioningEnabled` for object versioning. Users need Swift subuser credentials created via `radosgw-admin`, and the API can be tested with standard Swift clients like `python-swiftclient`.
