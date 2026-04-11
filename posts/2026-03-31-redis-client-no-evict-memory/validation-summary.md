# Validation Summary: How to Use CLIENT NO-EVICT in Redis to Protect Client Memory

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Redis (7.0+ for CLIENT NO-EVICT, 7.2+ for CLIENT NO-TOUCH)
- Redis client memory management
- Redis client eviction mechanism

## Sources Consulted
- Official Redis CLIENT NO-EVICT documentation: https://redis.io/docs/latest/commands/client-no-evict/
- Official Redis CLIENT NO-TOUCH documentation: https://redis.io/docs/latest/commands/client-no-touch/
- Official Redis CLIENT LIST documentation (flags reference): https://redis.io/docs/latest/commands/client-list/
- Official Redis client handling reference (maxmemory-clients): https://redis.io/docs/latest/develop/reference/clients/

## Issues Found

1. **Incorrect config option name**: The post referenced a nonexistent `client-eviction` configuration option. Fixed to `maxmemory-clients`, which is the actual Redis directive that controls client eviction.

2. **Wrong config snippet**: The "Configuring Client Eviction" section showed `maxmemory 1gb` and `maxmemory-policy allkeys-lru` as the configuration for client eviction. These control key eviction, not client eviction. Replaced with `maxmemory-clients 1gb` and added notes about accepted value formats (absolute size or percentage) and the default (`0`, disabled).

3. **Incorrect relationship between key eviction and client eviction**: The post claimed "Client eviction is a separate protection mechanism that activates when key eviction alone is insufficient to free memory." This is incorrect -- client eviction is an independent mechanism with its own threshold (`maxmemory-clients`), not a fallback for key eviction. Fixed to clarify they operate in parallel with separate thresholds.

4. **Incorrect trigger description in Overview and Description**: The post said client eviction happens when "Redis reaches its maxmemory limit." Client eviction is triggered when aggregate client memory exceeds `maxmemory-clients`, not when the server hits `maxmemory`. Fixed the description and overview accordingly, and updated the Mermaid diagram.

5. **Inconsistent CLIENT INFO output**: The sample output showed `flags=N` immediately after running `CLIENT NO-EVICT ON`. The `N` flag means "normal client" but the `e` flag (excluded from client eviction) should also be present. Fixed to `flags=Ne`.

6. **Incomplete CLIENT NO-TOUCH description**: The post said CLIENT NO-TOUCH "protects LRU timestamps" and prevents "LRU-based eviction decisions." CLIENT NO-TOUCH prevents updates to both LRU and LFU stats, not just LRU. Fixed to mention both LRU/LFU throughout.

## Review Notes
- CLIENT NO-EVICT is available since Redis 7.0.0 and CLIENT NO-TOUCH since Redis 7.2.0. The post does not mention version requirements, which could be helpful for readers on older Redis versions.
- The post correctly notes that Sentinel and Cluster management connections benefit from eviction protection, though in practice Redis internally protects these connections already.
