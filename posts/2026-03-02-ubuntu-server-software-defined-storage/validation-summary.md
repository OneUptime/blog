# Validation Summary: How to Install Ubuntu Server on a Software-Defined Storage Appliance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu Server 24.04 LTS
- Ceph (Reef/Squid era)
- MicroCeph (Canonical's snap-based Ceph distribution)
- Cephadm (containerized Ceph orchestration)
- Ceph RBD (block storage)
- CephFS (POSIX-compliant filesystem)
- Ceph erasure-coded pools
- Ceph Dashboard
- Ceph Prometheus exporter
- SSH key-based authentication (ed25519)

## Sources Consulted
- Official Ceph documentation: https://docs.ceph.com/en/latest/
- Cephadm install/bootstrap docs: https://docs.ceph.com/en/latest/cephadm/install/
- Ceph Orchestrator CLI: https://docs.ceph.com/en/latest/mgr/orchestrator/
- Ceph pool operations: https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph erasure code docs: https://docs.ceph.com/en/latest/rados/operations/erasure-code/
- CephFS file system docs: https://docs.ceph.com/en/latest/cephfs/
- Ceph dashboard user management: https://docs.ceph.com/en/latest/mgr/dashboard/
- MicroCeph documentation: https://canonical-microceph.readthedocs-hosted.com/
- RBD command reference: https://docs.ceph.com/en/latest/man/8/rbd/

## Issues Found

1. **Incorrect claim about erasure coding CPU usage** — The comment in the storage-pools section described an erasure-coded pool as "more efficient, less CPU intensive". This is inverted: erasure coding is more space-efficient than replication but is *more* CPU-intensive (encode/decode work on every write/read). Updated the inline comment to "more space efficient, but more CPU intensive".

2. **Broken CephFS creation sequence** — The CephFS section ran `ceph fs volume create myfs` (a high-level command that creates the filesystem and the required `cephfs.myfs.data`/`cephfs.myfs.meta` pools automatically) and then immediately tried to create separate `cephfs-data`/`cephfs-metadata` pools followed by `ceph fs new myfs cephfs-metadata cephfs-data`. The `ceph fs new` would fail because the filesystem `myfs` already exists, and the manually created pools would be orphaned. Removed the redundant manual pool creation and `ceph fs new` step so the flow uses `ceph fs volume create` cleanly. Also corrected the MDS service name on `ceph orch apply mds` to match the filesystem name (`myfs` instead of `cephfs`), which is what the orchestrator expects.

3. **Invalid `ceph dashboard ac-user-create` syntax** — The original used `ceph dashboard ac-user-create admin --enabled -r administrator`, but current Ceph (Reef/Squid, what ships on Ubuntu 24.04 LTS) does not accept `--enabled` or `-r` flags. The password must be supplied via `-i <password_file>` and the rolename is a positional argument. Replaced with the documented form using a temporary password file (which is also cleaned up afterward).

## Review Notes

- The post targets Ubuntu Server 24.04 LTS, which is a reasonable target for current Ceph releases (Reef 18.x is available via cephadm container images and MicroCeph snap channels).
- `rbd create --size 100G` works because the `--size` option in recent `rbd` versions accepts M/G/T suffixes; older `rbd` interpreted the bare integer as MB.
- The kernel CephFS mount syntax `mount -t ceph ceph-node-01:/ ... -o name=admin,secret=...` uses the legacy mount helper format. The "new" mount helper format (`user@fsid.fsname=/`) is preferred in recent kernels but the legacy form is still supported, so this is acceptable.
- `ceph osd pool create <name>` without an explicit pg_num is valid because the PG autoscaler is on by default in current Ceph; mentioning this could help readers who run older clusters.
- For production, MicroCeph cluster bootstrap should ideally specify `--microceph-ip` / public address; the simple `cluster bootstrap` call relies on the host's default interface, which is fine for a lab/demo but worth noting.
- Using `--initial-dashboard-password changeme` is fine as illustrative text; readers should obviously substitute a real password.
