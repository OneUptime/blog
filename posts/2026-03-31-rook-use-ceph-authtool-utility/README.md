# How to Use the ceph-authtool Utility

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Authentication

Description: Learn how to use the ceph-authtool command-line utility to create, modify, and inspect Ceph keyring files offline without cluster connectivity.

---

## What Is ceph-authtool

`ceph-authtool` is a command-line tool for managing CephX keyring files locally, without needing a running Ceph cluster or network connectivity. It allows you to create new keyrings, generate keys, add entities, and print keyring contents. This is useful for pre-provisioning credentials, disaster recovery, and offline key management.

## Installing ceph-authtool

On Debian/Ubuntu:

```bash
apt-get install ceph-common
```

On RHEL/CentOS:

```bash
dnf install ceph-common
```

In Rook environments, `ceph-authtool` is available inside the toolbox pod:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash
```

## Creating a New Keyring

Create a keyring file with a new entity and randomly generated key:

```bash
ceph-authtool /tmp/myapp.keyring --create-keyring --gen-key -n client.myapp
```

This creates a new file `/tmp/myapp.keyring` with a random key for `client.myapp` but no capabilities yet.

## Generating and Printing a Key

Generate a new random key and print it to stdout without creating a file:

```bash
ceph-authtool --gen-print-key
```

Output:

```text
AQBzm7dg...==
```

This is useful when you need a key value to inject into existing scripts or templates.

## Adding Capabilities to a Keyring

After creating the keyring, add capability strings:

```bash
ceph-authtool /tmp/myapp.keyring -n client.myapp \
  --cap mon 'allow r' \
  --cap osd 'allow rw pool=appdata'
```

## Inspecting a Keyring

Print the contents of an existing keyring:

```bash
ceph-authtool -l /tmp/myapp.keyring
```

Sample output:

```text
[client.myapp]
    key = AQBzm7dg...==
    caps mon = "allow r"
    caps osd = "allow rw pool=appdata"
```

## Printing Only the Key Value

Extract just the base64 key value:

```bash
ceph-authtool -p -n client.myapp /tmp/myapp.keyring
```

Output:

```text
AQBzm7dg...==
```

## Adding Multiple Entities to One Keyring

A single keyring file can hold multiple entities. Add additional users:

```bash
# Create initial keyring
ceph-authtool /tmp/multi.keyring --create-keyring --gen-key -n client.user1

# Add second entity
ceph-authtool /tmp/multi.keyring --gen-key -n client.user2

# Add caps to each
ceph-authtool /tmp/multi.keyring -n client.user1 \
  --cap mon 'allow r' --cap osd 'allow rw pool=pool1'

ceph-authtool /tmp/multi.keyring -n client.user2 \
  --cap mon 'allow r' --cap osd 'allow rw pool=pool2'
```

## Importing an authtool-Created Keyring to Ceph

Once you have created a keyring with `ceph-authtool`, register it with the cluster:

```bash
ceph auth import -i /tmp/myapp.keyring
```

Verify:

```bash
ceph auth get client.myapp
```

## Use Case: Offline Keyring Pre-Provisioning

In air-gapped or regulated environments, you may need to pre-generate keys and register them before deploying applications:

```bash
# Step 1: Generate key offline
ceph-authtool /tmp/preprovisioned.keyring --create-keyring --gen-key -n client.app

# Step 2: Transfer keyring to cluster node
scp /tmp/preprovisioned.keyring admin@ceph-node:/tmp/

# Step 3: Import into cluster
ceph auth import -i /tmp/preprovisioned.keyring

# Step 4: Set caps
ceph auth caps client.app mon 'allow r' osd 'allow rw pool=appdata'
```

## Summary

`ceph-authtool` manages Ceph keyring files offline. Use `--create-keyring --gen-key` to create new keyrings, `--cap` to add capabilities, `-l` to list keyring contents, `-p` to print just the key value, and `--gen-print-key` to generate standalone key values. After offline creation, import keyrings into the cluster with `ceph auth import`. This tool is essential for disaster recovery and air-gapped deployment scenarios in Rook environments.
