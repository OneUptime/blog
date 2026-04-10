# How to Configure Maximum File Size in CephFS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, Quota, Storage

Description: Learn how to configure the maximum file size limit in CephFS to prevent oversized files from impacting cluster performance and capacity.

---

## Overview

CephFS allows administrators to set a maximum file size limit on a filesystem. This is useful when you need to prevent clients from writing extremely large files that could exhaust storage capacity or degrade performance. The limit is published by the MDS via the MDSMap and enforced at the client level when clients attempt to extend file sizes beyond the configured threshold.

## Default Behavior

By default, CephFS enforces a maximum file size of 1 TiB (1099511627776 bytes). You can lower this limit to further restrict file sizes or increase it if your workloads require larger files. The minimum allowed value is 65536 bytes (64 KiB).

## Check Current Max File Size

To view the current setting for a filesystem named `cephfs`:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph fs get cephfs
```

Look for the `max_file_size` field in the output. The default value is `1099511627776` (1 TiB).

## Set Maximum File Size

Use the `ceph fs set` command to configure the maximum file size in bytes:

```bash
# Set max file size to 1 TiB (1099511627776 bytes)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph fs set cephfs max_file_size 1099511627776
```

You can use common byte values for other sizes:

```text
1 GiB  =  1073741824
10 GiB = 10737418240
1 TiB  = 1099511627776
```

## Verify the Setting

After applying the limit, verify it is active:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph fs get cephfs | grep max_file_size
```

## Client-Side Behavior

When a client attempts to write a file that would exceed the configured maximum, the write operation returns an `EFBIG` (file too large) error. Applications should handle this error gracefully by catching the appropriate OS-level exception:

```python
import errno
import os

try:
    with open("/mnt/cephfs/largefile", "wb") as f:
        f.write(data)
except OSError as e:
    if e.errno == errno.EFBIG:
        print("Write rejected: file exceeds the maximum size allowed by CephFS.")
    else:
        raise
```

## Resetting to Default

To restore the default 1 TiB limit, set `max_file_size` back to `1099511627776`:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph fs set cephfs max_file_size 1099511627776
```

Note that `max_file_size` cannot be set below 65536 bytes (64 KiB). There is no way to fully disable the limit; set it to a sufficiently large value for your workloads.

## Considerations

- The limit applies to individual file sizes, not directory or filesystem quotas.
- Existing files that already exceed the new limit will not be truncated.
- Combine this setting with directory quotas for comprehensive capacity management.

## Summary

Configuring a maximum file size in CephFS using `ceph fs set max_file_size` is a simple but effective safeguard against unbounded file growth. By enforcing this limit at the client level through the MDSMap configuration, you protect your Rook-Ceph cluster from storage exhaustion caused by oversized files, while applications receive a clear `EFBIG` error that can be handled gracefully.
