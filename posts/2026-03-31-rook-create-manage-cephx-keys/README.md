# How to Create and Manage CephX Keys

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephX, Key Management, Security, Authentication

Description: Create, update, and delete CephX authentication keys in a Rook-managed Ceph cluster to control access for applications and services.

---

CephX keys are the credentials that Ceph clients and daemons use to authenticate. Managing these keys - creating keys with appropriate capabilities, rotating them periodically, and deleting unused keys - is a routine operational task.

## Create a New CephX Key

Create a key for an application with read-write access to a specific pool:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth get-or-create client.myapp \
  mon 'allow r' \
  osd 'allow rw pool=myapp-data'
```

Create a key with multiple pool permissions:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth get-or-create client.webapp \
  mon 'allow r' \
  osd 'allow rw pool=webapp-data, allow r pool=shared-data' \
  mgr 'allow r'
```

## Export a Key to a Keyring File

Export the key for use in a Kubernetes Secret:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph auth get client.myapp > /tmp/myapp.keyring

cat /tmp/myapp.keyring
```

Create a Kubernetes Secret from the keyring:

```bash
kubectl -n rook-ceph create secret generic ceph-client-myapp \
  --from-file=keyring=/tmp/myapp.keyring
```

## Update Key Capabilities

Modify capabilities for an existing key:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth caps client.myapp \
  mon 'allow r' \
  osd 'allow rw pool=myapp-data, allow r pool=backups'
```

## List and Inspect Keys

List all existing keys:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth ls | grep "^client\."
```

Inspect a specific key's capabilities:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth get client.myapp
```

## Delete an Unused Key

Remove keys that are no longer needed:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth del client.oldapp
```

Also delete the associated Kubernetes Secret:

```bash
kubectl -n rook-ceph delete secret ceph-client-oldapp
```

## Store Keys in Kubernetes Secrets

Automate key creation and Secret storage:

```bash
KEY=$(kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph auth get-or-create-key client.myapp \
  mon 'allow r' \
  osd 'allow rw pool=myapp-data')

kubectl -n myapp-namespace create secret generic ceph-keyring \
  --from-literal=key="$KEY"
```

## Summary

CephX key management in Rook involves creating keys with the principle of least privilege using `ceph auth get-or-create`, exporting keyrings as Kubernetes Secrets for application consumption, and regularly auditing and removing unused keys with `ceph auth del`. Always grant only the specific pool permissions required rather than blanket `allow *` capabilities.
