# Validation Summary: How to Configure rgw_thread_pool_size for RGW Performance

## Status
validated

## Post Type
Tutorial / Performance Tuning Guide

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Rook (Ceph operator for Kubernetes)
- Ceph beast HTTP frontend
- Kubernetes ConfigMaps and CephObjectStore CRD

## Sources Consulted
- Ceph Object Gateway Config Reference (Reef): https://docs.ceph.com/en/reef/radosgw/config-ref/
- Ceph HTTP Frontends documentation: https://docs.ceph.com/en/reef/radosgw/frontends/
- Ceph source (rgw.yaml.in options definitions): https://github.com/ceph/ceph/blob/main/src/common/options/rgw.yaml.in
- GitHub PR #23383 (default changed to 512 in Mimic): https://github.com/ceph/ceph/pull/23383
- Rook CephObjectStore CRD documentation: https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-crd/

## Issues Found

1. **Inaccurate description of `rgw_thread_pool_size`**: The opening line described it as controlling "worker threads in the RGW HTTP server" and a later section called it the "backend RADOS processing pool." Both descriptions were imprecise. For the beast frontend (the default), `rgw_thread_pool_size` controls the async I/O worker thread pool (io_context threads) that handles both HTTP and RADOS operations. Fixed the opening and summary to use accurate terminology.

2. **Invalid `num_threads` option in beast frontend string**: The post used `num_threads=512` in the `rgw_frontends` beast configuration string in three places (the command example, the ConfigMap, and the summary). `num_threads` is a CivetWeb-only frontend option and is not valid for the beast frontend. For beast, the thread pool size is controlled solely by `rgw_thread_pool_size`. Removed `num_threads` from all beast frontend strings and added a clarifying note.

3. **Incorrect advice to "match beast frontend `num_threads`"**: The summary advised matching `rgw_thread_pool_size` with beast's `num_threads` parameter, which doesn't exist for beast. Removed this advice.

## Review Notes
- The default value of 512 is correct for Ceph Mimic (v13.2.x) and all later releases. Earlier versions (Luminous and before) had a default of 100.
- Port 7480 is used explicitly in the examples, which is fine. Note that beast's own default port is 80, but 7480 is commonly used in Rook deployments and explicitly setting it is correct practice.
- The monitoring commands using `ceph daemon ... perf dump` and `/proc/1/task` are valid approaches, though the glob pattern in the admin socket path relies on shell expansion inside the container.
