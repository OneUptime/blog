# Validation Summary: How to Plan QoS Strategy for Multi-Tenant Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (RBD QoS, dmClock/mClock, RGW rate limiting, pool statistics)
- Rook (CephObjectStoreUser CRD with quotas)
- radosgw-admin CLI
- rbd CLI
- Prometheus / Grafana (monitoring)
- jq (JSON processing)

## Sources Consulted
- Ceph RBD Configuration Reference (QoS Settings): https://docs.ceph.com/en/latest/rbd/rbd-config-ref/#qos-settings
- Ceph rbd man page (config pool/image commands): https://docs.ceph.com/en/latest/man/8/rbd/
- Ceph mClock Configuration Reference: https://docs.ceph.com/en/latest/rados/configuration/mclock-config-ref/
- Ceph RGW Admin Guide (rate limiting): https://docs.ceph.com/en/latest/radosgw/admin/
- radosgw-admin man page: https://docs.ceph.com/en/latest/man/8/radosgw-admin/
- Rook CephObjectStoreUser CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Object-Storage/ceph-object-store-user-crd/

## Issues Found

1. **Step 2 - Wrong command for pool-level RBD QoS**: The post used `ceph osd pool set <pool> rbd_qos_iops_limit <value>`, but `ceph osd pool set` only manages RADOS pool properties (size, pg_num, etc.) and does not accept `rbd_qos_*` options. Changed to `rbd config pool set <pool> rbd_qos_iops_limit <value>`, which is the correct command for pool-level RBD QoS configuration.

2. **Step 2 - Conflation of dmClock and RBD QoS**: The heading said "Configure dmClock QoS per Pool" and the description referenced dmClock, but the commands were for RBD QoS — a completely separate mechanism. dmClock (mClock in Pacific+) is an OSD-level scheduler for prioritizing client I/O vs. recovery/scrub operations. RBD QoS is client-side throttling via librbd using token buckets. Changed heading to "Configure RBD QoS per Pool" and updated description accordingly.

3. **Step 2 - Wrong verify command**: `ceph osd pool get <pool> rbd_qos_iops_limit` does not work for RBD QoS options. Changed to `rbd config pool get <pool> rbd_qos_iops_limit`.

4. **Step 4 - Missing ratelimit enable step**: The `radosgw-admin ratelimit set` command only defines rate limit parameters but does not activate them. A separate `radosgw-admin ratelimit enable --ratelimit-scope user --uid <uid>` command is required to make rate limits active. Added this missing step.

5. **Step 6 - Incorrect jq field names**: The jq expression referenced `read_ops` and `write_ops` as top-level fields, but `ceph osd pool stats --format json` nests I/O data under `client_io_rate` with field names `read_op_per_sec` and `write_op_per_sec`. Fixed the jq expression to use the correct nested paths.

6. **Summary - Incorrect terminology**: Referenced "dmClock limits" when the post configures RBD QoS limits. Changed to "RBD QoS limits".

## Review Notes
- The introductory paragraph correctly mentions dmClock as one of several Ceph QoS mechanisms alongside RBD throttling and RGW rate limiting. This is accurate and was left unchanged.
- The CephObjectStoreUser CRD quotas configuration (Step 5) is correct and matches the Rook documentation.
- The `ceph tell osd.* perf dump` command in Step 6 is valid — the wildcard pattern works to broadcast to all OSDs. Users should be aware that in some shell environments, `osd.*` may need quoting to prevent glob expansion.
- RBD QoS settings use a value of 0 to mean "unlimited" (no throttling). The specific limit values used in the examples (5000 IOPS, 500MB/s, etc.) are reasonable illustrative values.
