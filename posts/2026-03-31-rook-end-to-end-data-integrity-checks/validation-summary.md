# Validation Summary: How to Implement End-to-End Data Integrity Checks with Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (BlueStore, RADOS, OSD scrubbing)
- Rook (Ceph orchestration on Kubernetes)
- Python (hashlib, boto3)
- Ceph Object Gateway (RGW) with S3 API
- Prometheus (alerting rules, PromQL)
- smartctl (SMART disk monitoring)

## Sources Consulted
- Ceph official documentation — BlueStore Configuration Reference (confirms `bluestore_csum_type` default is `crc32c`, valid values include `crc32c`, `crc32c_16`, `crc32c_8`, `xxhash32`, `xxhash64`, `none`)
- Ceph official documentation — `ceph config get/set` CLI syntax
- Ceph official documentation — `rados put/get` CLI syntax
- Ceph official documentation — `ceph osd pool set` for per-pool scrub overrides (`deep_scrub_interval`, `scrub_min_interval`)
- Ceph mgr/prometheus module source code — `mgr_module.py` PG_STATES list and `module.py` metric generation (https://github.com/ceph/ceph/blob/main/src/pybind/mgr/prometheus/module.py)
- Prometheus PromQL lexer source — confirms keywords are case-insensitive (https://github.com/prometheus/prometheus/blob/main/promql/parser/lex.go)
- boto3 S3 client documentation — `put_object`, `get_object`, `Metadata` parameter
- Python hashlib documentation — `sha256`, `hexdigest()`

## Issues Found
1. **Non-existent Prometheus metric `ceph_osd_stat_num_objects_inconsistent`**: This metric does not exist in the standard Ceph mgr/prometheus module. The module's `get_num_objects()` method only exposes `num_objects_degraded`, `num_objects_misplaced`, and `num_objects_unfound`. Replaced with `ceph_pg_degraded`, which is a confirmed PG state metric from the PG_STATES list. Degraded PGs indicate reduced redundancy, which is a legitimate data integrity concern.
2. **PromQL `OR` uppercase**: While technically valid (the PromQL lexer lowercases keywords), the universal convention in Prometheus documentation and community usage is lowercase `or`. Changed to lowercase for consistency with PromQL conventions.

## Review Notes
- The SMART monitoring script (`/dev/sd*`) matches partition devices (e.g., `/dev/sda1`) in addition to whole disks. This causes redundant checks but does not affect correctness. A more precise glob like `/dev/sd[a-z]` would avoid this.
- Changing `bluestore_csum_type` via `ceph config set` only affects new writes, not data already stored on existing OSDs. The post does not claim otherwise, but readers performing this on existing clusters should be aware.
- The Python code stores checksums in S3 user-defined metadata rather than using S3's native `ChecksumSHA256` parameter (available in newer boto3/S3 API versions). The approach shown is valid and works well with Ceph RGW, which may not support all native S3 checksum features.
- The post title mentions "Ceph" but is tagged with "Rook" — the content is pure Ceph and does not reference Rook-specific configuration. This is not an error but readers expecting Rook-specific guidance (CephCluster CRDs, etc.) may be surprised.
