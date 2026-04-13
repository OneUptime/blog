# Validation Summary: How to Configure WiredTiger Cache Size in MongoDB

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MongoDB (WiredTiger storage engine)
- WiredTiger cache configuration (mongod.conf, CLI flags, runtime parameters)
- MongoDB serverStatus diagnostics
- Container deployment considerations

## Sources Consulted
- [MongoDB WiredTiger Storage Engine docs](https://www.mongodb.com/docs/manual/core/wiredtiger/)
- [MongoDB Configuration File Options](https://www.mongodb.com/docs/manual/reference/configuration-options/)
- [MongoDB Server Parameters (setParameter)](https://www.mongodb.com/docs/manual/reference/parameters/)
- [MongoDB FAQ: Storage](https://www.mongodb.com/docs/manual/faq/storage/)
- [MongoDB Community Forums — WiredTiger cache status](https://www.mongodb.com/community/forums/t/wiredtiger-cache-status-working-set/181314)
- [MongoDB Community Forums — Buffer cache hit ratio](https://www.mongodb.com/community/forums/t/how-to-get-buffer-cache-hit-ratio-recommended-ratio/250243)
- [SERVER-17293 (MongoDB Jira) — wiredTigerEngineRuntimeConfig available since 3.x](https://jira.mongodb.org/browse/SERVER-17293)
- [SERVER-19483 (MongoDB Jira) — getParameter support for wiredTigerEngineRuntimeConfig](https://jira.mongodb.org/browse/SERVER-19483)

## Issues Found

### 1. Incorrect version for dynamic cache adjustment (High severity)
- **What was wrong:** The post claimed dynamic cache size adjustment via `wiredTigerEngineRuntimeConfig` was introduced in MongoDB 4.4. This parameter has actually been available since MongoDB 3.2.
- **What was changed:** Updated the section header from "MongoDB 4.4+" to "MongoDB 3.2+" and corrected the prose and summary to match.

### 2. Incorrect cache hit ratio formula (High severity)
- **What was wrong:** The formula used `stats["pages evicted by application threads"]` in place of total cache requests. Evictions represent pages removed to make room in the cache, not total lookups. The formula `1 - reads / (reads + evictions)` does not produce a meaningful cache hit ratio.
- **What was changed:** Replaced with the correct formula using `stats["pages requested from the cache"]` (total page lookups) and `stats["pages read into cache"]` (cache misses / disk reads): `hitRatio = 1 - (readFromDisk / requested)`.

### 3. Inconsistent percentage recommendation (Medium severity)
- **What was wrong:** The "Cache Size Guidelines" section recommended 50-60% of RAM for dedicated servers, but the Summary section said 60-70%. These contradicted each other.
- **What was changed:** Harmonized the Summary to say 50-60%, matching the guidelines section and aligning with common community guidance that leaves sufficient RAM for the OS filesystem cache.

## Review Notes
- The default cache formula, mongod.conf YAML structure, CLI flags, serverStatus field names, and SSD configuration snippet are all technically correct.
- The container advice about explicitly setting cache size is good — modern MongoDB versions (4.4+) have improved cgroup-aware memory detection, but setting it explicitly remains best practice.
- The `wiredTigerEngineRuntimeConfig` parameter name is current; the older alias `wiredTigerEngineRuntimeConfigSetting` is deprecated.
