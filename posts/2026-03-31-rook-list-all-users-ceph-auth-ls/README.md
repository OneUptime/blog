# How to List All Users with ceph auth ls

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Authentication

Description: Learn how to list all Ceph authentication entities using ceph auth ls, filter the output, and audit user capabilities in Rook-managed clusters.

---

## The ceph auth ls Command

`ceph auth ls` lists all authentication entities in the cluster along with their keys and capability strings. This is the primary command for auditing who has access to your Ceph cluster and what permissions each entity holds.

In a Rook environment, run it from the toolbox pod:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph auth ls
```

## Sample Output

```text
installed auth entries:

osd.0
    key: AQA...==
    caps: [mgr] allow profile osd
    caps: [mon] allow profile osd
    caps: [osd] allow *
client.admin
    key: AQB...==
    caps: [mds] allow *
    caps: [mgr] allow *
    caps: [mon] allow *
    caps: [osd] allow *
client.myapp
    key: AQC...==
    caps: [mon] allow r
    caps: [osd] allow rw pool=appdata
```

## JSON Format for Scripting

For parsing and automation, use the JSON format:

```bash
ceph auth ls --format json-pretty
```

Sample JSON output:

```json
{
  "auth_dump": [
    {
      "entity": "client.admin",
      "key": "AQB...==",
      "caps": {
        "mds": "allow *",
        "mgr": "allow *",
        "mon": "allow *",
        "osd": "allow *"
      }
    },
    {
      "entity": "client.myapp",
      "key": "AQC...==",
      "caps": {
        "mon": "allow r",
        "osd": "allow rw pool=appdata"
      }
    }
  ]
}
```

## Filtering Output

The `ceph auth ls` output can be long. Pipe through grep to find specific users:

```bash
# Find all client users
ceph auth ls | grep "^client\."

# Find all OSD users
ceph auth ls | grep "^osd\."

# Find a specific user and its caps
ceph auth ls | grep -A4 "client.myapp"
```

Using JSON and jq for structured filtering:

```bash
# List only client entity names
ceph auth ls --format json | jq -r '.auth_dump[] | select(.entity | startswith("client.")) | .entity'

# Find users with osd access
ceph auth ls --format json | jq -r '.auth_dump[] | select(.caps.osd != null) | .entity'
```

## Identifying Rook-Created Users

Rook creates several internal users for its CSI drivers and services. Identify them:

```bash
ceph auth ls --format json | jq -r '.auth_dump[].entity' | grep -E "rook|csi"
```

Common Rook-created users:

```text
client.csi-cephfs-node
client.csi-cephfs-provisioner
client.csi-rbd-node
client.csi-rbd-provisioner
client.rook-ceph-crash
```

Do not delete these users - they are required for Rook to function correctly.

## Comparing auth ls vs auth get

Use `ceph auth ls` when you want a full audit of all users. Use `ceph auth get` when you need details on a specific user:

```bash
# Full cluster audit
ceph auth ls

# Single user details
ceph auth get client.myapp
```

`ceph auth get` also supports exporting in keyring format, which `ceph auth ls` does not.

## Periodic Auditing

Run periodic audits to identify stale or overprivileged users:

```bash
#!/bin/bash
# List all client users with wildcard osd caps
ceph auth ls --format json | \
  jq -r '.auth_dump[] | select(.caps.osd == "allow *") | .entity'
```

Any `client.*` user with `osd: allow *` should be reviewed to ensure it truly needs full OSD access.

## Summary

`ceph auth ls` lists all Ceph authentication entities with their keys and capabilities. Use `--format json` for scripting and pipe through `jq` for filtering. Rook creates several internal client users that should not be deleted. Run periodic audits to identify stale or overprivileged users, focusing on any client with `allow *` OSD capabilities.
