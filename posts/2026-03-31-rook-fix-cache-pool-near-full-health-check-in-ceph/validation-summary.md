# Validation Summary: How to Fix CACHE_POOL_NEAR_FULL Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (distributed storage system)
- Ceph cache tiering
- Rook (Ceph operator for Kubernetes)
- CRUSH rules
- rados CLI utility

## Sources Consulted
- Ceph Cache Tiering documentation: https://docs.ceph.com/en/latest/rados/operations/cache-tiering/
- Ceph Health Checks documentation: https://docs.ceph.com/en/latest/rados/operations/health-checks/
- Ceph Pools documentation: https://docs.ceph.com/en/latest/rados/operations/pools/
- rados man page: https://docs.ceph.com/en/latest/man/8/rados/
- Ceph CRUSH Maps documentation: https://docs.ceph.com/en/latest/rados/operations/crush-map/

## Issues Found

### Issue 1: Incorrect command to inspect cache mode
- **What was wrong:** `ceph osd tier cache-mode hot-storage` was used to inspect the current cache mode, but this command requires a mode argument to SET the cache mode. Without the mode argument it produces an error.
- **What was changed:** Replaced with `ceph osd pool get hot-storage cache_mode`, which correctly retrieves the current cache mode.
- **Why:** The `ceph osd tier cache-mode` command signature is `ceph osd tier cache-mode <pool> <mode>` (a setter). The getter is `ceph osd pool get <pool> cache_mode`.

### Issue 2: Misleading "Increase Cache Pool Size" section with wrong commands
- **What was wrong:** The section suggested `ceph osd pool set hot-storage size 3` to "expand the cache pool." The `size` parameter sets the replication factor (number of copies), not the pool's capacity. Increasing replicas actually reduces usable capacity. The section also used `ceph osd pool set-quota hot-storage max_bytes`, which sets a hard pool quota unrelated to the cache tiering agent's flush/evict thresholds.
- **What was changed:** Replaced the entire Option 2 section. Changed `size 3` to `ceph osd pool set hot-storage target_max_bytes 536870912000` and the quota command to `ceph osd pool set hot-storage target_max_objects 1000000`. Updated the heading to "Increase Cache Pool Capacity" and the description to reference adding OSDs and increasing cache target size.
- **Why:** The CACHE_POOL_NEAR_FULL health check is triggered based on `target_max_bytes` and `target_max_objects` pool properties, as documented in the Ceph health checks reference. These are the correct parameters to adjust when the cache tier is filling up.

## Review Notes
- Ceph cache tiering is deprecated/discouraged in newer Ceph releases (Nautilus+). The post correctly recommends considering alternatives (Option 5 with CRUSH rules), which is good advice. A future update could add an explicit deprecation note at the top.
- The `cache-flush-evict-all` command in Option 4 can be very disruptive to a running cluster. A note about potential performance impact during the flush would be helpful but is not a technical error.
- All other commands, parameters, and explanations are technically accurate.
