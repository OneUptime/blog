# Validation Summary: How to Configure Maximum File Size in CephFS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph / CephFS
- kubectl (Kubernetes CLI)
- Python (error handling example)

## Sources Consulted
- Ceph source code: `src/mds/MDSMap.h` (default `max_file_size = 1ULL<<40`) — https://github.com/ceph/ceph/blob/main/src/mds/MDSMap.h
- Ceph source code: `src/mon/FSCommands.cc` (minimum value enforcement of `CEPH_MIN_STRIPE_UNIT` = 65536 bytes) — https://github.com/ceph/ceph/blob/main/src/mon/FSCommands.cc
- Ceph source code: `src/client/Client.cc` (client-side enforcement returning `-EFBIG`) — https://github.com/ceph/ceph/blob/main/src/client/Client.cc
- CephFS administration documentation: `doc/cephfs/administration.rst` — https://github.com/ceph/ceph/blob/main/doc/cephfs/administration.rst
- Ceph source code: `src/include/ceph_fs.h` (`CEPH_MIN_STRIPE_UNIT` definition) — https://github.com/ceph/ceph/blob/main/src/include/ceph_fs.h

## Issues Found

1. **Incorrect default behavior claim**: The post stated "By default, CephFS does not enforce a maximum file size. Files can grow to any size as long as storage capacity allows." This is incorrect — the default `max_file_size` is 1 TiB (1099511627776 bytes, defined as `1ULL<<40` in `MDSMap.h`). Fixed to state the correct default.

2. **Incorrect claim that 0 means unlimited**: The post stated "A value of `0` means unlimited" when describing the output of `ceph fs get`. In reality, the Ceph monitor rejects any `max_file_size` value below 65536 bytes (`CEPH_MIN_STRIPE_UNIT`) with an `-ERANGE` error. Setting to 0 is not possible. Fixed to show the default value instead.

3. **Incorrect "Resetting to Unlimited" section**: The post instructed users to set `max_file_size` to 0 to remove the limit. This command would be rejected by the Ceph monitor. Additionally, there is no way to fully disable the file size limit. Fixed the section to show how to reset to the default 1 TiB value and noted the minimum allowed value.

4. **Incorrect enforcement location**: The post stated the limit is "enforced at the MDS level." In reality, the MDS publishes the `max_file_size` value via the MDSMap, but enforcement happens at the client level (in `libcephfs`/`ceph-fuse`). The client checks the limit before writes and truncates, returning `-EFBIG` directly. Fixed in the Overview and Summary sections.

## Review Notes
- The byte conversion values (1 GiB, 10 GiB, 1 TiB) are all mathematically correct.
- The Python error handling example correctly catches `OSError` with `errno.EFBIG`, which is the appropriate way to handle this in Python 3. The `import os` is unused but harmless.
- The `ceph fs set` and `ceph fs get` command syntax is correct.
- The consideration that "existing files that already exceed the new limit will not be truncated" is confirmed by the source code — the write check in `Client.cc` allows writes within the current file size even if the file already exceeds `max_file_size`.
- The `kubectl -n rook-ceph exec` pattern for running Ceph commands via the Rook toolbox is correct.
