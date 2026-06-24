# Validation Summary: How to Set Default Data Pool for CephFS

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph / CephFS (current release, docs.ceph.com/en/latest)
- Rook CephFilesystem CRD
- Linux extended attributes (setfattr / getfattr)

## Sources Consulted
- Ceph CephFS "Create a Ceph file system" — https://docs.ceph.com/en/latest/cephfs/createfs/ (verified `ceph fs new <name> <metadata> <data>` syntax; confirmed the first/specified data pool is the default data pool, stores inode backtrace, and cannot be changed once set)
- Ceph CephFS "File layouts" — https://docs.ceph.com/en/latest/cephfs/file-layouts/ (verified `ceph.dir.layout.pool` and `ceph.file.layout.pool` xattrs, setfattr set-by-name/ID and getfattr read syntax; confirmed file must be empty when changing a file layout)

## Issues Found
- None — code examples, commands, and technical claims were verified against the sources above and are accurate.

## Review Notes
- The central claim that the default data pool is fixed at creation (`ceph fs new`) and cannot be changed is explicitly confirmed by the Ceph createfs docs ("The specified data pool is the default data pool and cannot be changed once set").
- `ceph fs add_data_pool myfs myfs-hdd-data` is the correct command to attach additional data pools; verified as a real subcommand referenced from the createfs/file-layouts docs.
- The `ceph fs dump --format json | jq '.filesystems[] | {name: .mdsmap.fs_name, data_pools: .mdsmap.data_pools}'` query reflects the real fs-dump structure (filesystem entries carry an `mdsmap` object with `fs_name` and a `data_pools` array, ordered with the default pool first). Left as-is.
- The kernel mount example uses `-o ...,fs=myfs`; `fs=` is the modern mount option for selecting the named filesystem (older kernels used `mds_namespace=`). Both are accepted on current kernels, so left as-is.
- Rook CephFilesystem `dataPools` first-entry-is-default behavior mirrors the underlying `ceph fs new` ordering and is consistent with Rook's CRD; not a separate error.
