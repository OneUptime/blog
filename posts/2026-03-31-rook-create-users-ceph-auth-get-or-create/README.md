# How to Create Users with ceph auth get-or-create in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Authentication

Description: Learn how to use ceph auth get-or-create to idempotently create or retrieve Ceph users, making it ideal for automation and Rook provisioning scripts.

---

## Overview of ceph auth get-or-create

`ceph auth get-or-create` is the preferred command for idempotent user creation in Ceph. If the user does not exist, it creates the user with the specified capabilities and returns the keyring. If the user already exists, it simply returns the existing keyring without modifying the user. This behavior makes it perfect for automation scripts, Helm hooks, and CI/CD pipelines.

Run from the Rook toolbox:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash
```

## Basic Usage

Create a user with monitor read access and pool-level OSD access:

```bash
ceph auth get-or-create client.appuser \
  mon 'allow r' \
  osd 'allow rw pool=appdata'
```

Output (same whether creating new or returning existing):

```text
[client.appuser]
    key = AQD...==
```

Note that the output only includes the key, not the capabilities. Use `ceph auth get` to see the full keyring with capabilities.

## Writing Directly to a Keyring File

Use the `-o` flag to write the keyring to a file:

```bash
ceph auth get-or-create client.appuser \
  mon 'allow r' \
  osd 'allow rw pool=appdata' \
  -o /etc/ceph/appuser.keyring
```

This creates the file if it does not exist. If the user already existed, the file is created with the existing key.

## Using get-or-create-key for Key-Only Output

If you only need the raw key (not the keyring block), use `ceph auth get-or-create-key`:

```bash
KEY=$(ceph auth get-or-create-key client.appuser \
  mon 'allow r' \
  osd 'allow rw pool=appdata')
echo "Key: $KEY"
```

This outputs just the base64 key string, which is ideal for injecting into Kubernetes Secrets:

```bash
KEY=$(ceph auth get-or-create-key client.appuser \
  mon 'allow r' \
  osd 'allow rw pool=appdata')

kubectl create secret generic ceph-appuser-key \
  --from-literal=key="${KEY}" \
  -n myapp-namespace \
  --dry-run=client -o yaml | kubectl apply -f -
```

## Creating CephFS Users

For CephFS-specific clients, include MDS capabilities:

```bash
ceph auth get-or-create client.cephfs-client \
  mon 'allow r' \
  mds 'allow rw' \
  osd 'allow rw tag cephfs data=myfs'
```

## Creating RBD Users

For RBD block storage clients:

```bash
ceph auth get-or-create client.rbd-client \
  mon 'profile rbd' \
  osd 'profile rbd pool=rbd'
```

## Idempotency in Automation

The key benefit of `get-or-create` is safe re-execution. In a Kubernetes init container or Helm hook, you can call it multiple times without worrying about duplicate user errors:

```bash
#!/bin/bash
# Safe to run multiple times
ceph auth get-or-create client.service1 \
  mon 'allow r' \
  osd 'allow rw pool=svc1-pool' \
  -o /etc/ceph/service1.keyring

echo "User ready at /etc/ceph/service1.keyring"
```

## Verifying the Created User

After running `get-or-create`, verify with `ceph auth get`:

```bash
ceph auth get client.appuser
```

Expected output:

```text
[client.appuser]
    key = AQD...==
    caps mon = "allow r"
    caps osd = "allow rw pool=appdata"
```

## Rook Integration Pattern

A common pattern in Rook deployments is to create application users in a Job that runs at deployment time:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: create-ceph-user
  namespace: rook-ceph
spec:
  template:
    spec:
      containers:
      - name: create-user
        image: rook/ceph:v1.15.0
        command:
        - /bin/bash
        - -c
        - |
          ceph auth get-or-create client.appuser \
            mon 'allow r' \
            osd 'allow rw pool=appdata' \
            -o /tmp/keyring
          kubectl create secret generic ceph-appuser \
            --from-file=keyring=/tmp/keyring \
            -n appnamespace
      restartPolicy: Never
```

## Summary

`ceph auth get-or-create` is the preferred idempotent method for creating Ceph users in automation. It creates the user if it does not exist, or returns the existing keyring if it does. Use `get-or-create-key` for raw key output, use `-o` to write directly to a keyring file, and use this pattern in Rook-managed Kubernetes environments to safely provision credentials for application workloads.
