# How to Create Users with ceph auth add in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Authentication

Description: Learn how to create Ceph authentication users using ceph auth add, set capabilities, and manage the resulting keyrings in Rook environments.

---

## Overview of ceph auth add

`ceph auth add` creates a new Ceph authentication entity with specified capabilities. If the entity already exists with the same key and capabilities, the command succeeds silently as a no-op. If the entity exists with different capabilities or a different key, the command returns an error. Note that unlike `ceph auth get-or-create`, `ceph auth add` does not output the key or keyring on success.

Access the Ceph CLI from the Rook toolbox:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash
```

## Basic Syntax

```bash
ceph auth add <entity> [<capabilities>...]
```

Create a client user with read-only monitor access and read-write access to a specific pool:

```bash
ceph auth add client.myapp \
  mon 'allow r' \
  osd 'allow rw pool=mypool'
```

## Output and Key Generation

Ceph automatically generates a random key for the new user. After running `ceph auth add`, retrieve the user details:

```bash
ceph auth get client.myapp
```

Sample output:

```text
[client.myapp]
    key = AQD...==
    caps mon = "allow r"
    caps osd = "allow rw pool=mypool"
```

## Creating Users with Multiple Pool Access

Grant access to multiple pools by using multiple `allow` clauses separated by commas:

```bash
ceph auth add client.multipool \
  mon 'allow r' \
  osd 'allow rw pool=pool1, allow rw pool=pool2'
```

## Creating Read-Only Users

For monitoring or backup agents that only need to read data:

```bash
ceph auth add client.readonly \
  mon 'allow r' \
  osd 'allow r'
```

## Creating Admin-Level Users

For full administrative access (use sparingly):

```bash
ceph auth add client.myservice \
  mon 'allow *' \
  osd 'allow *' \
  mds 'allow *' \
  mgr 'allow *'
```

## Saving the Keyring to a File

Export the newly created user's keyring to a file for distribution:

```bash
ceph auth get client.myapp -o /tmp/myapp.keyring
```

In Rook environments, copy this to a Kubernetes Secret:

```bash
kubectl create secret generic ceph-myapp-keyring \
  --from-file=keyring=/tmp/myapp.keyring \
  -n myapp-namespace
```

## Difference Between auth add and auth get-or-create

| Command | Behavior if entity exists |
|---|---|
| `auth add` | Succeeds silently if caps and key match; returns error if they differ. Does not output the key. |
| `auth get-or-create` | Returns existing key in keyring format if caps match; returns error if caps differ. |
| `auth get-or-create-key` | Returns only the key if caps match; returns error if caps differ. |

The key difference is that `auth get-or-create` outputs the keyring (user name and key) on both creation and when the entity already exists, making it the preferred choice for automation scripts. `auth add` does not output the key on success, so you must follow it with `ceph auth get` to retrieve the keyring. Use `auth add` when you are performing initial user setup interactively.

## Verifying the Created User

After creation, always verify the user exists with the correct capabilities:

```bash
ceph auth ls | grep "client.myapp"
ceph auth get client.myapp
```

Also verify the key is accessible:

```bash
ceph auth print-key client.myapp
```

## Automation Script Example

Create multiple application users in a loop. Note that `ceph auth get-or-create` is preferred here because it is truly idempotent and outputs the keyring, whereas `ceph auth add` will error on re-runs if the entities already exist with different capabilities:

```bash
#!/bin/bash
USERS=("client.app1" "client.app2" "client.app3")
POOLS=("pool1" "pool2" "pool3")

for i in "${!USERS[@]}"; do
  ceph auth get-or-create "${USERS[$i]}" \
    mon 'allow r' \
    osd "allow rw pool=${POOLS[$i]}"
  echo "Created ${USERS[$i]} for ${POOLS[$i]}"
done
```

## Summary

`ceph auth add` creates a Ceph authentication entity with specified capabilities and a randomly generated key. If the entity already exists with matching capabilities and key, the command succeeds silently; if the capabilities or key differ, it returns an error. Unlike `ceph auth get-or-create`, it does not output the key on success, so use `ceph auth get` after creation to retrieve the keyring. Export the keyring with `ceph auth get -o` for distribution to applications or Kubernetes Secrets in Rook environments. For idempotent automation scripts, prefer `ceph auth get-or-create` instead.
