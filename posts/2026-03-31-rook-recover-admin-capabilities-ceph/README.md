# How to Recover Admin Capabilities in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Authentication

Description: Learn how to recover lost or corrupted admin capabilities in Ceph including restoring the client.admin keyring and fixing monitor authentication state.

---

## When Admin Recovery Is Needed

Admin capability recovery is needed when:

- The `client.admin` keyring is lost or corrupted
- The `client.admin` caps were accidentally changed to non-admin values
- The admin key was deleted from the auth database
- The admin keyring on disk is out of sync with the cluster's auth state

## Scenario 1: Admin Key Is Valid But Caps Are Wrong

If you can still connect to the cluster but `client.admin` has wrong capabilities, fix them using the monitor's admin socket (bypasses CephX auth):

```bash
# From any monitor node, use the admin socket
ceph --admin-daemon /var/run/ceph/ceph-mon.*.asok auth get client.admin
```

Or from a monitor pod in Rook:

```bash
kubectl -n rook-ceph exec -it $(kubectl -n rook-ceph get pod -l app=rook-ceph-mon -o name | head -1) -- bash
```

Then restore full admin capabilities:

```bash
ceph auth caps client.admin \
  mon 'allow *' \
  osd 'allow *' \
  mds 'allow *' \
  mgr 'allow *'
```

Verify:

```bash
ceph auth get client.admin
```

## Scenario 2: Admin Keyring File Is Lost

If the keyring file at `/etc/ceph/ceph.client.admin.keyring` is missing but the cluster is running, re-export it:

```bash
# If you have another admin-level user or can use the admin socket
ceph auth get client.admin -o /etc/ceph/ceph.client.admin.keyring
chmod 600 /etc/ceph/ceph.client.admin.keyring
```

In Rook, the admin keyring is stored in Kubernetes:

```bash
kubectl -n rook-ceph get secret rook-ceph-admin-keyring \
  -o jsonpath='{.data.keyring}' | base64 -d > /tmp/admin.keyring
```

## Scenario 3: Admin Auth Entry Is Deleted

If `client.admin` was deleted from the auth database and you cannot authenticate, use a monitor's admin socket to recreate it (the admin socket bypasses CephX authentication):

```bash
# Use the admin socket directly on a monitor node
ceph --admin-daemon /var/run/ceph/ceph-mon.node1.asok \
  auth get-or-create client.admin \
  mon 'allow *' \
  osd 'allow *' \
  mds 'allow *' \
  mgr 'allow *'
```

## Rook-Specific Admin Recovery

In Rook, the admin keyring is managed as a Secret. If the Secret is missing but the cluster is healthy, the operator can regenerate it. Check the operator logs:

```bash
kubectl -n rook-ceph logs deploy/rook-ceph-operator --tail=100 | grep admin
```

If needed, manually retrieve the key from a running mon container's keyring:

```bash
# Access the mon pod
MON_POD=$(kubectl -n rook-ceph get pod -l app=rook-ceph-mon -o name | head -1)
kubectl -n rook-ceph exec $MON_POD -- cat /etc/ceph/keyring
```

Then recreate the Secret:

```bash
KEYRING=$(kubectl -n rook-ceph exec $MON_POD -- ceph auth get client.admin)
kubectl -n rook-ceph create secret generic rook-ceph-admin-keyring \
  --from-literal=keyring="$KEYRING"
```

## Preventing Future Admin Key Loss

Back up the admin keyring to a secure location:

```bash
#!/bin/bash
DATE=$(date +%Y%m%d)
kubectl -n rook-ceph get secret rook-ceph-admin-keyring \
  -o jsonpath='{.data.keyring}' | base64 -d > /secure-backup/admin-keyring-${DATE}.keyring
chmod 600 /secure-backup/admin-keyring-${DATE}.keyring
```

## Summary

Recovering admin capabilities depends on the failure scenario: if the cluster is accessible but caps are wrong, use `ceph auth caps` to restore them; if the keyring file is missing, export it with `ceph auth get -o`; if the auth entry is deleted and the cluster is inaccessible, use the monitor admin socket. In Rook environments, the admin keyring is stored as a Kubernetes Secret and can be regenerated from the monitor pods if lost.
