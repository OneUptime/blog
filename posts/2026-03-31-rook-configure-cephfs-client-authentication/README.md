# How to Configure CephFS Client Authentication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, Authentication, Security

Description: Learn how to configure CephX authentication for CephFS clients in Rook-Ceph, including creating restricted keys and configuring per-path access.

---

## Overview

CephFS uses CephX, Ceph's native authentication system, to authenticate clients mounting the filesystem. Rather than granting all clients the admin key, best practice is to create dedicated, least-privilege keys with capabilities restricted to specific filesystems and paths. This improves security in multi-tenant Rook-Ceph deployments.

## Understanding CephX Capabilities for CephFS

A CephX key for CephFS clients requires three capability grants:
- `mon` capabilities for authenticating with the monitor
- `osd` capabilities for accessing the data pool
- `mds` capabilities for accessing metadata

## Create a Restricted Client Key

Create a key for a client named `myapp` with access limited to the `cephfs` filesystem:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth get-or-create client.myapp \
    mon 'allow r' \
    mds 'allow rw fsname=cephfs path=/myapp' \
    osd 'allow rw tag cephfs data=cephfs' \
    -o /tmp/ceph.client.myapp.keyring
```

## Retrieve the Generated Key

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth get client.myapp
```

## Create a Read-Only Key

For monitoring or backup clients that only need read access:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth get-or-create client.backup \
    mon 'allow r' \
    mds 'allow r fsname=cephfs' \
    osd 'allow r tag cephfs data=cephfs'
```

## Store the Key as a Kubernetes Secret

Save the keyring as a Kubernetes Secret for use by application pods:

```bash
KEYRING=$(kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth get-key client.myapp)

kubectl -n rook-ceph create secret generic ceph-client-myapp \
  --from-literal=userID=myapp \
  --from-literal=userKey="$KEYRING"
```

## Use in a PersistentVolumeClaim

Reference the client secret in a CSI StorageClass:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-cephfs-myapp
provisioner: rook-ceph.cephfs.csi.ceph.com
parameters:
  clusterID: rook-ceph
  fsName: cephfs
  pool: cephfs-data0
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-cephfs-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: ceph-client-myapp
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
```

## List All CephX Keys

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph auth ls
```

## Revoke a Client Key

If a client key is compromised or no longer needed:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth del client.myapp
```

## Summary

Configuring CephFS client authentication in Rook-Ceph involves creating least-privilege CephX keys with specific filesystem and path restrictions using `ceph auth get-or-create`. Storing keys as Kubernetes Secrets and referencing them in StorageClass definitions ensures proper credential management. This approach enforces the principle of least privilege, limiting the blast radius if a client key is compromised.
