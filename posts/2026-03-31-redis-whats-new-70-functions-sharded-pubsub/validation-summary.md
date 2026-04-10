# Validation Summary: What Is New in Redis 7.0 (Functions, Sharded Pub/Sub)

## Status
validated

## Post Type
Reference / Feature overview

## Technologies Covered
- Redis 7.0
- Redis Functions (Lua scripting)
- Sharded Pub/Sub (SSUBSCRIBE, SPUBLISH, SUNSUBSCRIBE)
- Multi-Part AOF persistence
- Listpack encoding
- LMPOP / ZMPOP / BLMPOP / BZMPOP commands

## Sources Consulted
- Redis FUNCTION LOAD documentation: https://redis.io/docs/latest/commands/function-load/
- Redis Functions introduction: https://redis.io/docs/latest/develop/programmability/functions-intro/
- Redis FCALL documentation: https://redis.io/docs/latest/commands/fcall/
- Redis FUNCTION LIST documentation: https://redis.io/docs/latest/commands/function-list/
- Redis LMPOP documentation: https://redis.io/docs/latest/commands/lmpop/
- Redis ZMPOP documentation: https://redis.io/docs/latest/commands/zmpop/
- Redis BLMPOP documentation: https://redis.io/docs/latest/commands/blmpop/
- Redis BZMPOP documentation: https://redis.io/docs/latest/commands/bzmpop/
- Redis BGREWRITEAOF documentation: https://redis.io/docs/latest/commands/bgrewriteaof/
- Redis persistence documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
- Redis 7.0 Multi-Part AOF PR: https://github.com/redis/redis/pull/9788
- Redis 7.0.0 release notes: https://raw.githubusercontent.com/redis/redis/7.0.0/00-RELEASENOTES

## Issues Found

### 1. LMPOP/ZMPOP incorrectly attributed to Redis 6.2
- **What was wrong:** The post stated that BLMPOP and BZMPOP are "the blocking versions of the 6.2 pop commands," implying LMPOP and ZMPOP were introduced in Redis 6.2.
- **What was changed:** Corrected to state that LMPOP, ZMPOP, BLMPOP, and BZMPOP were all introduced together in Redis 7.0.
- **Why:** The official Redis documentation confirms all four commands have "Available since: 7.0.0". None of them existed in Redis 6.2.

### 2. Multi-Part AOF: "No more blocking AOF rewrites (BGREWRITEAOF)" was misleading
- **What was wrong:** The bullet point implied BGREWRITEAOF no longer blocks or is no longer needed. In reality, BGREWRITEAOF still exists and is used. The improvement is that the old mechanism's rewrite buffer flush phase (which could briefly freeze the main process) is eliminated.
- **What was changed:** Replaced with "Eliminates the rewrite buffer flush that could briefly block the main process."
- **Why:** BGREWRITEAOF was always a background operation. The specific bottleneck that multi-part AOF eliminates is the buffer-flush phase where the parent process had to write accumulated rewrite buffer data to the new AOF file after the child finished.

### 3. Multi-Part AOF: "The base file is written atomically" was inaccurate
- **What was wrong:** The base file is written by a child process over time and is not atomic. It is the manifest file update (a rename operation) that is atomic.
- **What was changed:** Replaced with "The manifest file is updated atomically via a rename operation."
- **Why:** The official Redis documentation and the multi-part AOF PR confirm that atomicity applies to the manifest file swap, not the base file write.

### 4. Multi-Part AOF: "Faster startup" was not a documented benefit
- **What was wrong:** "Faster startup since Redis loads the base + short incremental files" is not a documented or claimed benefit of multi-part AOF. Loading base + incremental files is not inherently faster than a single rewritten AOF.
- **What was changed:** Replaced with "Reduced memory overhead since there is no in-memory AOF rewrite buffer."
- **Why:** The primary benefits documented in the official PR and Redis docs are: elimination of the rewrite buffer and its memory/IO overhead, elimination of the main-process blocking during buffer flush, and better file manageability.

## Review Notes
- The Redis Functions section uses the correct Redis 7.0 GA syntax (with `#!lua name=` shebang header). Early RC versions used a different syntax with separate engine/name arguments, but the blog correctly shows the GA form.
- The simplified AOF file names in the blog (`base.rdb`, `incr-*.aof`) are simplified from the actual names (`appendonly.aof.1.base.rdb`, `appendonly.aof.1.incr.aof`). This is acceptable for a high-level overview but readers implementing this should consult the official docs for exact file naming.
- The Sharded Pub/Sub section is accurate. SSUBSCRIBE, SPUBLISH, and SUNSUBSCRIBE are the correct commands, and the description of hash-slot-based channel routing is correct.
- The listpack migration description is accurate for Redis 7.0.
