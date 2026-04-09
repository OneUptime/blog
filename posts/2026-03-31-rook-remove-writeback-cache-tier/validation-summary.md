# Validation Summary: How to Remove a Writeback Cache Tier in Ceph

## Status
validated

## Post Type
Tutorial / Operational Guide

## Technologies Covered
- Ceph (distributed storage system)
- Ceph cache tiering (writeback mode)
- rados CLI tool
- ceph CLI tool
- Rook (Ceph operator for Kubernetes, mentioned in tags)

## Sources Consulted
- Ceph official documentation on cache tiering: https://docs.ceph.com/en/latest/rados/operations/cache-tiering/
- Ceph source code for rados CLI (`src/tools/rados/rados.cc`) — verified valid subcommands for cache operations
- Ceph documentation on pool deletion: https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph GitHub PR #45409 — restoration of `proxy` cache mode for tier removal

## Issues Found

### Issue 1: Non-existent `cache-evict-all` command (Step 4)
- **What was wrong:** The post used `rados -p cache-pool cache-evict-all` to evict clean objects. This command does not exist in Ceph. The valid rados cache subcommands are: `cache-flush`, `cache-try-flush`, `cache-evict` (single object), `cache-flush-evict-all`, and `cache-try-flush-evict-all`. There is no standalone `cache-evict-all`.
- **What was changed:** Removed Step 4 entirely. The `cache-flush-evict-all` command from Step 2 already flushes dirty objects AND evicts all objects from the cache pool, making a separate evict step unnecessary. Renumbered subsequent steps (Step 5 became Step 4, Step 6 became Step 5). Also removed the `cache-evict-all` call from the complete script.
- **Why:** Running a non-existent command would cause the script to fail with `set -e` enabled, or produce an error for users following the manual steps.

### Issue 2: `readproxy` mode instead of `proxy` mode (Step 1)
- **What was wrong:** The post recommended switching to `readproxy` mode before removing the cache tier. While `readproxy` is a valid cache mode, the official Ceph documentation specifically recommends `proxy` mode for cache tier removal.
- **What was changed:** Changed all references from `readproxy` to `proxy` — in Step 1, the description, the introduction paragraph, the complete script, and the summary.
- **Why:** `proxy` mode routes all reads and writes directly to the backing pool, which is the recommended behavior when decommissioning a cache tier. `readproxy` still serves cached objects for reads, which is not ideal during removal.

### Issue 3: Incomplete description of `cache-flush-evict-all` (Step 2)
- **What was wrong:** The post described `cache-flush-evict-all` as only flushing dirty objects to the backing pool. In reality, this command both flushes dirty objects AND evicts all objects (including clean ones) from the cache pool.
- **What was changed:** Updated the description to: "This command flushes all dirty objects to the backing pool and then evicts all objects from the cache pool."
- **Why:** The incomplete description led to the incorrect addition of a separate evict step with a non-existent command.

## Review Notes
- Ceph cache tiering is officially deprecated as of Ceph Reef (v18.x). The documentation states it is "not recommended for any new workloads." This post is still valuable for operators who need to remove existing cache tiers, but readers should be aware of the deprecation.
- The Python snippet for parsing `ceph df detail --format json` to extract the dirty count is functional but fragile — the JSON schema may vary across Ceph versions. The `pool['stats']['dirty']` path should work for current versions.
- The `rados -p cache-pool ls | wc -l` command in Step 3 counts all objects (not just dirty ones). After `cache-flush-evict-all` completes, this count should be 0 since the command evicts all objects. Updated the comment from "Check for dirty objects" to "Check for remaining objects" to reflect this.
