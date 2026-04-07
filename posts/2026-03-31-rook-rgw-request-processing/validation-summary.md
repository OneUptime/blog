# Validation Summary: How to Configure RGW Request Processing Parameters

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Rook Ceph Operator
- Kubernetes (kubectl, ConfigMap, Deployments)
- Beast HTTP frontend for RGW

## Sources Consulted
- Ceph Reef configuration reference for RGW options (https://docs.ceph.com/en/reef/radosgw/config-ref/)
- Ceph source `rgw.yaml.in` for config option defaults and descriptions
- Ceph source `rgw_perf_counters.cc` for perf dump counter names
- Ceph Beast frontend documentation (https://docs.ceph.com/en/reef/radosgw/frontends/)
- Rook documentation for CephObjectStore CRD and config overrides

## Issues Found

1. **Incorrect beast frontend parameter name**: The post used `tcp_backlog=512` in the `rgw_frontends` beast configuration. The correct beast frontend parameter is `max_connection_backlog`. Fixed the parameter name and updated the comment.

2. **Incorrect description of `rgw_put_obj_max_window_size`**: The post described this as "Maximum chunk size for chunked transfers." This option actually controls the maximum RADOS write window size for PUT operations (the upper bound for dynamic write concurrency per object). Fixed the comment to accurately describe the parameter.

3. **Incorrect perf dump counter names**: The post listed `req_active`, `req_put`, and `req_get` as RGW perf dump counters. The actual counter names are `qactive` (active requests in queue, in the `rgw` perf collection), `put_obj_ops`, and `get_obj_ops` (in the `rgw_op` perf collection). Fixed the counter names, descriptions, and the grep pattern in the monitoring command.

## Review Notes
- The `rgw_put_obj_max_window_size` value of 67108864 (64MB) is actually the default value. The post sets it explicitly which is fine for documentation purposes but readers should know this is the default.
- Similarly, `rgw_max_put_size` at 5368709120 (5GB) is the default value.
- `rgw_thread_pool_size` is mentioned in the initial check commands and summary but applies to civetweb/fastcgi frontends, not beast. Since most modern Ceph deployments use beast, this could be misleading but is not technically incorrect as a config option to check.
- The ConfigMap approach with `rook-config-override` and the CephObjectStore scaling YAML are both correct for Rook deployments.
