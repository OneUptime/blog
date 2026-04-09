# How to Create NFS Exports via Ceph CLI in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, NFS, CLI, Kubernetes

Description: Learn how to create, modify, and delete NFS exports using the Ceph CLI in a Rook-managed cluster via the toolbox pod.

---

## Why Use the Ceph CLI for NFS Exports

Rook's `CephNFS` CR sets up the NFS cluster infrastructure, but individual export paths are managed through the Ceph NFS management CLI. The CLI provides fine-grained control over export paths, access modes, client restrictions, and backing stores. All export configurations are stored as RADOS objects in a designated Ceph pool, so changes persist and are shared across all Ganesha instances in the NFS cluster.

## Accessing the Ceph Toolbox

All `ceph nfs` commands run inside the Rook toolbox pod:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash
```

Verify the NFS cluster is available:

```bash
ceph nfs cluster ls
```

## Creating a CephFS-Backed Export

Create an NFS export that exposes a CephFS path:

```bash
ceph nfs export create cephfs \
  --cluster-id my-nfs \
  --pseudo-path /data \
  --fsname my-fs \
  --path /
```

- `--cluster-id` is the name of the `CephNFS` resource
- `--pseudo-path` is the NFS mount path clients will use
- `--fsname` is the name of the `CephFilesystem`
- `--path` is the directory within CephFS to export

## Creating an Object Store-Backed Export

```bash
ceph nfs export create rgw \
  --cluster-id my-nfs \
  --pseudo-path /s3 \
  --bucket my-bucket
```

## Listing and Inspecting Exports

List all exports for an NFS cluster:

```bash
ceph nfs export ls my-nfs
```

Get detailed information about a specific export:

```bash
ceph nfs export info my-nfs /data
```

Output example:

```json
{
  "export_id": 1,
  "path": "/",
  "cluster_id": "my-nfs",
  "pseudo": "/data",
  "access_type": "RW",
  "squash": "no_root_squash",
  "security_label": true,
  "protocols": [4],
  "transports": ["TCP"],
  "fsal": {
    "name": "CEPH",
    "user_id": "nfs.my-nfs.1",
    "fs_name": "my-fs"
  },
  "clients": []
}
```

## Modifying an Export

Modify an existing export using apply with updated JSON:

```bash
ceph nfs export apply my-nfs -i - <<'EOF'
{
  "export_id": 1,
  "path": "/",
  "pseudo": "/data",
  "access_type": "RO",
  "squash": "root_squash",
  "protocols": [4],
  "fsal": {
    "name": "CEPH",
    "fs_name": "my-fs"
  }
}
EOF
```

This changes the export to read-only with root squash enabled.

## Deleting an Export

Remove an export by its pseudo path:

```bash
ceph nfs export rm my-nfs /data
```

The RADOS config object is updated immediately and Ganesha is notified via RADOS watch/notify to reload its configuration.

## Summary

The Ceph CLI inside the Rook toolbox is the primary tool for managing NFS exports at the export level. Use `ceph nfs export create` to add CephFS or RGW-backed paths, `ceph nfs export info` to inspect configuration, and `ceph nfs export apply` to modify existing exports. Changes propagate immediately to all NFS-Ganesha instances sharing the RADOS config pool.
