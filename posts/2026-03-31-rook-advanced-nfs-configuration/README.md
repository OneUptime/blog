# How to Set Up Advanced NFS Configuration in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, NFS, Configuration, Kubernetes

Description: Learn how to configure advanced NFS-Ganesha settings in Rook including export squashing, client restrictions, logging, and Ganesha config blocks.

---

## Going Beyond Default NFS Settings

The default `CephNFS` configuration in Rook uses sensible defaults for a basic deployment, but production environments often need tuning. Advanced configuration covers client-level access controls, squash policies, logging verbosity, cache parameters, and custom Ganesha config blocks. All of these are set via the `CephNFS` spec's `server` section or via per-export configurations managed through the Ceph CLI.

## CephNFS Resource and Custom Ganesha Config

First, define the `CephNFS` resource. The `server` section controls the number of active NFS-Ganesha daemons and their log level:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephNFS
metadata:
  name: my-nfs
  namespace: rook-ceph
spec:
  server:
    active: 2
    logLevel: NIV_EVENT
```

Custom NFS-Ganesha configuration blocks are applied via the Ceph CLI, not through the `CephNFS` CRD. Use `ceph nfs cluster config set` from the Rook toolbox to inject global daemon settings:

```bash
ceph nfs cluster config set my-nfs - <<'EOF'
NFS_CORE_PARAM {
  Protocols = 4;
  NFS_Port = 2049;
  fsid_device = true;
}
MDCACHE {
  Entries_HWMark = 100000;
  Dir_Chunk = 1000;
  NParts = 7;
}
NFSv4 {
  Lease_Lifetime = 120;
  Grace_Period = 120;
  Minor_Versions = 1, 2;
}
EOF
```

The `MDCACHE` block (formerly `CACHE_INODE` in older NFS-Ganesha versions) tunes the in-memory directory and inode cache, which significantly affects metadata performance for large filesystems.

## Per-Export Client Restrictions

When creating exports via the Ceph CLI, add client-level access controls to restrict which hosts can mount which paths:

```bash
ceph nfs export apply my-nfs -i - <<'EOF'
{
  "export_id": 1,
  "path": "/",
  "pseudo": "/data",
  "access_type": "RW",
  "squash": "None",
  "protocols": [4],
  "fsal": {
    "name": "CEPH",
    "fs_name": "my-fs"
  },
  "clients": [
    {
      "clients": ["10.0.0.0/8"],
      "squash": "None",
      "access_type": "RW"
    },
    {
      "clients": ["192.168.50.0/24"],
      "squash": "RootSquash",
      "access_type": "RO"
    }
  ]
}
EOF
```

Internal clients get full read-write access, while the `192.168.50.0/24` subnet gets read-only access with root squash.

## Squash Modes Reference

Configure squash behavior per export or per client block:

```text
None         - No UID/GID mapping, root is preserved
RootSquash   - Root user (UID 0) is mapped to the anonymous user
AllSquash    - All users are mapped to the anonymous user
RootIdSquash - Root is squashed, but other users are passed through
```

## Enabling Debug Logging

For troubleshooting, increase Ganesha log verbosity:

```yaml
server:
  logLevel: NIV_DEBUG
```

Valid levels from least to most verbose: `NIV_NULL`, `NIV_FATAL`, `NIV_MAJ`, `NIV_CRIT`, `NIV_WARN`, `NIV_EVENT`, `NIV_INFO`, `NIV_DEBUG`, `NIV_MID_DEBUG`, `NIV_FULL_DEBUG`.

Access Ganesha logs:

```bash
kubectl -n rook-ceph logs \
  $(kubectl -n rook-ceph get pod -l app=rook-ceph-nfs -o name | head -1)
```

## Summary

Advanced NFS configuration in Rook is handled through the `ceph nfs cluster config set` command for global daemon settings and via the Ceph NFS export apply API for per-export client restrictions and squash policies. Tune the inode cache parameters for metadata-heavy workloads, set appropriate squash modes for security, and use debug log levels when troubleshooting NFS mount or permission issues.
