# Validation Summary: How to Configure D3N Redis Backend for RGW

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (RGW / RADOS Gateway)
- D3N (Datacenter-Data-Delivery Network) datacache
- Rook (Kubernetes Ceph operator)
- Redis (incorrectly referenced in original post)

## Sources Consulted
- [D3N RGW Data Cache — Ceph Documentation (Reef)](https://docs.ceph.com/en/reef/radosgw/d3n_datacache/) — official D3N configuration reference
- [Ceph Object Gateway Config Reference](https://docs.ceph.com/en/latest/radosgw/config-ref/) — full RGW config option list including D3N and D4N parameters
- [ceph/src/common/options/rgw.yaml.in (GitHub)](https://github.com/ceph/ceph/blob/main/src/common/options/rgw.yaml.in) — source-of-truth for RGW config option definitions
- [ceph/src/rgw/driver/rados/rgw_d3n_datacache.h (GitHub)](https://github.com/ceph/ceph/blob/main/src/rgw/driver/rados/rgw_d3n_datacache.h) — D3N implementation header
- [RGW Data Caching and CDN — Ceph Documentation](https://docs.ceph.com/en/latest/radosgw/rgw-cache/) — covers both D3N and D4N caching architectures

## Issues Found

### 1. Fundamental Conceptual Error: D3N does not use Redis (Critical)
**What was wrong:** The entire post was premised on configuring Redis as a "shared coordination layer" for D3N. In reality, D3N is a local SSD/NVMe read-through cache where each RGW instance maintains its own independent cache. Redis-based distributed cache coordination is a feature of **D4N**, a separate and newer caching architecture in Ceph.

**What was changed:** Rewrote the Overview and Summary sections to correctly describe D3N as a local cache. Removed all Redis installation, Redis configuration, and Redis Sentinel sections since they are not applicable to D3N. Added a note pointing readers to D4N documentation for Redis-based distributed caching.

### 2. Non-existent Configuration Option: `rgw_d3n_l1_datacache_redis_url` (Critical)
**What was wrong:** The option `rgw_d3n_l1_datacache_redis_url` does not exist in Ceph. It appeared in both the `ceph config set` commands and the `ceph.conf` snippet.

**What was changed:** Removed all references to this fabricated option.

### 3. Missing `rgw_` Prefix on D3N Config Options (High)
**What was wrong:** The `ceph config set` commands used `d3n_l1_local_datacache_enabled`, `d3n_l1_datacache_persistent_path`, and `d3n_l1_datacache_size` — all missing the required `rgw_` prefix. The `ceph.conf` snippet had the same issue. The correct option names are `rgw_d3n_l1_local_datacache_enabled`, `rgw_d3n_l1_datacache_persistent_path`, and `rgw_d3n_l1_datacache_size`.

**What was changed:** Added the `rgw_` prefix to all D3N config option names in both `ceph config set` commands and the `ceph.conf` snippet.

### 4. Redis Sentinel Section Inapplicable (High)
**What was wrong:** The entire "Using Redis Sentinel for High Availability" section was irrelevant because D3N does not use Redis. Additionally, the Sentinel configuration pointed RGW to port 26379 using a plain `redis://` URL, which would not correctly use the Sentinel protocol.

**What was changed:** Removed the entire section.

### 5. Redis Verification Commands Inapplicable (Medium)
**What was wrong:** The "Verifying Redis Coordination" section contained Redis commands (KEYS, INFO, MONITOR) that are not relevant to D3N, which has no Redis integration.

**What was changed:** Replaced with D3N-appropriate verification commands (checking the cache directory and verifying config).

### 6. Prerequisites Incorrectly Listed Redis (Low)
**What was wrong:** Listed "Redis 6.x or later" and "D3N local datacache enabled on RGW instances" as prerequisites, but Redis is not needed for D3N.

**What was changed:** Replaced with accurate prerequisites (high-speed local storage).

## Review Notes
- The post title still references "Redis Backend" which no longer matches the corrected content. The title was not changed to minimize structural changes, but it should be updated in a future edit to something like "How to Configure D3N Local Datacache for RGW."
- The Description and Tags metadata still reference Redis. These should also be updated in a future pass.
- D3N's default cache size is 1 GiB (1073741824 bytes) per the official docs. The post uses 10 GiB (10737418240), which is a valid custom value and not an error.
- D3N cache contents are purged each time the RGW daemon restarts, per the official documentation. This is worth noting for operators but was not added to avoid scope creep.
- For users who actually need Redis-based distributed cache coordination across RGW instances, the correct technology is D4N, documented at the Ceph RGW Data Caching page.
