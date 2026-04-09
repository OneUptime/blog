# How to Manage Keyrings in Ceph (Default Locations, Creation, Export)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Authentication

Description: Learn how Ceph keyrings work, where they are stored by default, how to create and export them, and how Rook manages keyrings as Kubernetes Secrets.

---

## What Is a Keyring

A Ceph keyring is a file that stores one or more authentication entity credentials (key + capabilities). Ceph clients and daemons use keyring files to authenticate to the cluster. The keyring format is a simple INI-style text file.

Sample keyring:

```ini
[client.admin]
    key = AQA...==
    caps mds = "allow *"
    caps mgr = "allow *"
    caps mon = "allow *"
    caps osd = "allow *"
```

## Default Keyring Locations

Ceph looks for keyrings in specific locations depending on the entity type:

| Entity Type | Default Keyring Path |
|---|---|
| `client.admin` | `/etc/ceph/ceph.client.admin.keyring` |
| `client.<name>` | `/etc/ceph/ceph.client.<name>.keyring` |
| `osd.<id>` | `/var/lib/ceph/osd/ceph-<id>/keyring` |
| `mon.<host>` | `/var/lib/ceph/mon/ceph-<host>/keyring` |
| Generic | `/etc/ceph/ceph.keyring` |

Ceph clients also check `/etc/ceph/ceph.keyring` as a fallback that can contain multiple entities.

## Creating a Keyring File

Use `ceph-authtool` to create a keyring with a new key:

```bash
# Create a keyring with a new random key
ceph-authtool /tmp/myapp.keyring --create-keyring --gen-key -n client.myapp

# Add capabilities
ceph-authtool /tmp/myapp.keyring -n client.myapp \
  --cap mon 'allow r' \
  --cap osd 'allow rw pool=appdata'
```

Then register this key with the cluster:

```bash
ceph auth import -i /tmp/myapp.keyring
```

Or more commonly, let Ceph generate the key server-side:

```bash
ceph auth get-or-create client.myapp \
  mon 'allow r' \
  osd 'allow rw pool=appdata' \
  -o /etc/ceph/ceph.client.myapp.keyring
```

## Exporting Keyrings

Export a specific user's keyring:

```bash
ceph auth get client.myapp -o /tmp/myapp.keyring
```

Export all entities:

```bash
ceph auth export -o /tmp/all-keyrings.keyring
```

## How Rook Manages Keyrings

Rook stores keyrings as Kubernetes Secrets instead of files on disk. This is the standard approach for Kubernetes-native deployments.

List Rook's keyring secrets:

```bash
kubectl -n rook-ceph get secrets | grep keyring
```

Sample output:

```text
rook-ceph-admin-keyring           Opaque   1      120d
rook-ceph-osd-0-keyring           Opaque   1      120d
rook-ceph-crash-collector-keyring Opaque   1      120d
```

Inspect the admin keyring secret:

```bash
kubectl -n rook-ceph get secret rook-ceph-admin-keyring \
  -o jsonpath='{.data.keyring}' | base64 -d
```

## Injecting Keyrings into Pods

Application pods that need Ceph access receive the keyring via volume mount:

```yaml
volumes:
- name: ceph-keyring
  secret:
    secretName: ceph-myapp-keyring
containers:
- name: app
  volumeMounts:
  - name: ceph-keyring
    mountPath: /etc/ceph
    readOnly: true
```

## Keyring File Permissions

Keyring files must have restrictive permissions since they contain private keys:

```bash
chmod 600 /etc/ceph/ceph.client.myapp.keyring
chown ceph:ceph /etc/ceph/ceph.client.myapp.keyring
```

## Summary

Ceph keyrings are INI-style files storing entity credentials and capabilities. Default locations follow a predictable pattern under `/etc/ceph/` for clients and `/var/lib/ceph/` for daemons. Use `ceph auth get -o` to export individual keyrings and `ceph auth export` for bulk export. In Rook environments, keyrings are stored as Kubernetes Secrets and injected into pods via volume mounts rather than filesystem files.
