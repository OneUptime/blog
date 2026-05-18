# Validation Summary: How to Set ZFS Properties (Compression, Deduplication, Quota) on Ubuntu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenZFS (on Linux / Ubuntu)
- `zfs` CLI (set, get, create, inherit)
- `zpool` CLI (list)
- `zdb` (dedup estimation)
- Compression algorithms: LZ4, ZSTD (and ZSTD-N), GZIP
- Dedup hashes: SHA-256, Blake3
- ZFS properties: compression, dedup, quota, refquota, reservation, refreservation, recordsize, atime, relatime, xattr, casesensitivity, copies, primarycache, volblocksize
- PostgreSQL / MySQL InnoDB page size considerations

## Sources Consulted
- OpenZFS documentation: https://openzfs.github.io/openzfs-docs/
- `zfsprops(7)` / `zpoolprops(7)` man pages: https://openzfs.github.io/openzfs-docs/man/master/7/zfsprops.7.html
- `zfs-set(8)`, `zfs-get(8)`, `zfs-create(8)` man pages
- OpenZFS 2.2 release notes (Blake3 dedup support): https://github.com/openzfs/zfs/releases/tag/zfs-2.2.0
- ZFS on Ubuntu documentation: https://ubuntu.com/tutorials/setup-zfs-storage-pool
- PostgreSQL documentation (default 8KB block size)
- MySQL InnoDB documentation (default 16KB page size)

## Issues Found
No technical issues found.

All commands, property names, value syntax, and the explanations of behavior match OpenZFS documentation:

- Compression values (`lz4`, `zstd`, `zstd-3`, `gzip-9`, `off`) are valid; ZSTD requires OpenZFS 2.0+ as noted.
- Dedup syntax forms (`dedup=on`, `dedup=sha256,verify`, `dedup=blake3`) all match `zfsprops(7)`. Blake3 was added in OpenZFS 2.2.
- Quota / refquota / reservation / refreservation semantics are accurately described (e.g., refquota excluding snapshots; refreservation reserving only for referenced data).
- Recordsize guidance (128K default, 8K for PostgreSQL, 16K for MySQL InnoDB, 1M for large sequential workloads) matches database documentation and standard ZFS tuning practice.
- `atime` / `relatime` interaction is correctly described — `relatime` requires `atime=on`.
- `xattr=sa` correctly described as storing extended attributes in the system attribute (SA) area.
- `casesensitivity` is correctly noted as immutable after creation.
- `copies` maximum of 3 is correct.
- `zfs create -V <size> -b <blocksize>` correctly uses `-b` to set `volblocksize` for zvols.
- `zdb -S <pool>` correctly simulates the dedup ratio without enabling dedup.
- `zpool list -o name,dedup <pool>` is a valid invocation.
- `zfs get all <dataset> | grep -v "default"` correctly filters out default-sourced properties.

## Review Notes
- The inheritance diagram (`Pool properties → Root dataset properties → Dataset properties → Child dataset properties`) blurs the distinction between `zpool` properties (managed via `zpool get/set`) and `zfs` dataset properties (managed via `zfs get/set`). The two namespaces are separate; only dataset properties inherit. The diagram is defensible if "Pool properties" is read as the root dataset (which shares the pool's name), and the surrounding prose is correct, so this was left as-is.
- The VM example uses `compression=off` and `volblocksize=8K`. Common modern guidance favors `lz4` (compression is nearly free) and a larger `volblocksize` like 16K for many VM workloads, but the post's choices are valid configuration trade-offs rather than technical errors.
- The post notes ZSTD requires "ZFS 2.0+" which is accurate (OpenZFS 2.0, released December 2020). Ubuntu 22.04+ ships with OpenZFS 2.1+, and 24.04 LTS ships with 2.2+, so all examples (including Blake3 dedup) work on currently supported Ubuntu LTS releases.
- Dedup RAM guidance (5–10 GB per TB) reflects the traditional rule-of-thumb for the legacy dedup table. OpenZFS 2.3 introduces "Fast Dedup" with much lower memory requirements; the post does not mention this, but it remains accurate for typical deployments today.
