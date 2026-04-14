# How to Delete Users with ceph auth del in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Authentication

Description: Learn how to safely delete Ceph authentication users using ceph auth del, and what to verify before removing users to avoid disrupting workloads.

---

## Overview of ceph auth del

`ceph auth del` permanently removes an authentication entity from the Ceph cluster. Once deleted, any application or service still using the deleted user's key will immediately receive authentication errors. There is no soft-delete or recycle bin - deletion is instant and irreversible.

Access from the Rook toolbox:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash
```

## Basic Usage

Delete a specific user:

```bash
ceph auth del client.myapp
```

If the deletion succeeds, no output is returned. If the user does not exist, the command still succeeds silently - `ceph auth del` is idempotent.

## Pre-Deletion Checklist

Before deleting any user, verify that no active workloads depend on it:

```bash
# 1. Check user details
ceph auth get client.myapp

# 2. Search for the user name in Kubernetes Secrets
kubectl get secrets --all-namespaces -o json | \
  jq -r '.items[] | select(.data.userID != null) | "\(.metadata.namespace)/\(.metadata.name)"'

# 3. Look for OBC (ObjectBucketClaim) referencing this user
kubectl get obc --all-namespaces

# 4. Check if any keyring files on nodes reference this user
```

## Deleting a User Created for an Application

If you provisioned a user for a decommissioned application:

```bash
# Step 1: Verify the application pods are terminated
kubectl -n myapp-namespace get pods

# Step 2: Delete the Kubernetes Secret holding the key
kubectl -n myapp-namespace delete secret ceph-myapp-key

# Step 3: Delete the Ceph user
ceph auth del client.myapp
```

## Verifying Deletion

After deletion, confirm the user no longer exists:

```bash
ceph auth get client.myapp
```

Expected output:

```text
Error ENOENT: failed to find client.myapp in keyring
```

Or verify via list:

```bash
ceph auth ls | grep "client.myapp"
```

No output means the user was successfully deleted.

## Deleting Daemon Users - Warning

Never delete system daemon users (`osd.*`, `mon.*`, `mds.*`, `mgr.*`) unless you are decommissioning the daemon. Deleting a live daemon's user causes it to lose cluster access and may result in data unavailability:

```bash
# Do NOT run this on a live OSD
ceph auth del osd.5  # Only safe if osd.5 is already removed from the cluster
```

## Deleting Users in Rook - Special Caution

Rook creates several internal client users for its CSI drivers and services. Deleting these will break storage provisioning:

```bash
# These should NEVER be deleted in a running Rook cluster
# client.csi-cephfs-node
# client.csi-cephfs-provisioner
# client.csi-rbd-node
# client.csi-rbd-provisioner
# client.rook-ceph-crash
```

Before deleting any `client.*` user, confirm it is not Rook-managed:

```bash
ceph auth ls --format json | jq -r '.auth_dump[].entity' | grep -v rook | grep -v csi
```

## Bulk Deletion Script

Remove all users matching a prefix (use with caution):

```bash
#!/bin/bash
PREFIX="client.legacy-"
ceph auth ls --format json | \
  jq -r ".auth_dump[] | select(.entity | startswith(\"${PREFIX}\")) | .entity" | \
  while read user; do
    echo "Deleting $user"
    ceph auth del "$user"
  done
```

## Summary

`ceph auth del` permanently removes a Ceph authentication entity. Before deleting, verify no active workloads use the user's key by checking Kubernetes Secrets and application deployments. Never delete Rook-internal users (`client.csi-*`, `client.rook-*`) or live daemon users. Always verify deletion with `ceph auth get` to confirm the entity no longer exists.
