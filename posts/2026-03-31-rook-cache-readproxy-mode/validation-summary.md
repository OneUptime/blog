# Validation Summary: How to Set Up Readproxy Cache Mode in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (distributed storage system)
- Ceph cache tiering (readproxy, proxy, writeback modes)
- Ceph CLI (`ceph osd`, `rados`)
- Rook (Ceph on Kubernetes, referenced in tags)

## Sources Consulted
- Ceph official documentation on cache tiering: https://docs.ceph.com/en/latest/rados/operations/cache-tiering/
- Ceph source code analysis of `PrimaryLogPG::maybe_handle_cache_detail()` for readproxy write behavior
- Ceph Reef release notes regarding cache tiering deprecation
- Ceph CLI reference for `ceph osd tier` commands

## Issues Found

1. **Incorrect write behavior description (critical):** The post claimed that in readproxy mode, "writes go directly to the backing pool" and "write operations go directly to the backing pool." This is incorrect. In readproxy mode, only reads are proxied — write operations may still promote objects to the cache tier. The `proxy` mode (not readproxy) is what forwards both reads and writes to the backing pool. Fixed the description, diagram, and bullet points to accurately describe write behavior.

2. **Incorrect claim that no objects are stored in cache (critical):** The post stated "No objects are stored in or promoted to the cache pool." This is wrong — objects already present in the cache tier continue to be served from it, and writes can still promote objects. Fixed to reflect that existing cached objects are still served.

3. **Wrong mode recommended for writeback tier removal (significant):** The post recommended using `readproxy` as the transition mode for removing a writeback cache tier. The official Ceph documentation recommends `proxy` mode for this purpose, since it forwards both reads and writes to the backing pool, ensuring no new objects are promoted to the cache. Fixed the transition steps to recommend `proxy` mode and added `readproxy` as an alternative with caveats.

4. **Missing cache tier removal steps:** The original transition steps were incomplete. Added the `cache-flush-evict-all`, `remove-overlay`, and `remove tier` commands to match the official Ceph procedure.

5. **Missing deprecation warning (critical):** Cache tiering has been deprecated since the Ceph Reef release. The upstream community strongly advises against deploying new cache tiers. Added a prominent deprecation notice at the top of the post and in the summary.

6. **Inaccurate diagram labels:** The diagram showed "No promotion" and "No local caching" which are misleading — existing cached objects are still served, and writes may promote. Fixed to "No read promotion", "Proxies read misses to backing pool", and "Existing cached objects still served."

## Review Notes
- The CLI commands for pool creation, tier setup, and overlay configuration are syntactically correct and match the Ceph CLI reference.
- The `ceph osd dump | grep` verification approach works but `ceph osd pool get cache-pool cache_mode` would be a more reliable alternative.
- Modern Ceph versions (Nautilus+) have PG autoscaling enabled by default, making the explicit PG count arguments (128 128, 32 32) in pool creation commands less critical but still valid.
- The monitoring commands (`rados -p cache-pool ls`, `ceph osd pool stats`, `ceph df`) are all valid for the described purposes.
- Given the deprecation of cache tiering, readers should consider application-layer caching (e.g., Redis, Memcached) or other storage optimization strategies for new deployments.
