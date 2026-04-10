# Validation Summary: How to Understand Data Layout in RADOS for RGW

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- Ceph RADOS (Reliable Autonomic Distributed Object Store)
- Ceph RGW (RADOS Gateway) — S3/Swift-compatible object storage
- Rook (Kubernetes operator for Ceph)
- `rados` CLI tool
- `radosgw-admin` CLI tool

## Sources Consulted
- [RADOS Gateway Data Layout — Ceph Documentation](https://docs.ceph.com/en/latest/radosgw/layout/)
- [Ceph layout.rst on GitHub](https://github.com/ceph/ceph/blob/main/doc/radosgw/layout.rst)
- [rados man page — Ceph Documentation](https://docs.ceph.com/en/latest/man/8/rados/)
- [Pool Placement and Storage Classes — Ceph Documentation](https://docs.ceph.com/en/latest/radosgw/placement/)
- [rgw.yaml.in (config defaults)](https://github.com/ceph/ceph/blob/main/src/common/options/rgw.yaml.in)
- [Rook issue #4073 — non-ec pool](https://github.com/rook/rook/issues/4073)

## Issues Found

### Issue 1: Incorrect `rados get` namespace syntax (line 36)
- **What was wrong:** The command `rados -p default.rgw.meta get "users.uid:myuser" /tmp/userdata.json` uses colon syntax to specify the RADOS namespace, which is not valid. The colon notation appears in zone configuration JSON for pool-namespace mappings, but the `rados` CLI does not accept it. This command would attempt to get an object literally named `users.uid:myuser` from the default (empty) namespace, which would fail.
- **What was changed:** Replaced with `rados -p default.rgw.meta -N users.uid get myuser /tmp/userdata.json`, using the `-N` flag to specify the namespace as documented in the `rados` man page.
- **Why:** The `-N` / `--namespace` flag is the correct and only way to specify a RADOS namespace with the `rados` CLI tool.

### Issue 2: Misleading description of the non-ec pool (line 85)
- **What was wrong:** The post stated "Incomplete multipart uploads store parts in `default.rgw.buckets.non-ec`." This is misleading — the non-ec pool (`data_extra_pool`) stores multipart upload **metadata** (tracking objects for in-progress uploads), not the actual part data. Part data is written to the regular data pool (`default.rgw.buckets.data`).
- **What was changed:** Replaced with "Multipart upload metadata (tracking objects for in-progress uploads) is stored in `default.rgw.buckets.non-ec`."
- **Why:** The distinction matters for capacity planning and debugging. The non-ec pool exists to provide a replicated pool for omap-based metadata operations that erasure-coded pools cannot support.

## Review Notes
- The pool list in the table is accurate for a standard deployment but not exhaustive. Additional pools like `default.rgw.gc` and `default.rgw.data.root` may appear depending on Ceph version and zone configuration. This is a minor completeness gap and not an error.
- The bucket index naming convention `.dir.<bucket-marker>.<shard-number>` is correct for standard configurations. In newer Ceph versions with resharding support, a generation number may also appear (`.dir.<instance-id>.<generation>.<shard-id>`), with generation 0 omitted for backward compatibility.
- The default head object size of 4MB (`rgw_max_chunk_size`) is correct as of Ceph Luminous and later. Earlier releases used a 512KB default.
