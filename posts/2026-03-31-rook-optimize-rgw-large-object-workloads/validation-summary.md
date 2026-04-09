# Validation Summary: How to Optimize Ceph RGW for Large Object Workloads

## Status
validated

## Post Type
Tutorial / Performance Tuning Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph RGW (RADOS Gateway) with Beast frontend
- Kubernetes (kubectl)
- Erasure coding for Ceph data pools
- AWS CLI (S3-compatible operations)
- MinIO warp (benchmarking tool)
- CephObjectStore CRD (Rook custom resource)

## Sources Consulted
- Ceph RGW configuration source code: https://github.com/ceph/ceph/blob/main/src/common/options/rgw.yaml.in
- Ceph Object Gateway Config Reference: https://docs.ceph.com/en/latest/radosgw/config-ref/
- Ceph Beast Frontend documentation: https://docs.ceph.com/en/latest/radosgw/frontends/
- Rook CephObjectStore CRD documentation: https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-crd/
- Rook example object store YAML: https://github.com/rook/rook/blob/master/deploy/examples/object.yaml
- AWS CLI s3 cp reference (for --expected-size flag)
- MinIO warp README and source code on GitHub

## Issues Found

### 1. Fabricated config option: `rgw_multipart_sync_on_manifest`
- **What was wrong:** The post included a command `ceph config set client.rgw rgw_multipart_sync_on_manifest true`. This configuration option does not exist in any version of Ceph. The only multipart-related config options are `rgw_multipart_min_part_size` and `rgw_multipart_part_upload_limit`.
- **What was changed:** Removed the fabricated command from the Multipart Upload Tuning section.
- **Why:** Setting a non-existent config option would silently fail or produce an error, misleading readers.

### 2. Invalid beast frontend parameter: `num_threads`
- **What was wrong:** The beast frontend config string included `num_threads=128`, but `num_threads` is not a valid beast frontend option. Beast uses Boost.Asio's async model and gets its thread pool size from the `rgw_thread_pool_size` Ceph config option (which was already correctly set in the same section).
- **What was changed:** Removed `num_threads=128` from the beast frontend string, leaving `"beast port=80 request_timeout_ms=600000"`.
- **Why:** `num_threads` would be silently ignored by the beast frontend. The valid beast options are: `port`, `ssl_port`, `endpoint`, `ssl_endpoint`, `ssl_certificate`, `ssl_private_key`, `ssl_reload`, `ssl_options`, `ssl_ciphers`, `tcp_nodelay`, `max_connection_backlog`, `request_timeout_ms`, `max_header_size`, `so_reuseport`.

### 3. Misleading section title and description: "Network Buffer Tuning"
- **What was wrong:** The section was titled "Network Buffer Tuning" and described as "Increase TCP send/receive buffers for large object transfers." Neither `rgw_op_thread_timeout` (an async operation timeout) nor `rgw_put_obj_max_window_size` (a RADOS write window size) are TCP buffer settings.
- **What was changed:** Renamed section to "Write Window and Timeout Tuning" with description "Increase the RGW write window size and operation timeout for large object transfers."
- **Why:** The original description was factually inaccurate about what these settings control.

### 4. Default values presented as increases: `rgw_op_thread_timeout` and `rgw_put_obj_max_window_size`
- **What was wrong:** `rgw_op_thread_timeout` was set to 600, which is the default value (10 minutes). `rgw_put_obj_max_window_size` was set to 67108864 (64 MiB), also the default value. The section text said to "increase" these values, but setting defaults doesn't change anything.
- **What was changed:** Changed `rgw_op_thread_timeout` to 1800 (30 minutes) and `rgw_put_obj_max_window_size` to 134217728 (128 MiB), which are actual increases appropriate for large object workloads.
- **Why:** The original values were no-ops since they matched the defaults, making the tuning advice ineffective.

## Review Notes
- The `rgw_op_thread_timeout` config option has a level of "dev" in the Ceph source, meaning it is intended for developer use. It works but is not typically documented in user-facing guides.
- The `rgw_thread_pool_size` default is 512. Setting it to 128 as the post suggests is a meaningful reduction, which makes sense for large object workloads where fewer concurrent long-lived connections are expected.
- The `rgw_multipart_min_part_size` set to 67108864 (64 MiB) is a significant increase from the default of 5 MiB, appropriate for large object workloads.
- The `rgw_max_chunk_size` set to 33554432 (32 MiB) is an increase from the default of 4 MiB, appropriate for large object throughput.
- The `rgw_max_put_size` set to 107374182400 (100 GiB) is a significant increase from the default of 5 GiB, appropriate for very large object workloads.
- All Rook CRD fields (`deviceClass`, `parameters.compression_mode`, `erasureCoded`, gateway `instances` and `resources`) are valid.
- The AWS CLI `--expected-size` flag and warp benchmarking commands are correct.
