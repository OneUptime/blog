# Validation Summary: How to Set Up Ceph RBD Storage for PostgreSQL on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (RBD block storage provisioner for Kubernetes)
- Ceph RADOS Block Device (RBD)
- PostgreSQL 16
- Kubernetes (StatefulSet, StorageClass, PVC)
- Ceph CSI driver (rook-ceph.rbd.csi.ceph.com)

## Sources Consulted
- Rook-Ceph official documentation: Block Storage (RBD) StorageClass configuration — https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/
- Ceph documentation: `ceph osd pool create` and `rbd pool init` commands — https://docs.ceph.com/en/latest/rados/operations/pools/
- PostgreSQL 16 documentation: Server Configuration parameters (`shared_buffers`, `wal_level`, `random_page_cost`, `effective_cache_size`, `synchronous_commit`) — https://www.postgresql.org/docs/16/runtime-config.html
- PostgreSQL documentation: `ALTER SYSTEM` and `pg_reload_conf()` behavior for postmaster vs sighup parameters — https://www.postgresql.org/docs/16/sql-altersystem.html
- Official PostgreSQL Docker image: UID/GID 999 for postgres user, PGDATA subdirectory convention — https://hub.docker.com/_/postgres
- Kubernetes documentation: StatefulSet volumeClaimTemplates and PVC naming convention — https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/

## Issues Found
1. **`pg_reload_conf()` insufficient for `shared_buffers` and `wal_level`**: The PostgreSQL tuning section called `SELECT pg_reload_conf()` after setting all five parameters via `ALTER SYSTEM`. However, `shared_buffers` and `wal_level` are `postmaster` parameters that require a full PostgreSQL restart to take effect — a configuration reload only applies `sighup`-level parameters (`synchronous_commit`, `random_page_cost`, `effective_cache_size`). Added a note explaining this distinction and a `kubectl rollout restart` command to restart the StatefulSet pod.

## Review Notes
- The `wal_level = replica` and `synchronous_commit = on` settings are the PostgreSQL defaults since version 10. Setting them explicitly is not wrong but is redundant. Left as-is since making defaults explicit can be useful for documentation purposes.
- The `ceph osd pool create postgres-pool 64 64` command specifies both `pg_num` and `pgp_num`. Since Ceph Nautilus (14.x), `pgp_num` automatically tracks `pg_num`, so the second argument is optional. Left as-is since it's still valid and explicit.
- The `dd`-based I/O benchmark is a rough sequential write test. For a more thorough database-oriented benchmark, tools like `pgbench` or `fio` would be more appropriate, but the `dd` test is adequate as a quick sanity check.
- The post correctly uses `PGDATA` set to a subdirectory (`/var/lib/postgresql/data/pgdata`) of the mount point (`/var/lib/postgresql/data`), which avoids issues with `lost+found` directories on ext4-formatted RBD volumes.
