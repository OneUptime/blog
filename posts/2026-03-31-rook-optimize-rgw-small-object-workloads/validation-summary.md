# Validation Summary: How to Optimize Ceph RGW for Small Object Workloads

## Status
validated

## Post Type
Tutorial / Performance Tuning Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph RGW (RADOS Gateway)
- Ceph RADOS
- Kubernetes (kubectl)
- s3bench (S3 benchmarking tool)
- Beast HTTP frontend

## Sources Consulted
- Rook CephObjectStore CRD source code (`pkg/apis/ceph.rook.io/v1/types.go`, release-1.16) — verified `GatewaySpec`, `PoolSpec`, and `ReplicatedSpec` struct fields
- Ceph RGW config reference: https://docs.ceph.com/en/latest/radosgw/config-ref/
- Ceph HTTP Frontends documentation: https://docs.ceph.com/en/latest/radosgw/frontends/
- Ceph dynamic resharding documentation: https://docs.ceph.com/en/latest/radosgw/dynamicresharding/
- Ceph PR #27684 (removal of `rgw_num_rados_handles`): https://github.com/ceph/ceph/pull/27684
- Ceph PR #23242 (RGW objecter_inflight_ops default override): https://github.com/ceph/ceph/pull/23242
- s3bench source code (igneous-systems/s3bench on GitHub) — verified CLI flag names

## Issues Found

1. **Removed `spec.gateway.type: s3` from CephObjectStore YAML** — The Rook CephObjectStore CRD does not have a `type` field under `spec.gateway`. The CephObjectStore is inherently S3-compatible via RGW; there is no field to set the protocol type. This field would be silently ignored or cause a validation error.

2. **Removed `rgw_num_rados_handles` command** — This config option was removed from Ceph in Nautilus (v14.x) via PR #27684. It does not exist in any modern Ceph release (Quincy, Reef, Squid). Setting it would produce an "unknown config option" error.

3. **Removed `num_threads=512` from Beast frontend config** — The Beast frontend does not accept a `num_threads` parameter. Beast uses Boost.Asio's asynchronous I/O model, not a thread-per-connection model. The thread pool size is controlled separately by the `rgw_thread_pool_size` config option (already set earlier in the post). Changed from `"beast port=80 num_threads=512"` to `"beast port=80"`.

4. **Moved `deviceClass` to correct nesting level in pool YAML** — In the Rook CRD, `deviceClass` is a field on `PoolSpec`, not inside `ReplicatedSpec`. Moved from `spec.metadataPool.replicated.deviceClass` and `spec.dataPool.replicated.deviceClass` to `spec.metadataPool.deviceClass` and `spec.dataPool.deviceClass` respectively.

## Review Notes
- The `rgw_thread_pool_size` is set to 512, which is the default value in modern Ceph. This is valid as an explicit configuration, but readers should be aware it may not represent an increase from the default.
- The `rgw_max_concurrent_requests` is set to 1024, which is the default value. Similar to above, this is a valid explicit setting but may not represent actual tuning.
- The `objecter_inflight_ops` is set to 24576, which is already the RGW-specific default (overridden from the global default of 1024 since Ceph Luminous v12.2.9). Explicitly setting it is valid but redundant for RGW workloads.
- The s3bench flags are correct for the `igneous-systems/s3bench` tool (not to be confused with `wasabi-tech/s3-benchmark` which uses different flags).
- The `radosgw-admin bucket reshard` command syntax is correct.
- The `rgw_override_bucket_index_max_shards` config option is valid; the default is 0 (no sharding), so setting it to 64 is a meaningful tuning change.
