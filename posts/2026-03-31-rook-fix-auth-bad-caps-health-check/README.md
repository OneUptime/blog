# How to Fix AUTH_BAD_CAPS Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Authentication

Description: Learn how to diagnose and resolve the AUTH_BAD_CAPS health warning in Ceph caused by invalid or malformed capability strings on auth entities.

---

## What Is AUTH_BAD_CAPS

The `AUTH_BAD_CAPS` health warning appears when one or more Ceph authentication entities (users or service accounts) have malformed or unrecognized capability strings. Ceph validates capabilities at startup and during health checks, and any entry that fails validation triggers this warning.

Check the current cluster health detail:

```bash
ceph health detail
```

Sample output:

```text
HEALTH_ERR 2 auth entities have invalid capabilities
[ERR] AUTH_BAD_CAPS: 2 auth entities have invalid capabilities
    client.baduser: mon 'allow r invalid_option', osd 'allow rw'
    osd.5: osd 'allow *; invalid'
```

## Why This Happens

Bad capabilities typically result from:

- Manual edits that introduced typos or unsupported options
- Upgrades where capability syntax changed between Ceph versions
- Copy-paste errors when creating users programmatically
- Corrupted keyring imports

## Identifying Affected Users

List all auth entities and their capabilities to audit the full set:

```bash
ceph auth ls
```

For a specific user, inspect its capabilities:

```bash
ceph auth get client.baduser
```

Sample output:

```text
[client.baduser]
    key = AQA...==
    caps mon = "allow r invalid_option"
    caps osd = "allow rw"
```

## Fixing Bad Capabilities

Use `ceph auth caps` to overwrite the capabilities with a valid set. For a client that needs read-only monitor access and read-write OSD access on a specific pool:

```bash
ceph auth caps client.baduser mon 'allow r' osd 'allow rw pool=mypool'
```

For an OSD daemon that had malformed caps:

```bash
ceph auth caps osd.5 osd 'allow *' mon 'allow profile osd'
```

## Verifying the Fix

Inspect the updated capabilities:

```bash
ceph auth get client.baduser
```

Expected output:

```text
[client.baduser]
    key = AQA...==
    caps mon = "allow r"
    caps osd = "allow rw pool=mypool"
```

Then check cluster health:

```bash
ceph health
```

Expected:

```text
HEALTH_OK
```

## Preventing Bad Caps in Rook Environments

When creating users via Rook toolbox, always test capability strings before applying them to production:

```bash
# Enter the toolbox
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash

# Create user with validated caps
ceph auth get-or-create client.appuser \
  mon 'allow r' \
  osd 'allow rw pool=appdata'
```

Avoid editing keyring files manually in production. Use the `ceph auth caps` command exclusively for capability modifications to ensure Ceph validates the syntax before applying.

## Summary

The `AUTH_BAD_CAPS` warning indicates one or more auth entities have invalid capability strings. Use `ceph health detail` to identify affected entities, `ceph auth get` to inspect their caps, and `ceph auth caps` to replace them with valid values. Verify with `ceph health` to confirm `HEALTH_OK`.
