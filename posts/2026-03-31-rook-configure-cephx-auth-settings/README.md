# How to Configure CephX Auth Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Authentication, Security, CephX

Description: Learn how to configure CephX authentication settings in Ceph to secure cluster communication between monitors, OSDs, and clients.

---

## What is CephX

CephX is Ceph's native authentication protocol, similar in concept to Kerberos. It uses shared secret keys to authenticate daemons, clients, and administrators communicating with the cluster. Every entity - monitor, OSD, MDS, or client - has a keyring containing its secret key. Enabling CephX ensures that only authorized parties can read from or write to your cluster.

## CephX Configuration Options

CephX settings live in `ceph.conf` under the `[global]` section. The three main configuration knobs are:

- `auth_cluster_required` - controls whether cluster daemons (mons, OSDs) must authenticate with each other
- `auth_service_required` - controls whether clients must authenticate to access cluster services
- `auth_client_required` - controls what the client side requires from the cluster

```ini
[global]
auth_cluster_required = cephx
auth_service_required = cephx
auth_client_required = cephx
```

Setting all three to `cephx` is the default and recommended production configuration.

## Viewing Existing Keys

To list all keys in the cluster, use the `ceph auth list` command from the Rook toolbox:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph auth list
```

To inspect a specific key:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph auth get client.admin
```

## Creating a New Client Key

You can create client keys with specific capabilities. The following creates a key that can read and write to a pool named `mypool`:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth get-or-create client.myapp \
    mon 'allow r' \
    osd 'allow rw pool=mypool' \
    -o /tmp/client.myapp.keyring
```

## Exporting Keys as Kubernetes Secrets

In a Rook-managed cluster, client keys should be stored as Kubernetes Secrets so applications can mount them:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph auth get-key client.myapp | \
  kubectl create secret generic ceph-client-key \
    --from-literal=key="$(cat -)" \
    -n myapp-namespace
```

## Disabling CephX (Not Recommended)

To disable CephX for testing only, set all three auth options to `none`. Never do this in production - it leaves the cluster open to unauthorized access:

```ini
[global]
auth_cluster_required = none
auth_service_required = none
auth_client_required = none
```

## Rotating Keys

To rotate a key, delete and recreate it. Ceph will generate a new secret:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph auth del client.myapp
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth get-or-create client.myapp \
    mon 'allow r' \
    osd 'allow rw pool=mypool'
```

After rotation, update any Kubernetes Secrets or configuration that reference the old key.

## Summary

CephX authentication is Ceph's built-in mechanism for securing cluster communications. Always keep `auth_cluster_required`, `auth_service_required`, and `auth_client_required` set to `cephx` in production. Use `ceph auth get-or-create` to provision scoped client keys, and store them as Kubernetes Secrets for application consumption in Rook environments.
