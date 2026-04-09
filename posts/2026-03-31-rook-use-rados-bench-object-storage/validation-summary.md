# Validation Summary: How to Use rados bench for Object Storage Benchmarking

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RADOS (Reliable Autonomic Distributed Object Store)
- `rados bench` CLI tool
- Rook (Ceph operator for Kubernetes)
- Kubernetes Pod specs
- Bash scripting

## Sources Consulted
- Ceph official man page for rados: https://docs.ceph.com/en/latest/man/8/rados/
- Ceph source code (rados.cc): https://github.com/ceph/ceph/blob/main/src/tools/rados/rados.cc
- Red Hat Ceph Storage 5 Performance Benchmarking guide: https://docs.redhat.com/en/documentation/red_hat_ceph_storage/5/html/administration_guide/ceph-performance-benchmarking
- Rook Ceph Configuration documentation: https://rook.github.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-configuration/
- Ceph tracker issue on rados cleanup documentation: https://tracker.ceph.com/issues/20894

## Issues Found

### 1. Invalid `--cleanup` flag on `rados bench` (benchmark script, line 71)
**What was wrong:** The cleanup command `rados bench -p $POOL 5 write --cleanup --run-name "run_${OBJ_SIZE}_${THREADS}"` uses `--cleanup` which is not a valid flag for `rados bench`. The `rados bench` command only supports `--no-cleanup` (to skip default post-write cleanup). Manual cleanup of benchmark objects is done via the separate `rados cleanup` subcommand.
**What was changed:** Replaced with `rados -p $POOL cleanup --run-name "run_${OBJ_SIZE}_${THREADS}"`.

### 2. Invalid `--cleanup` flag on `rados bench` (Kubernetes YAML, line 130)
**What was wrong:** The Kubernetes pod command used `rados bench -p benchmark-pool 60 write --cleanup -t 16` as the final cleanup step, which is invalid for the same reason as above.
**What was changed:** Replaced with `rados -p benchmark-pool cleanup`.

### 3. `-b` option described as "Object size" instead of "Block size" (options table, line 36)
**What was wrong:** The `-b` flag was described as "Object size in bytes". In `rados bench`, `-b` sets the block size (the size of each write operation). The separate `-O` flag sets the object size. When `-O` is not specified, the object size defaults to the block size, but they are distinct parameters.
**What was changed:** Updated description to "Block size (write size per operation)".

### 4. Overly broad `grep` pattern in bandwidth comparison script (lines 160-162)
**What was wrong:** `grep Bandwidth` matches both "Bandwidth (MB/sec)" and "Stddev Bandwidth" lines in the rados bench output, causing the bandwidth extraction to return two values instead of one.
**What was changed:** Changed to `grep "^Bandwidth"` to anchor the match to the beginning of the line, matching only the average bandwidth line.

## Review Notes
- The `-O` option description ("Object size (overrides `-b` for object size)") is slightly misleading — `-O` sets the object size independently of `-b` (block size), rather than "overriding" it. They are separate parameters that happen to default to the same value. This is a minor wording issue that doesn't affect usability.
- The Kubernetes YAML mounts the `rook-ceph-config` ConfigMap to get ceph.conf. This is an auto-generated ConfigMap from the Rook operator and is a reasonable practical approach commonly used in the community, though not officially documented by Rook for custom pods. The Rook toolbox pod uses a similar mechanism.
- The Ceph container image `quay.io/ceph/ceph:v18.2.0` is the Reef release and is a valid, current image tag.
